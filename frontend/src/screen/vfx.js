// Visual effects for the web game screen (design canvas "Stack Moko Baby Admin & Game Screen",
// round 3). Everything is drawn after the game step on the same canvas and never affects
// timing, scoring or the trace. Positions are in board units (columns, levels) so the
// effects follow the board when the window is resized.
//
//   perfect drop  -> white ripple rings (more with the combo) + one "PERFECT xN" label
//   cut           -> the lost overhang breaks into chips that fall with gravity
//   miss          -> short screen shake + a faint Cloud flash
//   win           -> two lime shockwaves + confetti
//   always        -> ambient sparkles that grow denser with the score
//
// Reduced motion keeps the signal and drops the movement: rings show as one outline,
// labels appear without the pop, no chips, confetti or shake.

const LIME = '#dfff00'
const CLOUD = '#f4f5f5'
const MAX_PARTICLES = 240

export function createEffects(count = 40) {
  return {
    rings: [],
    pops: [],
    chips: [],
    waves: [],
    confetti: [],
    shake: 0,
    flash: 0,
    combo: 0,
    sparks: Array.from({ length: count }, (_, i) => ({
      x: ((i * 197) % 997) / 997,
      y: ((i * 131) % 991) / 991,
      r: 1 + (i % 3) * 0.6,
      v: 0.008 + (i % 5) * 0.004,
      t: i * 0.7,
    })),
  }
}

export function resetEffects(fx) {
  fx.rings = []
  fx.pops = []
  fx.chips = []
  fx.waves = []
  fx.confetti = []
  fx.shake = 0
  fx.flash = 0
  fx.combo = 0
}

const particles = (fx) => fx.chips.length + fx.confetti.length

// Called after every placed row. `placement` is the engine trace entry, `level` is 1-based.
export function onPlacement(fx, placement, level) {
  const { x, width, overlap, support } = placement
  const left = Math.max(x, support)
  if (!overlap) {
    fx.combo = 0
    fx.pops = []
    fx.shake = 1
    fx.flash = 1
    addChips(fx, x, width, level)
    return
  }
  if (overlap < width) {
    fx.combo = 0
    fx.pops = []
    addChips(fx, x < support ? x : support + width, width - overlap, level)
    return
  }
  fx.combo += 1
  const rings = Math.min(5, 2 + fx.combo)
  for (let i = 0; i < rings; i += 1)
    fx.rings.push({ col: left, width: overlap, level, t: -i * 0.08 })
  // One label at a time, drawn above the lane the next moving row uses.
  fx.pops = [
    {
      text: fx.combo >= 2 ? `PERFECT ×${fx.combo}` : 'PERFECT',
      col: left + overlap / 2,
      level: level + 1,
      t: 0,
    },
  ]
}

export function onWin(fx, placement, level) {
  const col = Math.max(placement.x, placement.support) + placement.overlap / 2
  fx.waves.push({ col, level, t: 0 }, { col, level, t: -0.25 })
  for (let i = 0; i < 60 && particles(fx) < MAX_PARTICLES; i += 1) {
    fx.confetti.push({
      col,
      level,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * 12 + 3,
      life: 1.6,
      color: i % 3 ? LIME : CLOUD,
    })
  }
}

function addChips(fx, col, width, level) {
  const pieces = Math.min(6, Math.max(3, width * 2))
  for (let i = 0; i < pieces && particles(fx) < MAX_PARTICLES; i += 1) {
    fx.chips.push({
      col: col + (i / pieces) * width,
      width: width / pieces,
      level,
      vx: (Math.random() - 0.3) * 3,
      vy: Math.random() * 3,
      rot: 0,
      vr: (Math.random() - 0.5) * 8,
      life: 0.9,
    })
  }
}

// geo: { cell, left, top, rows, width, height } in canvas pixels.
// Returns the canvas-space offset to apply for the screen shake.
export function stepShake(fx, dt, now, reduced) {
  if (fx.shake <= 0 || reduced) {
    fx.shake = 0
    return [0, 0]
  }
  const a = 6 * fx.shake * (window.devicePixelRatio || 1)
  fx.shake = Math.max(0, fx.shake - dt / 0.24)
  return [Math.sin(now / 18) * a, Math.cos(now / 23) * a * 0.6]
}

export function drawSparkles(ctx, fx, geo, now, dt, score, reduced) {
  const live = Math.min(fx.sparks.length, 12 + Math.round(score * 1.6))
  const ratio = window.devicePixelRatio || 1
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(223,255,0,.8)'
  ctx.shadowBlur = 8 * ratio
  for (let i = 0; i < live; i += 1) {
    const s = fx.sparks[i]
    if (!reduced) {
      s.y -= s.v * dt
      if (s.y < -0.01) {
        s.y = 1.01
        s.x = (s.x + 0.377) % 1
      }
    }
    ctx.globalAlpha = reduced ? 0.45 : 0.3 + 0.7 * Math.abs(Math.sin(now / 900 + s.t))
    ctx.beginPath()
    ctx.arc(s.x * geo.width, s.y * geo.height, s.r * ratio, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function drawEffects(ctx, fx, geo, dt, reduced) {
  const ratio = window.devicePixelRatio || 1
  const px = (col) => geo.left + col * geo.cell
  const py = (level) => geo.top + (geo.rows - 1 - level) * geo.cell
  ctx.save()

  fx.rings = fx.rings.filter((r) => {
    r.t += dt
    if (r.t < 0) return true
    const p = r.t / 0.45
    if (p >= 1) return false
    const grow = reduced ? 0 : p
    ctx.globalAlpha = reduced ? (p < 0.4 ? 1 : 0) : 1 - p
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = (3 - 2 * p) * ratio
    const w = r.width * geo.cell
    ctx.strokeRect(
      px(r.col) - grow * geo.cell * 0.7,
      py(r.level) - grow * geo.cell * 0.36,
      w + grow * geo.cell * 1.4,
      geo.cell + grow * geo.cell * 0.72,
    )
    return true
  })

  fx.chips = fx.chips.filter((c) => {
    c.life -= dt
    if (c.life <= 0 || reduced) return false
    c.vy -= 20 * dt
    c.col += c.vx * dt
    c.level += c.vy * dt
    c.rot += c.vr * dt
    ctx.globalAlpha = Math.min(1, c.life / 0.5)
    const w = c.width * geo.cell - 3 * ratio
    const h = geo.cell - 6 * ratio
    ctx.save()
    ctx.translate(px(c.col) + w / 2, py(c.level) + geo.cell / 2)
    ctx.rotate(c.rot)
    ctx.fillStyle = LIME
    ctx.fillRect(-w / 2, -h / 2, w, h)
    ctx.restore()
    return true
  })

  fx.waves = fx.waves.filter((w) => {
    w.t += dt
    if (w.t < 0) return true
    const p = w.t / 1.1
    if (p >= 1) return false
    ctx.globalAlpha = 1 - p
    ctx.strokeStyle = LIME
    ctx.lineWidth = (4 - 3 * p) * ratio
    ctx.beginPath()
    ctx.arc(
      px(w.col),
      py(w.level) + geo.cell / 2,
      (reduced ? 0.3 : p) * Math.max(geo.width, geo.height) * 0.45,
      0,
      Math.PI * 2,
    )
    ctx.stroke()
    return true
  })

  fx.confetti = fx.confetti.filter((c) => {
    c.life -= dt
    if (c.life <= 0 || reduced) return false
    c.vy -= 14 * dt
    c.col += c.vx * dt
    c.level += c.vy * dt
    ctx.globalAlpha = Math.min(1, c.life)
    ctx.fillStyle = c.color
    ctx.fillRect(px(c.col), py(c.level), 6 * ratio, 6 * ratio)
    return true
  })

  fx.pops = fx.pops.filter((p) => {
    p.t += dt
    if (p.t > 0.75) return false
    const scale = reduced
      ? 1
      : p.t < 0.15
        ? 0.6 + (p.t / 0.15) * 0.55
        : 1.15 - Math.min(0.15, p.t - 0.15)
    ctx.globalAlpha = p.t < 0.55 ? 1 : 1 - (p.t - 0.55) / 0.2
    ctx.save()
    ctx.translate(px(p.col), py(p.level) - 0.3 * geo.cell - (reduced ? 0 : p.t * geo.cell * 0.6))
    ctx.scale(scale, scale)
    ctx.fillStyle = LIME
    ctx.shadowColor = 'rgba(223,255,0,.55)'
    ctx.shadowBlur = 18 * ratio
    ctx.font = `800 ${Math.round(geo.cell * 0.62)}px "Open Sans Variable", "Open Sans", sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(p.text, 0, 0)
    ctx.restore()
    return true
  })

  if (fx.flash > 0) {
    ctx.globalAlpha = fx.flash * 0.15
    ctx.fillStyle = CLOUD
    ctx.fillRect(0, 0, geo.width, geo.height)
    fx.flash = Math.max(0, fx.flash - dt / 0.12)
  }
  ctx.restore()
}
