// Protocol-v2 device client for the web game screen.
// A browser port of backend/recovery_emulator.py (and of the ESP32 firmware's journal):
// every journal event is saved before it is sent and resent unchanged until the server
// confirms it, so a lost response or a page reload never produces a second, different
// result. The server replays and times every round exactly as it did for the ESP32.

import { knownRuleset } from './engine'

export const STORAGE_KEY = 'smb.gameScreen.v1'
export const FIRMWARE = 'web-screen-1'
const KEEP_ROUNDS = 40

const uuid = () => crypto.randomUUID()
export const pageClock = () => performance.timeOrigin + performance.now()

export class DeviceError extends Error {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function loadSaved(storage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || 'null')
    return saved && saved.version === 1 ? saved : null
  } catch {
    return null
  }
}

export class ScreenDevice {
  constructor({
    storage = window.localStorage,
    fetcher = (...a) => fetch(...a),
    clock = pageClock,
  } = {}) {
    this.storage = storage
    this.fetcher = fetcher
    this.clock = clock
    this.saved = loadSaved(storage)
    this.lastContact = 0
    this.poll = null
    this.heldReason = ''
    this.chain = Promise.resolve()
    if (this.saved) this.recoverAfterReload()
  }

  // Journal sequence numbers must never interleave: run device operations one at a time.
  exclusive(task) {
    const run = this.chain.then(task, task)
    this.chain = run.catch(() => {})
    return run
  }

  get paired() {
    return Boolean(this.saved?.token)
  }

  pair(token) {
    const previous = this.saved
    // Keep the journal (and its storage identity) when an administrator re-pairs this browser.
    this.saved = previous
      ? { ...previous, token }
      : {
          version: 1,
          token,
          storageId: uuid(),
          registration: null,
          registered: false,
          epochMs: 0,
          sequence: 0,
          lastUptimeMs: 0,
          rounds: {},
          pending: null,
          rotate: false,
        }
    this.persist()
  }

  unpair() {
    if (!this.saved) return
    this.saved.token = null
    this.persist()
  }

  persist() {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.saved))
  }

  uptime() {
    return Math.max(this.saved.lastUptimeMs, Math.floor(this.clock() - this.saved.epochMs))
  }

  // A round that started but has no saved result was lost with the old page. Like an ESP32
  // reboot, register a new boot so the server holds it for review instead of guessing.
  recoverAfterReload() {
    const lost = Object.values(this.saved.rounds).some(
      (r) => r.startUptimeMs != null && !r.terminal && !r.fenced && !r.interrupted && !r.held,
    )
    if (lost && this.saved.registration) {
      this.saved.rotate = true
      this.persist()
    }
  }

  async request(path, { method = 'GET', body, boot = true } = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    let response
    try {
      response = await this.fetcher(`/api/device/${path}`, {
        method,
        credentials: 'omit',
        signal: controller.signal,
        headers: {
          'X-Device-Token': this.saved.token,
          ...(boot && this.saved.registration
            ? { 'X-Device-Boot-Id': this.saved.registration.bootId }
            : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
    } catch {
      throw new DeviceError('The server cannot be reached. Retrying…', 0)
    } finally {
      clearTimeout(timer)
    }
    let data = {}
    try {
      data = await response.json()
    } catch {
      data = {}
    }
    if (!response.ok) {
      throw new DeviceError(
        typeof data.detail === 'string' ? data.detail : `Server error ${response.status}.`,
        response.status,
        data.code,
      )
    }
    this.lastContact = this.clock()
    return data
  }

  newRegistration(previousBootId) {
    this.saved.registration = {
      bootId: uuid(),
      previousBootId: previousBootId ?? null,
      storageId: this.saved.storageId,
      uptimeMs: 0,
    }
    this.saved.registered = false
    this.saved.epochMs = this.clock()
    this.saved.sequence = 0
    this.saved.lastUptimeMs = 0
    this.persist()
  }

  async connect() {
    if (!this.saved.registration) {
      const { currentBootId } = await this.request('enrollment', { boot: false })
      this.newRegistration(currentBootId)
    }
    if (!this.saved.registered) {
      await this.request('boot', { method: 'POST', body: this.saved.registration, boot: false })
      this.saved.registered = true
      this.persist()
    }
    await this.flush()
    if (this.saved.rotate) {
      this.newRegistration(this.saved.registration.bootId)
      this.saved.rotate = false
      for (const round of Object.values(this.saved.rounds)) {
        if (round.startUptimeMs != null && !round.terminal) round.interrupted = true
      }
      this.persist()
      await this.request('boot', { method: 'POST', body: this.saved.registration, boot: false })
      this.saved.registered = true
      this.persist()
    }
  }

  async flush() {
    const packet = this.saved.pending
    if (!packet) return null
    let data
    try {
      data = await this.request('journal', { method: 'POST', body: packet })
    } catch (error) {
      if (error.status === 409 && ['reservation_expired', 'start_held'].includes(error.code)) {
        // The server refused this sequence for good: keep a copy, free the sequence number.
        const round = this.saved.rounds[packet.sessionId]
        if (round) round.held = true
        this.saved.pending = null
        this.persist()
        this.heldReason = error.message
        return { reviewRequired: true }
      }
      throw error
    }
    const round = this.saved.rounds[packet.sessionId]
    if (round) {
      if (packet.phase === 'reserved') round.accepted = true
      if (packet.phase === 'started') round.startSent = true
      if (packet.phase === 'terminal') {
        round.delivered = true
        round.score = data.score ?? round.score
      }
    }
    this.saved.sequence = packet.sequence
    this.saved.lastUptimeMs = packet.uptimeMs
    this.saved.pending = null
    this.persist()
    return data
  }

  async send(round, phase, extra = {}) {
    await this.flush()
    this.saved.pending = {
      eventId: uuid(),
      sequence: this.saved.sequence + 1,
      uptimeMs: this.uptime(),
      sessionId: round.sessionId,
      commandId: round.commandId,
      expectedRevision: round.expectedRevision,
      phase,
      ...extra,
    }
    this.persist() // saved before the request leaves the browser
    return this.flush()
  }

  async heartbeat(state) {
    const data = await this.request('heartbeat', {
      method: 'POST',
      body: { state, firmware: FIRMWARE },
    })
    // The active rules, for drawing the idle board; a called round brings its own.
    if (knownRuleset(data.rules, data.rulesHash)) this.activeRules = data.rules
    return data
  }

  // One sync cycle: register, deliver anything pending, heartbeat, then handle commands.
  sync(state) {
    return this.exclusive(() => this.syncNow(state))
  }

  async syncNow(state) {
    await this.connect()
    for (const round of Object.values(this.saved.rounds)) {
      if (
        round.startUptimeMs != null &&
        !round.startSent &&
        !round.held &&
        !round.fenced &&
        !round.interrupted
      )
        await this.deliverStarted(round)
    }
    const pendingTerminal = Object.values(this.saved.rounds).find(
      (r) => r.terminal && !r.delivered && !r.fenced && !r.held,
    )
    if (pendingTerminal) await this.deliverTerminal(pendingTerminal.sessionId)
    await this.heartbeat(state)
    const data = await this.request('commands')
    for (const command of data.commands) {
      let round = this.saved.rounds[command.sessionId]
      if (command.type === 'reserve') {
        if (round && (round.fenced || round.commandId !== command.id)) continue
        if (!knownRuleset(command.rules, command.rulesHash)) {
          throw new DeviceError(
            'This screen does not know the active game rules. Update the project on both laptops and pair again.',
            0,
            'rules_mismatch',
          )
        }
        if (!round) {
          round = {
            commandId: command.id,
            sessionId: command.sessionId,
            expectedRevision: command.expectedRevision,
            expiresAt: command.expiresAt,
            rules: command.rules,
            accepted: false,
            fenced: false,
            roundBootId: null,
            startUptimeMs: null,
            terminal: null,
          }
          this.saved.rounds[round.sessionId] = round
          this.prune()
          this.persist()
        }
        if (!round.accepted) await this.send(round, 'reserved')
      } else if (command.type === 'fence') {
        if (round?.terminal) {
          await this.deliverTerminal(round.sessionId)
          continue
        }
        if (!round) {
          round = {
            commandId: command.id,
            sessionId: command.sessionId,
            expectedRevision: command.expectedRevision,
            accepted: false,
            startUptimeMs: null,
          }
          this.saved.rounds[round.sessionId] = round
        }
        round.fenced = true
        this.persist()
        await this.send(
          { ...round, commandId: command.id, expectedRevision: command.expectedRevision },
          round.accepted && round.startUptimeMs == null ? 'fenced_unstarted' : 'fenced_interrupted',
        )
      }
    }
    this.poll = data
    return data
  }

  prune() {
    const entries = Object.entries(this.saved.rounds)
    if (entries.length <= KEEP_ROUNDS) return
    const removable = entries.filter(([, r]) => r.delivered || r.fenced)
    for (const [key] of removable.slice(0, entries.length - KEEP_ROUNDS))
      delete this.saved.rounds[key]
  }

  // The round this screen may play now: accepted by this browser and still active on the server.
  playableRound() {
    const active = this.poll?.activeSessionId
    const round = active && this.saved?.rounds[active]
    if (
      !round ||
      !round.accepted ||
      round.fenced ||
      round.held ||
      round.terminal ||
      round.interrupted
    )
      return null
    return round
  }

  canStart(round) {
    return Boolean(
      round &&
      !this.saved.pending &&
      round.startUptimeMs == null &&
      this.clock() - this.lastContact < 10000,
    )
  }

  // Called when the countdown ends. The start marker is saved first; the request may lag.
  markStarted(sessionId) {
    const round = this.saved.rounds[sessionId]
    if (round.startUptimeMs == null) {
      round.roundBootId = this.saved.registration.bootId
      round.startUptimeMs = this.uptime()
      this.persist()
    }
    return round
  }

  sendStarted(sessionId) {
    return this.exclusive(async () => {
      const round = this.saved.rounds[sessionId]
      await this.connect()
      return this.deliverStarted(round)
    })
  }

  async deliverStarted(round) {
    await this.flush() // a pending copy of this marker may already be on its way
    if (round.startSent || round.held) return { ok: !round.held }
    return this.send(round, 'started', {
      roundBootId: round.roundBootId,
      startUptimeMs: round.startUptimeMs,
    })
  }

  saveTerminal(sessionId, result) {
    const round = this.saved.rounds[sessionId]
    if (!round || round.startUptimeMs == null || round.fenced)
      throw new Error('This round cannot end here.')
    if (round.terminal && JSON.stringify(round.terminal) !== JSON.stringify(result))
      throw new Error('A saved result cannot change.')
    round.terminal = result
    this.persist()
  }

  reportTerminal(sessionId) {
    return this.exclusive(async () => {
      await this.connect()
      return this.deliverTerminal(sessionId)
    })
  }

  async deliverTerminal(sessionId) {
    const round = this.saved.rounds[sessionId]
    await this.flush()
    if (round.delivered) return { ok: true, score: round.score }
    // The start marker must reach the server before the result (it may have been lost offline).
    if (!round.startSent) {
      await this.deliverStarted(round)
      if (round.held) return { reviewRequired: true }
    }
    return this.send(round, 'terminal', {
      roundBootId: round.roundBootId,
      startUptimeMs: round.startUptimeMs,
      terminal: round.terminal,
    })
  }
}
