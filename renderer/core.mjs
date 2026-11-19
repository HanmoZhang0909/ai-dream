/**
 * Portable AI Dream renderer core (no DOM, no build).
 *
 * This is the host-independent half of the renderer, intended to be reused by an
 * MCP App iframe renderer later. The DSH client keeps its own copy inside the
 * single-file `client.js` (zero-build constraint); this module is the canonical
 * portable source and is covered by `scripts/check-renderer-core.mjs`.
 */

export const FORMS = ['cloud', 'ring', 'streak', 'spiral', 'rain', 'fog']
export const RHYTHMS = ['steady', 'breathing', 'uneven']
export const TRANSITION_STYLES = ['soft', 'ripple', 'burst', 'dissolve', 'snap']
export const TRANSITION_SPEEDS = { slow: 2400, medium: 1100, fast: 480 }
export const PATTERN_BLUR = { cloud: 46, ring: 30, streak: 34, spiral: 52, rain: 26, fog: 72 }

/** Chinese form labels for the UI (enum ids stay protocol-internal). */
export const FORM_LABELS = Object.freeze({
  cloud: '云',
  ring: '环',
  streak: '带',
  spiral: '旋',
  rain: '雨',
  fog: '雾',
})

/** User-facing label for one form, or null when the form is unknown/absent. */
export function formLabel(form) {
  return typeof form === 'string' && Object.prototype.hasOwnProperty.call(FORM_LABELS, form)
    ? FORM_LABELS[form]
    : null
}

/** Built-in fallback palettes (mirrors `MOODS` in client.js). */
export const BUILTIN_PALETTES = {
  neutral: { base: '#05070c', tint: '#5f7bb8', spectrum: ['#dbe8ff', '#8fb0d9', '#5f7bb8', '#c9d6ff'], core: '#eef4ff' },
  calm: { base: '#03070c', tint: '#2f9fb5', spectrum: ['#5fd0e0', '#2f8fa6', '#4aa8ff', '#8ee6d8'], core: '#e6fbff' },
  curious: { base: '#0a0702', tint: '#d08a1e', spectrum: ['#ffc247', '#f2b93f', '#ff9f43', '#ffe9a8'], core: '#fff6dd' },
  uneasy: { base: '#0b0710', tint: '#7a4f9e', spectrum: ['#a06bb0', '#6a4b8f', '#d9534f', '#c9a3e0'], core: '#f2e6ff' },
  warm: { base: '#100705', tint: '#c2563a', spectrum: ['#ff9a6b', '#ff7aa8', '#d9534f', '#ffd9c5'], core: '#fff0e8' },
  tired: { base: '#0a0c0f', tint: '#5b6672', spectrum: ['#8f98a6', '#6b7482', '#b9c2cc', '#4a5361'], core: '#eef2f6' },
  excited: { base: '#120518', tint: '#b2308f', spectrum: ['#ff4f86', '#7d63ff', '#66e0ff', '#ffb02e'], core: '#fff0f8' },
  focused: { base: '#030712', tint: '#3b6fe0', spectrum: ['#6fa8ff', '#3b6fe0', '#1d3a8a', '#b7d4ff'], core: '#eaf2ff' },
  amused: { base: '#0d0710', tint: '#c2557e', spectrum: ['#ffb3c9', '#aef0d2', '#ffe6a3', '#ff9ec4'], core: '#fff5fa' },
}

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function clamp(value, min, max, fallback) {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(max, Math.max(min, number))
}

export function pick(value, allowed, fallback) {
  return allowed.indexOf(value) >= 0 ? value : fallback
}

export function cut(value, max) {
  if (typeof value !== 'string') return ''
  const text = value.trim()
  return text.length > max ? text.slice(0, max) : text
}

export function hexColor(value) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return HEX_COLOR.test(text) ? text.toLowerCase() : null
}

export function hexToRgb(hex) {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? value.split('').map(part => part + part).join('') : value
  const number = parseInt(full, 16)
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255]
}

export function mixHex(a, b, amount) {
  const left = hexToRgb(a)
  const right = hexToRgb(b)
  const to = value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
  return '#' + to(left[0] + (right[0] - left[0]) * amount)
    + to(left[1] + (right[1] - left[1]) * amount)
    + to(left[2] + (right[2] - left[2]) * amount)
}

/** Resolve the palette of one expression: AI colours first, built-in fallback otherwise. */
export function resolveColors(raw, moodKey) {
  const base = BUILTIN_PALETTES[moodKey] || BUILTIN_PALETTES.neutral
  const source = raw && raw.palette && typeof raw.palette === 'object' ? raw.palette : {}
  const custom = {
    base: hexColor(source.base),
    core: hexColor(source.core),
    tone: hexColor(source.tone),
    spectrum: Array.isArray(source.spectrum) ? source.spectrum.map(hexColor).filter(Boolean).slice(0, 4) : [],
  }
  const anyCustom = custom.base || custom.core || custom.tone || custom.spectrum.length > 0
  if (!anyCustom) {
    return { base: base.base, tint: base.tint, spectrum: base.spectrum.slice(), core: base.core }
  }
  const core = custom.core || custom.spectrum[0] || base.core
  const tone = custom.tone || custom.spectrum[1] || base.spectrum[1]
  return {
    base: custom.base || base.base,
    tint: custom.tone || base.tint,
    core,
    spectrum: [
      custom.spectrum[0] || core,
      custom.spectrum[1] || tone,
      custom.spectrum[2] || custom.spectrum[0] || tone,
      custom.spectrum[3] || custom.spectrum[1] || core,
    ],
  }
}

/** Normalize one mood expression into the renderer model (protocol v2 rules). */
export function normalizeMood(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const name = cut(source.name, 40)
  const moodKey = Object.prototype.hasOwnProperty.call(BUILTIN_PALETTES, source.mood)
    ? source.mood
    : Object.prototype.hasOwnProperty.call(BUILTIN_PALETTES, name) ? name : 'neutral'
  const transition = source.transition && typeof source.transition === 'object' ? source.transition : {}
  const nebula = source.nebula && typeof source.nebula === 'object' ? source.nebula : {}
  const orb = source.orb && typeof source.orb === 'object' ? source.orb : {}
  const motion = source.motion && typeof source.motion === 'object' ? source.motion : {}
  const form = typeof source.form === 'string' && FORMS.indexOf(source.form) >= 0 ? source.form : null
  return {
    kind: 'mood',
    name,
    mood: moodKey,
    colors: resolveColors(source, moodKey),
    intensity: clamp(source.intensity, 0.2, 1, 0.6),
    motion: {
      speed: clamp(motion.speed, 0.2, 2, 1),
      amplitude: clamp(motion.amplitude, 0.1, 1, 0.5),
      rhythm: pick(motion.rhythm, RHYTHMS, 'breathing'),
    },
    transition: {
      style: pick(transition.style, TRANSITION_STYLES, 'soft'),
      speed: pick(transition.speed, Object.keys(TRANSITION_SPEEDS), 'medium'),
    },
    nebula: {
      pattern: pick(form || nebula.pattern, FORMS, 'spiral'),
      density: clamp(nebula.density, 0.1, 1, 0.6),
      activity: clamp(nebula.activity, 0.1, 1, 0.5),
    },
    orb: {
      size: clamp(orb.size, 0.1, 1, 0.5),
      pulse: pick(orb.pulse, ['steady', 'breathe', 'flicker'], 'breathe'),
      tone: pick(orb.tone, ['warm', 'cool', 'neutral', 'bright'], 'neutral'),
    },
  }
}

/** Calibration (client-side intensity bias) bounds and step sizes. */
export const CALIBRATION = Object.freeze({
  minBias: -0.4,
  maxBias: 0.4,
  stepLike: -0.15,
  stepStronger: 0.08,
  stepLighter: -0.08,
  noteMs: 1600,
})

/** Next clamped bias value after one calibration click. */
export function nextCalibrationBias(bias, delta) {
  const current = typeof bias === 'number' && Number.isFinite(bias) ? bias : 0
  const step = typeof delta === 'number' && Number.isFinite(delta) ? delta : 0
  return Math.round(Math.min(CALIBRATION.maxBias, Math.max(CALIBRATION.minBias, current + step)) * 100) / 100
}

/** Short feedback label for one calibration click (pure, so it is unit-tested). */
export function calibrationNoteFor(bias, delta) {
  const next = nextCalibrationBias(bias, delta)
  if (Math.abs(next) >= CALIBRATION.maxBias - 1e-9) return '已到上限 · 只影响画面'
  if (delta > 0) return '更亮了 · 只影响画面'
  return '更淡了 · 只影响画面'
}

/**
 * Copy-ready model-side calibration snippet derived from the canvas bias.
 * Pasting it into ~/.dsh/storages/dsh-ai-dream/calibration.json lets the AI
 * learn the same preference (v1.10 channel).
 */
export function calibrationSnippet(bias) {
  const value = typeof bias === 'number' && Number.isFinite(bias) ? bias : 0
  const rounded = Math.round(Math.min(CALIBRATION.maxBias, Math.max(CALIBRATION.minBias, value)) * 100) / 100
  const intensity = Math.round(Math.min(1, Math.max(0.2, 0.6 + rounded)) * 100) / 100
  const tone = rounded === 0 ? null : rounded > 0 ? '画布偏好更亮/更强' : '画布偏好更淡/更弱'
  return {
    bias: rounded,
    intensity,
    tone,
    json: tone ? JSON.stringify({ tone, intensity }) : null,
  }
}

/** Copy for the empty/waiting state (no expression yet). */
export const EMPTY_STATE = Object.freeze({
  title: '还没有感受可以成形状',
  hint: '发送消息后画布会亮起',
  intensity: 0.2,
})

/** Whether the canvas should show the waiting state instead of a default glow. */
export function isEmptyState(hasExpression) {
  return !hasExpression
}

/** Maximum chips shown by the signature viewer. */
export const SIGNATURE_VIEW_LIMIT = 12

/**
 * Build the chips for the "emotion signature" viewer: name + core colour.
 * Accepts signature entries with or without palettes and always returns stable,
 * de-duplicated rows for the UI.
 */
export function signatureChips(entries, limit = SIGNATURE_VIEW_LIMIT) {
  if (!Array.isArray(entries)) return []
  const max = Number.isInteger(limit) && limit > 0 ? limit : SIGNATURE_VIEW_LIMIT
  const seen = new Set()
  const chips = []
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const name = typeof entry.name === 'string' ? entry.name.trim() : ''
    if (!name || seen.has(name)) continue
    seen.add(name)
    const palette = entry.palette && typeof entry.palette === 'object' ? entry.palette : {}
    const core = typeof palette.core === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(palette.core.trim())
      ? palette.core.trim().toLowerCase()
      : '#9a7aa6'
    const chip = { name, core }
    const label = formLabel(entry.form)
    if (label) chip.form = label
    chips.push(chip)
    if (chips.length >= max) break
  }
  return chips
}

/** Marker prefix for a streaming (unterminated) expression in the canvas feed. */
export const PARTIAL_MARK = '\u0002'

/**
 * Find a trailing, still-open ```canvas fence in assistant text.
 * Returns the partial body (without the opening fence line), or null.
 */
export function extractPartialCanvas(text) {
  if (typeof text !== 'string' || text.length === 0) return null
  const match = /^ {0,3}```canvas[^\n]*\n([\s\S]*)$/m.exec(text)
  if (!match) return null
  const body = match[1]
  if (/^ {0,3}```/m.test(body)) return null
  return body.slice(0, 20000)
}

/**
 * Best-effort parse of a partial mood block so the canvas can follow the model
 * while it is still writing. Returns raw fields or null when nothing usable.
 */
export function parsePartialMood(code) {
  if (typeof code !== 'string' || code.trim().length === 0) return null
  const nameMatch = /"name"\s*:\s*"([^"\\]{1,40})"/.exec(code)
  const intensityMatch = /"intensity"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(code)
  const formMatch = /"form"\s*:\s*"([a-z]+)"/.exec(code)
  const moodMatch = /"mood"\s*:\s*"([a-z]{1,20})"/.exec(code)
  const palette = {}
  for (const key of ['base', 'core', 'tone']) {
    const match = new RegExp('"' + key + '"\\s*:\\s*"(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})"').exec(code)
    if (match) palette[key] = match[1].toLowerCase()
  }
  const hexes = Array.from(code.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g))
    .map(match => '#' + match[1].toLowerCase())
    .slice(0, 4)
  if (!palette.core && hexes.length > 0) palette.core = hexes[0]
  if (!palette.base && hexes.length > 1) palette.base = hexes[1]
  const found = Boolean(nameMatch || intensityMatch || formMatch || moodMatch || palette.core || palette.base)
  if (!found) return null
  const partial = { kind: 'mood' }
  if (nameMatch) partial.name = nameMatch[1]
  if (moodMatch) partial.mood = moodMatch[1]
  if (intensityMatch) partial.intensity = Number(intensityMatch[1])
  if (formMatch && FORMS.indexOf(formMatch[1]) >= 0) partial.form = formMatch[1]
  if (palette.core || palette.base || palette.tone) partial.palette = palette
  return partial
}
/** Move focus between the timeline dots without changing the replay target. */export function nextDotTurn(turns, currentTurn, direction) {
  if (!Array.isArray(turns) || turns.length === 0) return null
  const index = turns.indexOf(currentTurn)
  if (index < 0) return turns[0]
  if (direction === 'home') return turns[0]
  if (direction === 'end') return turns[turns.length - 1]
  const step = direction === 'previous' ? -1 : 1
  const next = index + step
  if (next < 0 || next >= turns.length) return currentTurn
  return turns[next]
}

/** Interpolation time constant: how fast the glow glides to a new target. */
export function tauFor(speed, style) {
  const base = speed === 'slow' ? 1600 : speed === 'fast' ? 380 : 900
  const factor = style === 'dissolve' ? 1.4 : style === 'burst' ? 0.45 : style === 'ripple' ? 0.9 : 1.1
  return style === 'snap' ? 0 : base * factor
}

/** DOM selector the client uses to find the sentinel of one turn. */
export function sentinelSelector(turn) {
  return '[data-ai-dream-sentinel="' + String(turn) + '"]'
}

/**
 * Bottom-stack layout invariants (mirrors the client's inline styles).
 * Encoded here so the overlap / hit-target bug class is testable without a browser.
 */
export const TIMELINE_LAYOUT = Object.freeze({
  bottomOffset: 10,
  stackGap: 7,
  hintReservedHeight: 24,
  dotHitSize: 24,
  dotVisualSize: 11,
  dotGap: 2,
  nearBottomThreshold: 48,
})

/**
 * Vertical rectangles of the bottom stack, measured from the container's bottom
 * edge (bottom-up). Rows must never overlap and dot hit targets must stay at
 * least 24px, which the unit tests assert.
 */
export function timelineRowRects(options = {}) {
  const layout = TIMELINE_LAYOUT
  const gap = options.gap ?? layout.stackGap
  const hintHeight = options.hasHint === false ? 0 : (options.hintHeight ?? layout.hintReservedHeight)
  const dotHeight = options.dotCount > 0 ? (options.dotHitSize ?? layout.dotHitSize) : 0
  const controlsHeight = options.hasControls === false ? 0 : (options.controlsHeight ?? 22)
  const rows = []
  let cursor = options.bottomOffset ?? layout.bottomOffset
  const push = (id, height) => {
    if (height <= 0) return
    rows.push({ id, bottom: cursor, top: cursor + height, height })
    cursor += height + gap
  }
  push('controls', controlsHeight)
  push('dots', dotHeight)
  push('hint', hintHeight)
  return rows
}

/**
 * Whether the canvas shows a historical turn instead of the newest expression.
 * Replay needs a numeric viewport turn below the newest expressed turn.
 */
export function inReplayMode(topTurn, latestTurn, replayEnabled = true) {
  if (replayEnabled === false) return false
  if (typeof topTurn !== 'number' || typeof latestTurn !== 'number') return false
  return topTurn < latestTurn
}

/** Build the mini emotion timeline dots: the newest expressed turns, ascending. */
export function buildTimelineDots(turnModels, options = {}) {
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 8
  if (!turnModels || typeof turnModels.keys !== 'function' || typeof turnModels.get !== 'function') return []
  return Array.from(turnModels.keys())
    .filter(turn => typeof turn === 'number' && Number.isFinite(turn))
    .sort((a, b) => a - b)
    .slice(-limit)
    .map(turn => {
      const model = turnModels.get(turn)
      const core = model && model.colors && typeof model.colors.core === 'string' ? model.colors.core : '#9a7aa6'
      return { turn, core }
    })
}

/** Numeric target the rAF engine interpolates towards (same shape as client.js). */
export function targetFrom(model) {
  const palette = model.colors || BUILTIN_PALETTES[model.mood] || BUILTIN_PALETTES.neutral
  const intensity = model.intensity == null ? 0.6 : model.intensity
  const nebula = model.nebula || { pattern: 'spiral', density: 0.6, activity: 0.5 }
  const orb = model.orb || { size: 0.5, pulse: 'breathe', tone: 'neutral' }
  const transition = model.transition || { style: 'soft', speed: 'medium' }
  const motion = model.motion || { speed: 1, amplitude: 0.5 }
  const toneColor = orb.tone === 'warm' ? '#ff9a6b'
    : orb.tone === 'cool' ? '#66d8ff'
      : orb.tone === 'bright' ? '#ffffff'
        : palette.core
  return {
    c0: hexToRgb(palette.core),
    c1: hexToRgb(toneColor),
    c2: hexToRgb(palette.spectrum[1]),
    c3: hexToRgb(palette.spectrum[0]),
    c4: hexToRgb(mixHex(palette.tint, palette.base, 0.88)),
    c5: hexToRgb(palette.base),
    w: 44 + orb.size * 54,
    px: 230 + orb.size * 380,
    h: 26 + intensity * 12,
    op: 0.6 + intensity * 0.3,
    blur: PATTERN_BLUR[nebula.pattern] || 46,
    rot: nebula.pattern === 'streak' ? -16 : 0,
    intensity,
    pattern: nebula.pattern,
    pulseSpeed: (orb.pulse === 'flicker' ? 5.2 : orb.pulse === 'steady' ? 0.5 : 2.2) * motion.speed,
    pulseAmp: (orb.pulse === 'steady' ? 0.012 : orb.pulse === 'flicker' ? 0.05 : 0.03 * (0.5 + intensity))
      * (0.5 + motion.amplitude),
    spin: (12 - intensity * 4) * motion.speed,
    style: transition.style,
    speed: transition.speed,
  }
}
