import { describe, expect, it, beforeEach } from 'vitest'
import { ScreenDevice, STORAGE_KEY } from './deviceClient'
import { MATRIX_RULES, MATRIX_RULES_HASH, playPresses, toResult } from './engine'

function memoryStorage() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  }
}

// A minimal stand-in for the protocol-v2 server: boot lineage, strict journal sequence.
function fakeServer() {
  const server = {
    token: 'screen-token',
    currentBoot: null,
    boots: [],
    journal: [],
    lastSequence: 0,
    offline: false,
    active: null,
    commands: [],
  }
  server.fetch = async (url, init = {}) => {
    if (server.offline) throw new TypeError('Failed to fetch')
    const headers = init.headers || {}
    const reply = (status, body) => ({ ok: status < 400, status, json: async () => body })
    if (headers['X-Device-Token'] !== server.token)
      return reply(401, { detail: 'Device authentication required.' })
    const path = url.replace('/api/device/', '')
    const body = init.body ? JSON.parse(init.body) : null
    if (path === 'enrollment') return reply(200, { currentBootId: server.currentBoot })
    if (path === 'boot') {
      if (body.previousBootId !== server.currentBoot) return reply(409, { detail: 'lineage' })
      server.boots.push(body)
      server.currentBoot = body.bootId
      server.lastSequence = 0
      return reply(200, { ok: true, bootId: body.bootId })
    }
    if (headers['X-Device-Boot-Id'] !== server.currentBoot) return reply(409, { detail: 'boot' })
    if (path === 'heartbeat') return reply(200, { activeSession: server.active })
    if (path === 'commands')
      return reply(200, {
        commands: server.commands,
        activeSessionId: server.active,
        reviewRequired: false,
      })
    if (path === 'journal') {
      const previous = server.journal.find((e) => e.eventId === body.eventId)
      if (previous) return reply(200, { ok: true, eventId: body.eventId, replayed: true })
      if (body.sequence !== server.lastSequence + 1) return reply(409, { detail: 'sequence' })
      server.lastSequence = body.sequence
      server.journal.push(body)
      if (body.phase === 'reserved') server.commands = []
      return reply(200, {
        ok: true,
        eventId: body.eventId,
        ...(body.phase === 'terminal' ? { score: 3 } : {}),
      })
    }
    return reply(404, {})
  }
  return server
}

const SESSION = '11111111-1111-4111-8111-111111111111'
const COMMAND = '22222222-2222-4222-8222-222222222222'

function reserve(server) {
  server.active = SESSION
  server.commands = [
    {
      id: COMMAND,
      type: 'reserve',
      sessionId: SESSION,
      expectedRevision: 1,
      rules: MATRIX_RULES,
      rulesHash: MATRIX_RULES_HASH,
      expiresAt: '2026-11-25T00:03:00Z',
    },
  ]
}

describe('web screen device client', () => {
  let storage, server, clock
  beforeEach(() => {
    storage = memoryStorage()
    server = fakeServer()
    clock = 1_000_000
  })
  const device = () => new ScreenDevice({ storage, fetcher: server.fetch, clock: () => clock })

  it('registers a boot, accepts a reservation and plays a round in journal order', async () => {
    const screen = device()
    screen.pair(server.token)
    await screen.sync('ready')
    expect(server.boots).toHaveLength(1)
    reserve(server)
    await screen.sync('ready')
    const round = screen.playableRound()
    expect(round.expiresAt).toBe('2026-11-25T00:03:00Z')
    expect(screen.canStart(round)).toBe(true)
    clock += 1500
    screen.markStarted(SESSION)
    await screen.sendStarted(SESSION)
    clock += 60000
    screen.saveTerminal(
      SESSION,
      toResult(playPresses([700, 1400]), '33333333-3333-4333-8333-333333333333'),
    )
    const done = await screen.reportTerminal(SESSION)
    expect(done.score).toBe(3)
    expect(server.journal.map((e) => [e.sequence, e.phase])).toEqual([
      [1, 'reserved'],
      [2, 'started'],
      [3, 'terminal'],
    ])
    expect(server.journal[2].startUptimeMs).toBe(1500)
    expect(server.journal[2].uptimeMs).toBeGreaterThanOrEqual(
      1500 + server.journal[2].terminal.durationMs,
    )
  })

  it('keeps an unsent result through a reload and resends the identical packet', async () => {
    const screen = device()
    screen.pair(server.token)
    reserve(server)
    await screen.sync('ready')
    screen.markStarted(SESSION)
    await screen.sendStarted(SESSION)
    screen.saveTerminal(SESSION, toResult(playPresses([]), '44444444-4444-4444-8444-444444444444'))
    server.offline = true
    await expect(screen.reportTerminal(SESSION)).rejects.toThrow()
    const pending = JSON.parse(storage.getItem(STORAGE_KEY)).pending
    expect(pending.phase).toBe('terminal')
    server.offline = false
    const reloaded = device() // same browser storage, new page
    await reloaded.sync('ready')
    const terminal = server.journal.filter((e) => e.phase === 'terminal')
    expect(terminal).toHaveLength(1)
    expect(terminal[0].eventId).toBe(pending.eventId)
    expect(server.boots).toHaveLength(1) // a finished round does not need a new boot
  })

  it('registers a new boot after a reload interrupts a started round', async () => {
    const screen = device()
    screen.pair(server.token)
    reserve(server)
    await screen.sync('ready')
    screen.markStarted(SESSION)
    await screen.sendStarted(SESSION)
    const firstBoot = server.currentBoot
    const reloaded = device()
    await reloaded.sync('ready')
    expect(server.boots).toHaveLength(2)
    expect(server.boots[1].previousBootId).toBe(firstBoot)
    expect(reloaded.playableRound()).toBeNull()
    await device().sync('ready') // a second reload does not rotate again
    expect(server.boots).toHaveLength(2)
  })

  it('refuses a reservation for other game rules', async () => {
    const screen = device()
    screen.pair(server.token)
    reserve(server)
    server.commands[0].rulesHash = 'a'.repeat(64)
    await expect(screen.sync('ready')).rejects.toThrow(/active game rules/)
  })
})
