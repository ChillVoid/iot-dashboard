import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../state/api'
import { ScreenDevice, pageClock } from '../screen/deviceClient'
import { SerialButton, serialSupported } from '../screen/button'
import {
  COUNTDOWN_MS,
  COUNTDOWN_STEP_MS,
  MATRIX_V2_RULES,
  createRound,
  positionAt,
  press,
  timeout,
  toResult,
} from '../screen/engine'
import { playSound, unlockAudio } from '../screen/sound'
import {
  createEffects,
  drawEffects,
  drawSparkles,
  onPlacement,
  onWin,
  resetEffects,
  stepShake,
} from '../screen/vfx'

// Web game screen: the default game display since 25 Nov 2026. It runs full screen on the
// second laptop; the arcade button reaches it through the ESP32 button bridge (Web Serial).
// The page plays as Cabinet 01 through the device journal, so every round is replayed and
// timed by the server. Layout and effects follow the design canvas "Stack Moko Baby Admin &
// Game Screen" (round 3): full-bleed board, HUD chips, and an Operator icon instead of a
// side panel.

const COLORS = { grid: '#1a1e1f', cloud: '#f4f5f5', lime: '#dfff00' }
const RESULT_MS = 8000
const KEYBOARD_KEY = 'smb.gameScreen.keyboard'
const SOUND_KEY = 'smb.gameScreen.sound'

function readFlag(key, fallback = false) {
  try {
    const value = window.localStorage.getItem(key)
    return value == null ? fallback : value === '1'
  } catch {
    return fallback
  }
}

function writeFlag(key, value) {
  try {
    window.localStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* the setting just won't be remembered */
  }
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function drawBoard(canvas, game, fx, now, dt, rules) {
  const ROWS = rules.levels + 1 // foundation + levels
  const ctx = canvas?.getContext('2d')
  if (!ctx) return
  const ratio = window.devicePixelRatio || 1
  const { width: cssWidth, height: cssHeight } = canvas.getBoundingClientRect()
  if (canvas.width !== Math.round(cssWidth * ratio)) canvas.width = Math.round(cssWidth * ratio)
  if (canvas.height !== Math.round(cssHeight * ratio)) canvas.height = Math.round(cssHeight * ratio)
  const reduced = prefersReducedMotion()
  // The board uses 88% of the height, centred, so HUD chips stay clear of it.
  const cell = Math.min(canvas.width / (rules.columns + 2), (canvas.height * 0.88) / ROWS)
  const geo = {
    cell,
    rows: ROWS,
    width: canvas.width,
    height: canvas.height,
    left: (canvas.width - cell * rules.columns) / 2,
    top: (canvas.height - cell * ROWS) / 2 + canvas.height * 0.02,
  }
  const glow = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height * 0.9,
    cell,
    canvas.width / 2,
    canvas.height * 0.7,
    Math.max(canvas.width, canvas.height) * 0.7,
  )
  glow.addColorStop(0, '#1b1f12')
  glow.addColorStop(1, '#111313')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const score = game.round?.score ?? 0
  drawSparkles(ctx, fx, geo, now, dt, score, reduced)

  ctx.save()
  const [sx, sy] = stepShake(fx, dt, now, reduced)
  ctx.translate(sx, sy)
  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 1
  for (let c = 0; c <= rules.columns; c += 1) {
    ctx.beginPath()
    ctx.moveTo(geo.left + c * cell + 0.5, geo.top)
    ctx.lineTo(geo.left + c * cell + 0.5, geo.top + ROWS * cell)
    ctx.stroke()
  }
  for (let r = 0; r <= ROWS; r += 1) {
    ctx.beginPath()
    ctx.moveTo(geo.left, geo.top + r * cell + 0.5)
    ctx.lineTo(geo.left + rules.columns * cell, geo.top + r * cell + 0.5)
    ctx.stroke()
  }
  const inset = Math.max(2, cell * 0.07)
  const block = (column, level, span, color, alpha = 1, shine = 0) => {
    ctx.globalAlpha = alpha
    ctx.shadowColor =
      color === COLORS.lime ? `rgba(223,255,0,${shine})` : `rgba(244,245,245,${shine})`
    ctx.shadowBlur = shine ? 18 * ratio : 0
    ctx.fillStyle = color
    const x = geo.left + column * cell + inset
    const y = geo.top + (ROWS - 1 - level) * cell + inset
    ctx.beginPath()
    ctx.roundRect(x, y, span * cell - inset * 2, cell - inset * 2, Math.max(2, cell * 0.12))
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }
  block(rules.foundation_x, 0, rules.initial_width, COLORS.cloud, 1, 0.25)
  const round = game.round
  if (round) {
    round.trace.forEach((p, index) => {
      if (p.overlap) block(Math.max(p.x, p.support), index + 1, p.overlap, COLORS.lime, 1, 0.35)
      else block(p.x, index + 1, p.width, COLORS.cloud, 0.3)
    })
    if (game.phase === 'playing' && !round.ended) {
      const elapsed = Math.max(0, now - game.startClock)
      block(positionAt(round, elapsed), round.count + 1, round.width, COLORS.lime, 0.92, 0.7)
    }
  }
  drawEffects(ctx, fx, geo, dt, reduced)
  ctx.restore()
}

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export default function GameScreen() {
  const device = useRef(null)
  if (!device.current) device.current = new ScreenDevice()
  const canvas = useRef(null)
  const effects = useRef(null)
  if (!effects.current) effects.current = createEffects()
  const game = useRef({
    phase: 'idle',
    round: null,
    sessionId: null,
    startClock: 0,
    countdownAt: 0,
  })
  const button = useRef(null)
  const sheetRef = useRef(null)
  const [paired, setPaired] = useState(device.current.paired)
  const [view, setView] = useState({ phase: 'idle', score: 0, seconds: 60, step: 0, won: false })
  const [server, setServer] = useState({
    ok: false,
    message: 'Connecting…',
    round: null,
    held: false,
  })
  const [buttonState, setButtonState] = useState({
    state: serialSupported() ? 'none' : 'unsupported',
  })
  const [keyboard, setKeyboard] = useState(() => readFlag(KEYBOARD_KEY))
  const [sound, setSound] = useState(() => readFlag(SOUND_KEY, true))
  const [menu, setMenu] = useState(false)
  const [lobby, setLobby] = useState(null)
  const [saved, setSaved] = useState('')
  const [secondTab, setSecondTab] = useState(false)
  const soundOn = useRef(sound)
  soundOn.current = sound

  const show = useCallback((patch) => setView((current) => ({ ...current, ...patch })), [])
  const beep = useCallback((name) => soundOn.current && playSound(name), [])

  // One game screen tab per browser: two tabs would race the same journal.
  useEffect(() => {
    if (!navigator.locks) return undefined
    let release
    let cancelled = false
    let retry
    const held = new Promise((resolve) => (release = resolve))
    // Retry briefly: a reload or remount frees the previous holder a moment later.
    const attempt = (tries) =>
      navigator.locks.request('smb-game-screen', { ifAvailable: true }, (lock) => {
        if (lock) {
          if (!cancelled) setSecondTab(false)
          return held
        }
        if (cancelled) return undefined
        if (tries > 0) retry = setTimeout(() => void attempt(tries - 1), 250)
        else setSecondTab(true)
        return undefined
      })
    void attempt(8)
    return () => {
      cancelled = true
      clearTimeout(retry)
      release()
    }
  }, [])

  // Keep the laptop screen on while this page is visible.
  useEffect(() => {
    let lock = null
    const acquire = async () => {
      try {
        if (document.visibilityState === 'visible')
          lock = await navigator.wakeLock?.request('screen')
      } catch {
        /* not allowed right now; Windows power settings are the backup */
      }
    }
    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release()
    }
  }, [])

  const finish = useCallback(
    (now) => {
      const current = game.current
      const round = current.round
      const result = toResult(round, crypto.randomUUID())
      try {
        device.current.saveTerminal(current.sessionId, result)
      } catch (error) {
        setSaved(error.message)
      }
      if (round.won) onWin(effects.current, round.trace[round.trace.length - 1], round.count)
      beep(round.won ? 'win' : 'loss')
      current.phase = 'result'
      current.resultUntil = now + RESULT_MS
      const perfect = round.trace.filter((p) => p.overlap && p.overlap === p.width).length
      show({ phase: 'result', score: round.score, won: round.won, perfect })
      setSaved('Saving the score…')
      device.current
        .reportTerminal(current.sessionId)
        .then((reply) =>
          setSaved(
            reply?.reviewRequired
              ? 'Held for the operator to review.'
              : 'Score saved to the leaderboard.',
          ),
        )
        .catch(() => setSaved('Score kept on this laptop; it will upload when the server is back.'))
    },
    [beep, show],
  )

  const onPress = useCallback(
    (at) => {
      const current = game.current
      if (current.phase === 'idle') {
        const round = device.current.playableRound()
        if (!device.current.canStart(round)) return
        unlockAudio()
        current.phase = 'countdown'
        current.countdownAt = at
        current.sessionId = round.sessionId
        current.round = createRound(round.rules || MATRIX_V2_RULES)
        resetEffects(effects.current)
        setSaved('')
        setMenu(false)
        show({ phase: 'countdown', step: 3, score: 0, seconds: 60 })
        beep('countdown')
      } else if (current.phase === 'playing' && at >= current.startClock) {
        const round = current.round
        if (press(round, at - current.startClock)) {
          onPlacement(effects.current, round.trace[round.trace.length - 1], round.count)
          if (!round.ended) beep('place')
        }
        show({ score: round.score })
        if (round.ended) finish(at)
      }
    },
    [beep, finish, show],
  )

  // Animation loop: countdown, timing, timeout, effects and drawing.
  const viewRef = useRef(view)
  viewRef.current = view
  useEffect(() => {
    let frame
    let last = pageClock()
    const loop = () => {
      const now = pageClock()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const current = game.current
      if (current.phase === 'countdown') {
        const passed = now - current.countdownAt
        if (passed >= COUNTDOWN_MS) {
          const round = device.current.markStarted(current.sessionId)
          current.startClock = device.current.saved.epochMs + round.startUptimeMs
          current.phase = 'playing'
          show({ phase: 'playing', step: 0 })
          device.current
            .sendStarted(current.sessionId)
            .then((reply) => {
              if (reply?.reviewRequired && game.current.sessionId === current.sessionId) {
                game.current.phase = 'idle'
                game.current.round = null
                show({ phase: 'idle' })
                setServer((s) => ({ ...s, held: true }))
              }
            })
            .catch(() => {}) // retried by the sync loop and before the result
        } else {
          const step = 3 - Math.floor(passed / COUNTDOWN_STEP_MS)
          if (step !== viewRef.current.step) show({ step })
        }
      } else if (current.phase === 'playing') {
        const elapsed = now - current.startClock
        const limit = current.round.rules.round_limit_ms
        if (!current.round.ended && elapsed >= limit) timeout(current.round)
        if (current.round.ended) finish(now)
        else {
          const seconds = Math.max(0, Math.ceil((limit - elapsed) / 1000))
          if (seconds !== viewRef.current.seconds) show({ seconds })
        }
      } else if (current.phase === 'result' && now >= current.resultUntil) {
        current.phase = 'idle'
        current.round = null
        current.sessionId = null
        show({ phase: 'idle' })
      }
      const rules = current.round?.rules || device.current.activeRules || MATRIX_V2_RULES
      drawBoard(canvas.current, current, effects.current, now, dt, rules)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [finish, show])

  // Server sync every second: heartbeat, commands, and any unsent journal event.
  useEffect(() => {
    if (!paired || secondTab) return undefined
    let stopped = false
    let busy = false
    const tick = async () => {
      if (busy || stopped) return
      busy = true
      const phase = game.current.phase
      try {
        const data = await device.current.sync(
          phase === 'countdown' || phase === 'playing' ? 'playing' : 'ready',
        )
        if (stopped) return
        const round = device.current.playableRound()
        setServer({
          ok: true,
          message: '',
          held: Boolean(data.reviewRequired),
          round: round ? { sessionId: round.sessionId, expiresAt: round.expiresAt } : null,
        })
      } catch (error) {
        if (stopped) return
        if (error.status === 401) {
          device.current.unpair()
          setPaired(false)
        }
        setServer((s) => ({ ...s, ok: false, message: error.message }))
      } finally {
        busy = false
      }
    }
    void tick()
    const timer = setInterval(tick, 1000)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [paired, secondTab])

  // Queue size for the waiting screen (public lobby numbers only).
  useEffect(() => {
    let stopped = false
    const load = () =>
      api('/player/lobby')
        .then((data) => !stopped && setLobby(data))
        .catch(() => {})
    void load()
    const timer = setInterval(load, 5000)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [])

  // The arcade button over USB, reconnecting to a port this browser was already allowed.
  useEffect(() => {
    if (!serialSupported()) return undefined
    const bridge = new SerialButton({ onPress, onStatus: setButtonState, clock: pageClock })
    button.current = bridge
    void bridge.reconnect().catch(() => {})
    return () => void bridge.stop()
  }, [onPress])

  // Keyboard fallback (Space or Enter), off unless the operator switches it on.
  useEffect(() => {
    if (!keyboard) return undefined
    const onKey = (event) => {
      if (event.repeat || (event.code !== 'Space' && event.key !== 'Enter')) return
      if (event.target.closest?.('input, textarea, select')) return
      // Space must play, not press whichever operator button still has focus.
      event.preventDefault()
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      onPress(performance.timeOrigin + event.timeStamp)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyboard, onPress])

  // Close the operator sheet with Escape or a click outside it.
  useEffect(() => {
    if (!menu) return undefined
    const onKey = (event) => event.key === 'Escape' && setMenu(false)
    const onDown = (event) => {
      if (!sheetRef.current?.contains(event.target)) setMenu(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [menu])

  function toggleKeyboard() {
    const next = !keyboard
    setKeyboard(next)
    writeFlag(KEYBOARD_KEY, next)
  }

  function toggleSound() {
    const next = !sound
    setSound(next)
    writeFlag(SOUND_KEY, next)
    if (next) unlockAudio()
  }

  async function connectButton() {
    unlockAudio()
    try {
      await button.current?.choose()
    } catch (error) {
      if (error?.name !== 'NotFoundError') setButtonState({ state: 'error', detail: error.message })
    }
  }

  function fullScreen() {
    unlockAudio()
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.()
  }

  function unpair() {
    device.current.unpair()
    setPaired(false)
    setMenu(false)
  }

  if (!paired)
    return (
      <ScreenMessage title="This laptop is not the game screen yet">
        An administrator signs in on this laptop and chooses Settings → Game screen → Use this
        laptop as the game screen.
        <Link to="/admin/login" className={`${pillLime} tw:mt-6`}>
          Administrator sign-in
        </Link>
      </ScreenMessage>
    )
  if (secondTab)
    return (
      <ScreenMessage title="The game screen is already open">
        Use the other tab or window. Only one game screen can run in this browser.
      </ScreenMessage>
    )

  const buttonReady = buttonState.state === 'connected'
  const inputReady = buttonReady || keyboard
  const allReady = server.ok && inputReady
  const buttonLabel = {
    connected: 'Button connected (USB)',
    none: 'Button not connected',
    lost: 'Button unplugged',
    error: 'Button error',
    unsupported: 'No Web Serial: use Chrome or Edge',
  }[buttonState.state]
  const rules = game.current.round?.rules || device.current.activeRules || MATRIX_V2_RULES
  const called = server.round && view.phase === 'idle'
  const playing = view.phase === 'playing' || view.phase === 'countdown'

  return (
    <main
      className="tw:fixed tw:inset-0 tw:z-[60] tw:overflow-hidden tw:bg-night tw:font-sans tw:text-cloud"
      onClick={unlockAudio}
    >
      <h1 className="tw:sr-only">Stack Moko Baby game screen</h1>
      <canvas
        ref={canvas}
        className="tw:absolute tw:inset-0 tw:h-full tw:w-full"
        role="img"
        aria-label={`Stacking board, score ${view.score}`}
      />

      {playing && (
        <>
          <Hud className="tw:left-[2.2vw] tw:top-[3vh]" label="Score" value={view.score} />
          <Hud
            className="tw:right-[calc(2.2vw+68px)] tw:top-[3vh] tw:text-right"
            label="Time"
            value={`${Math.floor(view.seconds / 60)}:${String(view.seconds % 60).padStart(2, '0')}`}
          />
        </>
      )}

      {view.phase === 'countdown' && (
        <Overlay>
          <span
            key={view.step}
            className="tw:text-[min(30vh,22vw)] tw:font-black tw:leading-none tw:text-lime tw:[text-shadow:0_0_40px_rgba(223,255,0,.45)] tw:motion-safe:animate-pop-in"
          >
            {view.step}
          </span>
        </Overlay>
      )}
      {view.phase === 'playing' && (
        <p className="tw:pointer-events-none tw:absolute tw:top-[5vh] tw:left-0 tw:right-0 tw:m-0 tw:text-center tw:text-[min(2.6vh,20px)] tw:font-bold tw:text-lime/90">
          GO! Press to stack
        </p>
      )}

      {view.phase === 'idle' && !called && (
        <Overlay>
          <div className="tw:max-w-[80vw] tw:text-center tw:motion-safe:animate-fade-up">
            <p className="tw:m-0 tw:text-[13px] tw:font-bold tw:uppercase tw:tracking-[0.14em] tw:text-lime">
              {server.held ? 'Round held' : 'Waiting for the next player'}
            </p>
            <p className="tw:mt-4 tw:mb-0 tw:text-[min(9vh,72px)] tw:font-black tw:leading-[1.02] tw:tracking-[-0.025em]">
              {server.held ? (
                <>
                  The operator is checking
                  <br />
                  the last round.
                </>
              ) : (
                <>
                  Scan the QR
                  <br />
                  to join the line.
                </>
              )}
            </p>
            {lobby && (
              <p className="tw:mt-4 tw:mb-0 tw:text-[min(2.6vh,20px)] tw:text-cloud/70">
                {lobby.inLine} in line
                {lobby.bestToday != null ? ` · best today ${lobby.bestToday}` : ''} · stack all{' '}
                {rules.levels}
                rows in 60 seconds
              </p>
            )}
          </div>
        </Overlay>
      )}

      {called && (
        <Overlay>
          <div className="tw:flex tw:flex-col tw:items-center tw:gap-[3vh] tw:text-center tw:motion-safe:animate-fade-up">
            <p className="tw:m-0 tw:text-[13px] tw:font-bold tw:uppercase tw:tracking-[0.14em] tw:text-lime">
              Player called
            </p>
            <span
              aria-hidden="true"
              className="tw:grid tw:size-[min(22vh,170px)] tw:place-items-center tw:rounded-full tw:bg-[radial-gradient(circle_at_40%_35%,#f2ff8a,#dfff00_55%,#b8d400)] tw:text-[min(3vh,22px)] tw:font-black tw:text-night tw:shadow-[0_0_60px_rgba(223,255,0,.35)] tw:motion-safe:animate-breathe"
            >
              PRESS
            </span>
            <p className="tw:m-0 tw:text-[min(6.5vh,52px)] tw:font-black tw:leading-[1.05] tw:tracking-[-0.02em]">
              Your turn! Press the button.
            </p>
            <Deadline expiresAt={server.round.expiresAt} />
          </div>
        </Overlay>
      )}

      {view.phase === 'result' && (
        <Overlay>
          <div className="tw:flex tw:flex-col tw:items-center tw:gap-[1vh] tw:rounded-[32px] tw:bg-night/80 tw:px-[6vw] tw:py-[4vh] tw:text-center tw:motion-safe:animate-modal-in">
            <p className="tw:m-0 tw:text-[min(10vh,76px)] tw:font-black tw:leading-none tw:tracking-[-0.02em] tw:text-lime tw:[text-shadow:0_0_30px_rgba(223,255,0,.4)]">
              {view.won ? 'YOU WIN!' : 'GAME OVER'}
            </p>
            <p className="tw:m-0 tw:text-[13px] tw:font-bold tw:uppercase tw:tracking-[0.14em] tw:text-cloud/60">
              Final score
            </p>
            <p
              data-testid="final-score"
              className="tw:m-0 tw:text-[min(18vh,140px)] tw:font-black tw:leading-none tw:tabular-nums"
            >
              {view.score}
            </p>
            <p className="tw:m-0 tw:text-[min(2.4vh,18px)] tw:text-cloud/70">
              {view.won ? `All ${rules.levels} levels` : `${view.score} of ${rules.levels} levels`}
              {view.perfect
                ? ` · ${view.perfect} perfect drop${view.perfect === 1 ? '' : 's'}`
                : ''}
            </p>
            {saved && (
              <p
                className="tw:mt-[1.5vh] tw:mb-0 tw:inline-flex tw:items-center tw:gap-2 tw:rounded-full tw:bg-cloud/10 tw:px-4 tw:py-2 tw:text-[15px]"
                role="status"
              >
                {saved}
              </p>
            )}
          </div>
        </Overlay>
      )}

      {keyboard && !menu && (
        <p className="tw:absolute tw:bottom-[3vh] tw:left-[2.2vw] tw:m-0 tw:rounded-full tw:bg-cloud/10 tw:px-3 tw:py-1.5 tw:text-[13px] tw:text-cloud/80">
          Keyboard fallback on (Space)
        </p>
      )}

      <div
        ref={sheetRef}
        className="tw:absolute tw:right-[2.2vw] tw:top-[3vh] tw:flex tw:flex-col tw:items-end tw:gap-3"
      >
        <button
          type="button"
          aria-expanded={menu}
          aria-label={`Operator menu (${server.ok ? 'server connected' : 'server not connected'}, ${inputReady ? (buttonReady ? 'button connected' : 'keyboard fallback on') : 'button not connected'})`}
          onClick={() => setMenu(!menu)}
          className="tw:relative tw:grid tw:size-[52px] tw:cursor-pointer tw:place-items-center tw:rounded-full tw:border tw:border-solid tw:border-cloud/20 tw:bg-cloud/[0.06] tw:text-cloud tw:motion-safe:transition-transform tw:motion-safe:duration-[120ms] tw:motion-safe:ease-snappy tw:motion-safe:active:scale-[0.92] tw:hover:bg-cloud/10"
        >
          <svg {...iconProps} width={22} height={22}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
          </svg>
          <span
            aria-hidden="true"
            className={`tw:absolute tw:right-0.5 tw:top-0.5 tw:size-3 tw:rounded-full tw:border-2 tw:border-solid tw:border-night ${allReady ? 'tw:bg-lime' : 'tw:bg-cloud/40'}`}
          />
        </button>
        {menu && (
          <div
            role="dialog"
            aria-label="Operator"
            className="tw:w-[340px] tw:max-w-[calc(100vw-32px)] tw:rounded-[22px] tw:border tw:border-solid tw:border-cloud/10 tw:bg-[rgba(24,27,28,.96)] tw:p-2.5 tw:shadow-[0_18px_48px_rgba(0,0,0,.45)] tw:origin-top-right tw:motion-safe:animate-panel-in"
          >
            <div
              className="tw:mb-1.5 tw:grid tw:gap-2 tw:border-b tw:border-solid tw:border-cloud/10 tw:px-3.5 tw:pt-2.5 tw:pb-3 tw:text-[14px]"
              role="status"
              aria-live="polite"
            >
              <StatusLine ok={server.ok} label={server.ok ? 'Server connected' : server.message} />
              <StatusLine
                ok={inputReady}
                label={keyboard && !buttonReady ? 'Keyboard fallback on (Space)' : buttonLabel}
              />
            </div>
            <SheetRow onClick={fullScreen} label="Full screen">
              <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
            </SheetRow>
            <SheetRow
              onClick={() => void connectButton()}
              label={buttonReady ? 'Reconnect button (USB)' : 'Connect button (USB)'}
            >
              <path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4" />
            </SheetRow>
            <SheetRow
              onClick={toggleKeyboard}
              label="Keyboard fallback"
              value={keyboard ? 'on' : 'off'}
              pressed={keyboard}
            >
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M7 14h10" />
            </SheetRow>
            <SheetRow
              onClick={toggleSound}
              label="Sound"
              value={sound ? 'on' : 'off'}
              pressed={sound}
            >
              <path d="M11 5 6 9H2v6h4l5 4zM16 9a5 5 0 0 1 0 6" />
            </SheetRow>
            <SheetRow onClick={unpair} label="Unpair this laptop" muted>
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
            </SheetRow>
            {buttonState.detail && (
              <p className="tw:m-0 tw:px-3.5 tw:pb-2 tw:text-[13px] tw:text-cloud/70">
                {buttonState.detail}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

const pillLime =
  'tw:inline-flex tw:min-h-11 tw:items-center tw:justify-center tw:rounded-full tw:border-0 tw:bg-lime tw:px-5 tw:py-3 tw:text-[15px] tw:font-bold tw:text-night tw:no-underline tw:cursor-pointer'

function Hud({ label, value, className }) {
  return (
    <div
      className={`tw:pointer-events-none tw:absolute tw:rounded-[22px] tw:border tw:border-solid tw:border-cloud/10 tw:bg-cloud/[0.06] tw:px-5 tw:py-3 ${className}`}
    >
      <p className="tw:m-0 tw:text-[12px] tw:font-bold tw:uppercase tw:tracking-[0.12em] tw:text-cloud/60">
        {label}
      </p>
      <p className="tw:m-0 tw:text-[min(9vh,72px)] tw:font-black tw:leading-none tw:tabular-nums">
        {value}
      </p>
    </div>
  )
}

function SheetRow({ children, label, value, onClick, pressed, muted }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`tw:flex tw:min-h-12 tw:w-full tw:cursor-pointer tw:items-center tw:gap-3 tw:rounded-[14px] tw:border-0 tw:bg-transparent tw:px-3.5 tw:text-left tw:font-sans tw:text-[15px] tw:font-semibold tw:hover:bg-cloud/[0.08] tw:motion-safe:transition-[background-color,transform] tw:motion-safe:duration-[120ms] tw:motion-safe:ease-snappy tw:motion-safe:active:scale-[0.98] ${muted ? 'tw:text-cloud/60' : 'tw:text-cloud'}`}
    >
      <svg {...iconProps} width={18} height={18}>
        {children}
      </svg>
      {label}
      {value && (
        <span className="tw:ml-auto tw:text-[13px] tw:font-normal tw:text-cloud/60">{value}</span>
      )}
    </button>
  )
}

function Overlay({ children }) {
  return (
    <div className="tw:pointer-events-none tw:absolute tw:inset-0 tw:flex tw:items-center tw:justify-center">
      {children}
    </div>
  )
}

function StatusLine({ ok, label }) {
  return (
    <span className="tw:flex tw:items-center tw:gap-2">
      <span
        aria-hidden="true"
        className={`tw:size-2.5 tw:rounded-full ${ok ? 'tw:bg-lime' : 'tw:bg-cloud/40'}`}
      />
      {label}
    </span>
  )
}

function Deadline({ expiresAt }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const left = Math.max(0, Math.floor((Date.parse(expiresAt) - now) / 1000))
  if (!expiresAt || Number.isNaN(left)) return null
  return (
    <p className="tw:m-0 tw:text-[min(2.4vh,18px)] tw:tabular-nums tw:text-cloud/70">
      Start within {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
    </p>
  )
}

function ScreenMessage({ title, children }) {
  return (
    <main className="tw:fixed tw:inset-0 tw:z-[60] tw:flex tw:items-center tw:justify-center tw:bg-night tw:p-8 tw:text-cloud">
      <div className="tw:max-w-[560px] tw:text-center">
        <h1 className="tw:m-0 tw:text-[32px] tw:font-black tw:leading-tight">{title}</h1>
        <p className="tw:mt-4 tw:text-[17px] tw:leading-[1.6] tw:text-cloud/75">{children}</p>
      </div>
    </main>
  )
}
