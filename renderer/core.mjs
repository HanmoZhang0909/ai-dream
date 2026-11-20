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

// ---------------------------------------------------------------- protocol v3
// Open-vocabulary expressions: anything can be named, nothing may crash. The
// planner clamps values, resolves unknown vocabulary through a fallback chain,
// enforces the safety envelope and records every degradation.

export const V3_LIMITS = Object.freeze({
  layers: 8,
  layerCount: 6,
  particles: 800,
  animatedElements: 1200,
  blurPx: 96,
  durationMs: 60000,
  flickerHz: 3,
})

export const V3_KNOWN_PRIMITIVES = Object.freeze(['blob', 'ring', 'band', 'spiral', 'lines', 'haze', 'particles', 'macro'])
export const V3_KNOWN_MOTIONS = Object.freeze(['breath', 'drift', 'rotate', 'wobble', 'flicker', 'uneven', 'hold', 'afterglow', 'follow', 'converge', 'split', 'echo'])
export const V3_KNOWN_RELATIONS = Object.freeze(['follow', 'converge', 'split', 'echo'])
/** Direction primitives are visual biases, not emotion categories (open vocabulary degrades). */
export const V3_KNOWN_DIRECTIONS = Object.freeze(['lean', 'reach', 'contract'])
export const V3_KNOWN_MOTION_FIELDS = Object.freeze(['speed', 'amplitude', 'rhythm'])

export const V3_DEFAULT_CAPABILITIES = Object.freeze({
  protocol: 3,
  primitives: V3_KNOWN_PRIMITIVES,
  motions: V3_KNOWN_MOTIONS,
  relations: V3_KNOWN_RELATIONS,
  features: Object.freeze(['variation', 'macros', 'keyframes', 'relationships', 'afterglow']),
  limits: V3_LIMITS,
})

const V3_FAMILY_HINTS = ['ring', 'spiral', 'blob', 'haze', 'particles', 'lines', 'band']
const clamp01 = value => (typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null)
const clampRange = (value, min, max, fallback) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

/** Merge declared capabilities over the defaults (unknown lists fall back). */
export function resolveCapabilities(declared) {
  const source = declared && typeof declared === 'object' ? declared : {}
  const limits = Object.assign({}, V3_LIMITS, source.limits && typeof source.limits === 'object' ? source.limits : {})
  return {
    protocol: Number.isFinite(source.protocol) ? source.protocol : 3,
    primitives: Array.isArray(source.primitives) ? source.primitives : V3_KNOWN_PRIMITIVES,
    motions: Array.isArray(source.motions) ? source.motions : V3_KNOWN_MOTIONS,
    relations: Array.isArray(source.relations) ? source.relations : V3_KNOWN_RELATIONS,
    features: Array.isArray(source.features) ? source.features : V3_DEFAULT_CAPABILITIES.features,
    limits,
  }
}

function guessFamily(name) {
  const text = String(name || '').toLowerCase()
  for (const hint of V3_FAMILY_HINTS) {
    if (text.includes(hint)) return hint
  }
  return 'blob'
}

/** Resolve one primitive through fallback → name similarity → blob. */
export function resolvePrimitive(layer, capabilities, macros, depth = 0) {
  const caps = resolveCapabilities(capabilities)
  const raw = layer && typeof layer.primitive === 'string' ? layer.primitive.trim() : ''
  const notes = []
  const known = primitive => caps.primitives.indexOf(primitive) >= 0
  if (known(raw)) {
    if (raw !== 'macro') return { primitive: raw, notes }
    const name = layer && typeof layer.name === 'string' ? layer.name : ''
    const macro = macros && macros[name]
    if (macro && depth < 2) {
      const inner = resolvePrimitive(macro, caps, macros, depth + 1)
      return { primitive: inner.primitive, notes: inner.notes.concat(inner.primitive !== 'macro' ? [] : [{ reason: 'macro-depth', name }]), macro: macro }
    }
    notes.push({ reason: macro ? 'macro-depth' : 'macro-missing', name })
    const fallback = layer && typeof layer.fallback === 'string' ? layer.fallback : ''
    const resolved = known(fallback) && fallback !== 'macro' ? fallback : guessFamily(name)
    return { primitive: resolved, notes }
  }
  notes.push({ reason: 'unknown-primitive', name: raw })
  const fallback = layer && typeof layer.fallback === 'string' ? layer.fallback : ''
  if (known(fallback) && fallback !== 'macro') {
    notes.push({ reason: 'fallback', from: raw, to: fallback })
    return { primitive: fallback, notes }
  }
  const guessed = guessFamily(raw || (layer && layer.name))
  notes.push({ reason: 'similarity', from: raw, to: guessed })
  return { primitive: guessed, notes }
}

function normalizeMotionValue(primitive, value) {
  if (!value || typeof value !== 'object') return {}
  const out = {}
  if (primitive === 'flicker') {
    out.rate = clampRange(value.rate, 0.5, V3_LIMITS.flickerHz, 1.6)
    out.depth = clampRange(value.depth, 0, 0.4, 0.1)
    return out
  }
  if (primitive === 'hold') {
    out.holdSeconds = clampRange(value.holdSeconds, 0.5, 20, 2)
    return out
  }
  if (primitive === 'afterglow') {
    out.hold = clampRange(value.hold, 0, 10, 0)
    out.decay = clampRange(value.decay, 0.5, 20, 6)
    return out
  }
  if (primitive === 'uneven') {
    out.rate = clampRange(value.rate, 0.1, 4, 0.8)
    out.clusters = clampRange(value.clusters, 2, 5, 3)
    return out
  }
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'number' && Number.isFinite(child)) out[key] = Math.min(4, Math.max(-4, child))
    else if (child && typeof child === 'object') {
      const nested = {}
      for (const [nestedKey, nestedValue] of Object.entries(child)) {
        if (typeof nestedValue === 'number' && Number.isFinite(nestedValue)) nested[nestedKey] = Math.min(4, Math.max(-4, nestedValue))
      }
      out[key] = nested
    }
  }
  return out
}

/** Normalize a motion block: known keys kept and clamped, unknown keys dropped. */
export function normalizeMotionV3(motion, capabilities) {
  const caps = resolveCapabilities(capabilities)
  const notes = []
  const out = {}
  if (!motion || typeof motion !== 'object') return { motion: out, notes }
  for (const [key, value] of Object.entries(motion)) {
    if (V3_KNOWN_MOTION_FIELDS.indexOf(key) >= 0) {
      if (key === 'speed') out.speed = clampRange(value, 0.2, 2, 1)
      else if (key === 'amplitude') out.amplitude = clampRange(value, 0.1, 1, 0.5)
      else if (key === 'rhythm' && typeof value === 'string') out.rhythm = value.slice(0, 24)
      continue
    }
    if (V3_KNOWN_MOTIONS.indexOf(key) < 0 || caps.motions.indexOf(key) < 0) {
      notes.push({ reason: 'unknown-motion', name: key })
      continue
    }
    out[key] = normalizeMotionValue(key, value)
  }
  return { motion: out, notes }
}

/** Normalize keyframes: clamp time, sort, drop unusable frames, require >= 2. */
export function normalizeKeyframesV3(keyframes) {
  const notes = []
  if (!Array.isArray(keyframes)) return { keyframes: null, notes }
  const frames = []
  for (const frame of keyframes.slice(0, 12)) {
    if (!frame || typeof frame !== 'object') continue
    const at = clamp01(frame.at)
    if (at === null) continue
    const values = {}
    if (frame.values && typeof frame.values === 'object') {
      for (const [key, value] of Object.entries(frame.values)) {
        if (typeof value === 'number' && Number.isFinite(value)) values[key] = Math.min(10, Math.max(-10, value))
      }
    }
    const easing = typeof frame.easing === 'string' ? frame.easing.slice(0, 32) : null
    frames.push(easing ? { at, values, easing } : { at, values })
  }
  frames.sort((a, b) => a.at - b.at)
  if (frames.length < 2) notes.push({ reason: 'keyframes-insufficient' })
  return { keyframes: frames.length >= 2 ? frames : null, notes }
}

/** Normalize one layer (resolved primitive, clamped parameters, relations). */
export function normalizeLayerV3(layer, index, capabilities, macros, layerTotal) {
  const caps = resolveCapabilities(capabilities)
  const notes = []
  const source = layer && typeof layer === 'object' ? layer : {}
  const resolved = resolvePrimitive(source, caps, macros)
  notes.push.apply(notes, resolved.notes.map(note => Object.assign({ layer: index }, note)))
  const out = {
    primitive: resolved.primitive,
    paletteSlot: typeof source.paletteSlot === 'string' ? source.paletteSlot : null,
    count: Math.round(clampRange(source.count, 1, V3_LIMITS.layerCount, 1)),
    size: clampRange(source.size, 0, 1, 0.5),
    height: clampRange(source.height, 0, 1, 0.5),
    thickness: clampRange(source.thickness, 0, 1, 0.08),
    softness: clampRange(source.softness, 0, 1, 0.5),
    opacity: clampRange(source.opacity, 0, 1, 0.7),
    angle: clampRange(source.angle, -180, 180, 0),
    offset: [0, 0],
    blend: typeof source.blend === 'string' ? source.blend : 'normal',
    grain: clampRange(source.grain, 0, 1, 0),
    gloss: clampRange(source.gloss, 0, 1, 0),
    direction: null,
    fromMacro: Boolean(resolved.macro),
  }
  if (typeof source.direction === 'string' && source.direction.length > 0) {
    if (V3_KNOWN_DIRECTIONS.indexOf(source.direction) >= 0) {
      out.direction = source.direction
    } else {
      notes.push({ layer: index, reason: 'unknown-direction', name: source.direction.slice(0, 40) })
    }
  }
  if (Array.isArray(source.offset) && source.offset.length === 2) {
    out.offset = [clampRange(source.offset[0], -1, 1, 0), clampRange(source.offset[1], -1, 1, 0)]
  }
  if (source.transform && typeof source.transform === 'object') {
    const transform = {}
    if (Number.isFinite(source.transform.scale)) transform.scale = clampRange(source.transform.scale, 0.05, 4, 1)
    if (Number.isFinite(source.transform.rotate)) transform.rotate = clampRange(source.transform.rotate, -180, 180, 0)
    if (Number.isFinite(source.transform.skew)) transform.skew = clampRange(source.transform.skew, -45, 45, 0)
    if (Array.isArray(source.transform.translate) && source.transform.translate.length === 2) {
      transform.translate = [
        clampRange(source.transform.translate[0], -1, 1, 0),
        clampRange(source.transform.translate[1], -1, 1, 0),
      ]
    }
    out.transform = transform
  }
  if (source.mask && typeof source.mask === 'object') {
    out.mask = {
      type: typeof source.mask.type === 'string' ? source.mask.type.slice(0, 24) : 'radial',
      softness: clampRange(source.mask.softness, 0, 1, 0.5),
      angle: clampRange(source.mask.angle, -180, 180, 0),
    }
  }
  const motion = normalizeMotionV3(source.motion, caps)
  out.motion = motion.motion
  notes.push.apply(notes, motion.notes.map(note => Object.assign({ layer: index }, note)))
  const keyframes = normalizeKeyframesV3(source.keyframes)
  out.keyframes = keyframes.keyframes
  notes.push.apply(notes, keyframes.notes.map(note => Object.assign({ layer: index }, note)))
  if (Array.isArray(source.relations)) {
    out.relations = []
    for (const relation of source.relations.slice(0, 3)) {
      if (!relation || typeof relation !== 'object') continue
      if (V3_KNOWN_RELATIONS.indexOf(relation.type) < 0 || caps.relations.indexOf(relation.type) < 0) {
        notes.push({ layer: index, reason: 'unknown-relation', name: relation.type })
        continue
      }
      const target = Number.isFinite(relation.target) ? Math.round(relation.target) : -1
      if (target < 0 || target >= layerTotal) {
        notes.push({ layer: index, reason: 'relation-target', target })
        continue
      }
      out.relations.push({
        type: relation.type,
        target,
        delay: clampRange(relation.delay, 0, 2, 0),
        strength: clampRange(relation.strength, 0, 1, 0.5),
      })
    }
  }
  return { layer: out, notes }
}

/** Detect the highest tier the expression meaningfully uses. */
export function expressionTier(expression) {
  const source = expression && typeof expression === 'object' ? expression : {}
  if (Array.isArray(source.macros) || (source.macros && typeof source.macros === 'object')) {
    if (Array.isArray(source.layers) && source.layers.some(layer => layer && layer.primitive === 'macro')) return 'L3'
  }
  if (Array.isArray(source.keyframes) && source.keyframes.length >= 2) return 'L3'
  if (Array.isArray(source.layers) && source.layers.length > 0) return 'L2'
  if (typeof source.form === 'string' || (source.motion && typeof source.motion === 'object')) return 'L1'
  return 'L0'
}

/** Minimum guaranteed expression: a visible L0 glow. */
export function degradeToL0(expression) {
  const source = expression && typeof expression === 'object' ? expression : {}
  const palette = source.palette && typeof source.palette === 'object' ? source.palette : {}
  const hex = value => (typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()) ? value.trim().toLowerCase() : null)
  return {
    tier: 'L0',
    name: typeof source.name === 'string' ? source.name.slice(0, 40) : '',
    intensity: clampRange(source.intensity, 0.2, 1, 0.6),
    palette: { base: hex(palette.base) || '#05070c', core: hex(palette.core) || '#cfe0ff' },
    form: 'cloud',
    motion: {},
    layers: [],
    macros: {},
    seed: 0,
    variation: 0,
    afterglow: null,
    keyframes: null,
  }
}

/**
 * Plan one v3 expression against renderer capabilities. Never throws: malformed
 * input degrades to L0, over-budget input is clamped, unknown vocabulary is
 * resolved and recorded. Returns normalized data plus degradation notes.
 */
export function planExpressionV3(expression, capabilities) {
  const caps = resolveCapabilities(capabilities)
  const degradations = []
  try {
    if (!expression || typeof expression !== 'object' || Array.isArray(expression)) {
      return Object.assign(degradeToL0(null), { tierRequested: 'L0', degradations: [{ reason: 'not-an-object' }] })
    }
    const tierRequested = expressionTier(expression)
    const planned = {
      tier: tierRequested,
      name: typeof expression.name === 'string' ? expression.name.slice(0, 40) : '',
      intensity: clampRange(expression.intensity, 0.2, 1, 0.6),
      palette: (() => {
        const source = expression.palette && typeof expression.palette === 'object' ? expression.palette : {}
        const hex = value => (typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()) ? value.trim().toLowerCase() : null)
        const spectrum = Array.isArray(source.spectrum) ? source.spectrum.map(hex).filter(Boolean).slice(0, 4) : []
        return {
          base: hex(source.base) || '#05070c',
          core: hex(source.core) || '#cfe0ff',
          tone: hex(source.tone) || null,
          spectrum,
        }
      })(),
      form: typeof expression.form === 'string' ? expression.form.slice(0, 40) : 'cloud',
      transition: {
        style: expression.transition && typeof expression.transition === 'object'
          && ['soft', 'ripple', 'burst', 'dissolve', 'snap'].indexOf(expression.transition.style) >= 0
          ? expression.transition.style
          : 'soft',
        speed: expression.transition && typeof expression.transition === 'object'
          && ['slow', 'medium', 'fast'].indexOf(expression.transition.speed) >= 0
          ? expression.transition.speed
          : 'medium',
      },
      seed: Number.isFinite(expression.seed) ? Math.max(0, Math.round(expression.seed)) : 0,
      variation: clampRange(expression.variation, 0, 1, 0),
      afterglow: expression.afterglow && typeof expression.afterglow === 'object'
        ? {
          hold: clampRange(expression.afterglow.hold, 0, 10, 0),
          decay: clampRange(expression.afterglow.decay, 0.5, 20, 6),
        }
        : null,
      keyframes: null,
      layers: [],
      macros: {},
    }
    if (!caps.features.includes('variation') && planned.variation > 0) {
      degradations.push({ reason: 'variation-unsupported' })
      planned.variation = 0
    }
    if (planned.afterglow && !caps.features.includes('afterglow')) {
      degradations.push({ reason: 'afterglow-unsupported' })
      planned.afterglow = null
    }
    if (caps.features.includes('macros') && expression.macros && typeof expression.macros === 'object' && !Array.isArray(expression.macros)) {
      for (const [name, macro] of Object.entries(expression.macros).slice(0, 12)) {
        if (!macro || typeof macro !== 'object') continue
        if (typeof name !== 'string' || name.length === 0 || name.length > 40) continue
        const normalized = normalizeLayerV3(macro, 0, caps, {}, 1)
        planned.macros[name] = normalized.layer
      }
    }
    if (Array.isArray(expression.keyframes) && caps.features.includes('keyframes')) {
      const keyframes = normalizeKeyframesV3(expression.keyframes)
      planned.keyframes = keyframes.keyframes
      degradations.push.apply(degradations, keyframes.notes)
    } else if (Array.isArray(expression.keyframes)) {
      degradations.push({ reason: 'keyframes-unsupported' })
    }
    if (Array.isArray(expression.layers) && expression.layers.length > 0) {
      const sorted = expression.layers.slice(0, 12).map((layer, index) => ({ layer, index }))
      sorted.sort((a, b) => {
        const pa = a.layer && Number.isFinite(a.layer.priority) ? a.layer.priority : 5
        const pb = b.layer && Number.isFinite(b.layer.priority) ? b.layer.priority : 5
        return pa === pb ? a.index - b.index : pa - pb
      })
      let kept = sorted
      if (kept.length > caps.limits.layers) {
        degradations.push({ reason: 'layer-limit', from: kept.length, to: caps.limits.layers })
        kept = kept.slice(0, caps.limits.layers)
      }
      let macroUsed = false
      for (const entry of kept) {
        const normalized = normalizeLayerV3(entry.layer, planned.layers.length, caps, planned.macros, kept.length)
        if (normalized.layer.fromMacro) macroUsed = true
        planned.layers.push(normalized.layer)
        degradations.push.apply(degradations, normalized.notes)
      }
      let particles = 0
      for (const layer of planned.layers) {
        if (layer.primitive === 'particles') particles += layer.count
      }
      if (particles > caps.limits.particles) {
        degradations.push({ reason: 'particle-limit', from: particles, to: caps.limits.particles })
        const scale = caps.limits.particles / particles
        for (const layer of planned.layers) {
          if (layer.primitive === 'particles') layer.count = Math.max(1, Math.floor(layer.count * scale))
        }
      }
      const animated = planned.layers.reduce((sum, layer) => sum + (layer.motion && Object.keys(layer.motion).length > 0 ? layer.count : 0), 0)
      if (animated > caps.limits.animatedElements) {
        degradations.push({ reason: 'animated-limit', from: animated, to: caps.limits.animatedElements })
      }
      if (planned.layers.length === 0) {
        return Object.assign(degradeToL0(expression), { tierRequested, degradations })
      }
      planned.tier = planTierFromData(expression, planned, macroUsed)
    } else if (tierRequested === 'L3') {
      planned.tier = 'L3'
    }
    return Object.assign(planned, { tierRequested, degradations })
  } catch (error) {
    return Object.assign(degradeToL0(expression), {
      tierRequested: 'L0',
      degradations: [{ reason: 'planner-exception', message: String(error && error.message || error) }],
    })
  }
}

function planTierFromData(expression, planned, macroUsed) {
  if (macroUsed || (planned.keyframes && planned.keyframes.length >= 2)) return 'L3'
  return 'L2'
}

// ---------------------------------------------------------------- v3 animation
// Pure sampling functions: given a normalized v3 plan and a time offset they
// return bounded transform/opacity values. The client mirrors these functions;
// everything here is deterministic and unit-tested.

export function hashUnit(seed, index) {
  let x = (Math.imul(Math.round(seed || 0) | 0, 374761393) + Math.imul(Math.round(index || 0) | 0, 668265263)) | 0
  x = Math.imul(x ^ (x >>> 13), 1274126177)
  x = (x ^ (x >>> 16)) >>> 0
  return x / 4294967295
}

/** Deterministic per-layer sampling offset in -1..1 (0 when variation is 0). */
export function variationOffset(seed, variation, index) {
  const amount = clampRange(variation, 0, 1, 0)
  return (hashUnit(seed, index) * 2 - 1) * amount
}

/** Easing lookup used by keyframes (unknown names fall back to linear). */
export function easingAt(name, progress) {
  const value = Math.min(1, Math.max(0, typeof progress === 'number' && Number.isFinite(progress) ? progress : 0))
  if (name === 'ease-in') return value * value
  if (name === 'ease-out') return 1 - (1 - value) * (1 - value)
  if (name === 'ease-in-out') return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2
  const steps = /^steps\((\d{1,2})\)$/.exec(typeof name === 'string' ? name : '')
  if (steps) {
    const count = Math.max(1, Math.min(20, Number(steps[1])))
    return Math.floor(value * count) / count
  }
  return value
}

/** Sample keyframes at 0..1 progress; returns numeric values (empty when unusable). */
export function sampleKeyframesV3(keyframes, progress) {
  if (!Array.isArray(keyframes) || keyframes.length < 2) return {}
  const frames = keyframes.filter(frame => frame && Number.isFinite(frame.at)).slice(0, 12)
  if (frames.length < 2) return {}
  const t = clampRange(progress, 0, 1, 0)
  let from = frames[0]
  let to = frames[frames.length - 1]
  for (let index = 0; index < frames.length - 1; index += 1) {
    const a = frames[index]
    const b = frames[index + 1]
    if (t >= a.at && t <= b.at) {
      from = a
      to = b
      break
    }
  }
  const span = to.at - from.at
  const local = span <= 0 ? 0 : easingAt(to.easing, (t - from.at) / span)
  const out = {}
  const keys = new Set(Object.keys(from.values || {}).concat(Object.keys(to.values || {})))
  for (const key of keys) {
    const a = from.values && Number.isFinite(from.values[key]) ? from.values[key] : null
    const b = to.values && Number.isFinite(to.values[key]) ? to.values[key] : null
    if (a === null && b === null) continue
    if (a === null) out[key] = b
    else if (b === null) out[key] = a
    else out[key] = a + (b - a) * local
  }
  return out
}

/**
 * Visual bias of the expressive direction primitives (lean / reach / contract).
 * Pure, bounded, deterministic: `dx`/`dy` are percentages, `rotate` degrees and
 * `scale` a multiplier. Unknown or missing directions are the identity.
 */
export function directionTransformV3(layer) {
  const source = layer && typeof layer === 'object' ? layer : {}
  const angle = clampRange(source.angle, -180, 180, 0)
  const radians = (angle * Math.PI) / 180
  const out = { dx: 0, dy: 0, scale: 1, rotate: 0 }
  if (source.direction === 'lean') {
    out.dx = Math.cos(radians) * 3
    out.dy = Math.sin(radians) * 3
    out.rotate = angle * 0.06
  } else if (source.direction === 'reach') {
    out.dx = Math.cos(radians) * 6
    out.dy = Math.sin(radians) * 6
    out.scale = 1.06
    out.rotate = angle * 0.12
  } else if (source.direction === 'contract') {
    out.dx = -Math.cos(radians) * 2
    out.dy = -Math.sin(radians) * 2
    out.scale = 0.92
    out.rotate = angle * -0.04
  }
  out.dx = Math.max(-10, Math.min(10, out.dx))
  out.dy = Math.max(-10, Math.min(10, out.dy))
  out.scale = Math.max(0.5, Math.min(2, out.scale))
  out.rotate = Math.max(-30, Math.min(30, out.rotate))
  return out
}

/**
 * Sample one motion block at tSeconds. Returns bounded transform/opacity deltas:
 * { dx, dy } in percent, `scale`/`rotate` multipliers/degrees and `opacity` 0..1.
 */
export function sampleMotionV3(motion, tSeconds, options = {}) {
  const source = motion && typeof motion === 'object' ? motion : {}
  const t = Math.max(0, Number.isFinite(tSeconds) ? tSeconds : 0)
  const reduced = options.reducedMotion === true
  const base = { dx: 0, dy: 0, scale: 1, rotate: 0, opacity: 1 }
  if (reduced) return base
  const hold = source.hold && typeof source.hold === 'object' ? clampRange(source.hold.holdSeconds, 0.5, 20, 2) : 0
  if (hold > 0 && t < hold) return base
  const tau = 2 * Math.PI
  let scale = 1
  let rotate = 0
  let dx = 0
  let dy = 0
  let opacity = 1
  if (source.breath && typeof source.breath === 'object') {
    const rate = clampRange(source.breath.rate, 0.05, 2, 0.3)
    const depth = clampRange(source.breath.depth, 0, 0.3, 0.06)
    scale *= 1 + depth * Math.sin(tau * rate * t)
    opacity *= 1 - depth * 0.35 * (0.5 + 0.5 * Math.sin(tau * rate * t + Math.PI))
  }
  if (source.drift && typeof source.drift === 'object') {
    const x = clampRange(source.drift.x, -0.3, 0.3, 0.05)
    const y = clampRange(source.drift.y, -0.3, 0.3, 0)
    const speed = clampRange(source.drift.speed, 0, 2, 0.4)
    dx += x * 100 * Math.sin(tau * (0.05 + 0.05 * speed) * t)
    dy += y * 100 * Math.sin(tau * (0.04 + 0.04 * speed) * t + 0.7)
  }
  if (source.rotate && typeof source.rotate === 'object') {
    rotate += clampRange(source.rotate.speed, -1, 1, 0.1) * 60 * t
  }
  if (source.wobble && typeof source.wobble === 'object') {
    const amplitude = clampRange(source.wobble.amplitude, 0, 0.3, 0.08)
    const frequency = clampRange(source.wobble.frequency, 0.1, 2, 0.4)
    scale *= 1 + amplitude * Math.sin(tau * frequency * t)
    dx += amplitude * 12 * Math.cos(tau * frequency * t)
  }
  if (source.flicker && typeof source.flicker === 'object') {
    const rate = clampRange(source.flicker.rate, 0.5, V3_LIMITS.flickerHz, 1.6)
    const depth = clampRange(source.flicker.depth, 0, 0.4, 0.1)
    opacity *= 1 - depth * (0.5 + 0.5 * Math.sin(tau * rate * t))
  }
  if (source.uneven && typeof source.uneven === 'object') {
    const rate = clampRange(source.uneven.rate, 0.1, 4, 0.8)
    const clusters = clampRange(source.uneven.clusters, 2, 5, 3)
    const envelope = Math.sin(tau * rate * t + Math.sin(tau * 0.23 * t) * clusters)
    opacity *= 1 - 0.12 * (0.5 + 0.5 * envelope)
    scale *= 1 + 0.03 * envelope
  }
  return {
    dx: Math.max(-80, Math.min(80, dx)),
    dy: Math.max(-80, Math.min(80, dy)),
    scale: Math.max(0.2, Math.min(3, scale)),
    rotate: Math.max(-720, Math.min(720, rotate)),
    opacity: Math.max(0, Math.min(1, opacity)),
  }
}

/**
 * Apply layer relations (follow/converge/split/echo) on top of their own motion.
 * Deterministic; missing targets are ignored (degradation already recorded).
 */
export function applyRelationsV3(layers, tSeconds, options = {}) {
  const list = Array.isArray(layers) ? layers : []
  const own = list.map((layer, index) => sampleMotionV3(layer && layer.motion, tSeconds, options))
  const result = own.map(item => Object.assign({}, item))
  list.forEach((layer, index) => {
    if (!layer || !Array.isArray(layer.relations)) return
    layer.relations.forEach(relation => {
      if (!relation || !Number.isFinite(relation.target) || relation.target < 0 || relation.target >= list.length) return
      if (relation.target === index) return
      const target = own[relation.target]
      const strength = clampRange(relation.strength, 0, 1, 0.5)
      const delay = clampRange(relation.delay, 0, 2, 0)
      const delayed = delay > 0 ? sampleMotionV3(list[relation.target].motion, Math.max(0, tSeconds - delay), options) : target
      const output = result[index]
      if (relation.type === 'follow') {
        output.dx += delayed.dx * strength
        output.dy += delayed.dy * strength
      } else if (relation.type === 'converge') {
        output.dx -= delayed.dx * strength * 0.5
        output.dy -= delayed.dy * strength * 0.5
        output.scale *= 1 - strength * 0.05
      } else if (relation.type === 'split') {
        output.dx -= delayed.dx * strength
        output.dy -= delayed.dy * strength
      } else if (relation.type === 'echo') {
        output.dx += delayed.dx * strength * 0.6
        output.dy += delayed.dy * strength * 0.6
        output.opacity *= 0.65 + 0.35 * strength
      } else {
        return
      }
      output.dx = Math.max(-80, Math.min(80, output.dx))
      output.dy = Math.max(-80, Math.min(80, output.dy))
      output.scale = Math.max(0.2, Math.min(3, output.scale))
      output.opacity = Math.max(0, Math.min(1, output.opacity))
    })
  })
  return result
}

/** Copy for the empty/waiting state (no expression yet). */export const EMPTY_STATE = Object.freeze({
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
