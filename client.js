/**
 * Client half of the AI canvas bundle (zero-build lazy-CJS factory).
 *
 * Registers:
 *  - a right-sidebar tab type `ai-canvas` plus its body,
 *  - the guide card that opens that tab,
 *  - a Markdown fence layer for the `canvas` language that replaces the raw
 *    JSON with a compact, clickable pill in the conversation.
 *
 * The body reads the latest ```canvas fence out of the live Chat snapshot and
 * renders it as an SVG diagram or a card grid. No durable state.
 */
window.__ModuleLoader__.load({
  id: 'dsh-ai-dream',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PKG = 'dsh-ai-dream'
    const KIND = 'ai-canvas'
    const NAME = 'Dream'

    const MAX_NODES = 10
    const MAX_EDGES = 14
    const MAX_CARDS = 6
    const TONES = new Set(['default', 'accent', 'warn', 'good'])

    /** Default expression when the assistant has not expressed anything yet. */
    const MOOD_DEFAULT = {
      kind: 'mood',
      mood: 'neutral',
      intensity: 0.35,
      transition: { style: 'soft', speed: 'medium' },
      nebula: { pattern: 'spiral', density: 0.55, activity: 0.45 },
      orb: { size: 0.5, pulse: 'breathe', tone: 'neutral' },
      neurons: [],
    }

    /** Mood = the subconscious background emotion: ambient tint + flowing spectrum. */
    const MOODS = {
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

    /** How each mood drifts: duration factor and easing. */
    const MOTION = {
      neutral: { speed: 1.0, timing: 'ease-in-out' },
      calm: { speed: 1.3, timing: 'ease-in-out' },
      curious: { speed: 0.8, timing: 'ease-in-out' },
      uneasy: { speed: 0.45, timing: 'steps(2, end)' },
      warm: { speed: 1.0, timing: 'ease-in-out' },
      tired: { speed: 1.8, timing: 'ease-in-out' },
      excited: { speed: 0.5, timing: 'ease-in-out' },
      focused: { speed: 1.2, timing: 'ease-in-out' },
      amused: { speed: 0.7, timing: 'ease-in-out' },
    }

    const TRANSITION_STYLES = ['soft', 'ripple', 'burst', 'dissolve', 'snap']
    const TRANSITION_SPEEDS = { slow: 2400, medium: 1100, fast: 480 }
    const NEBULA_PATTERNS = ['spiral', 'ring', 'cloud', 'streak']
    const ORB_PULSES = ['steady', 'breathe', 'flicker']
    const ORB_TONES = ['warm', 'cool', 'neutral', 'bright']

    function clamp(value, min, max, fallback) {
      const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback
      return Math.min(max, Math.max(min, number))
    }

    function pick(value, allowed, fallback) {
      return allowed.indexOf(value) >= 0 ? value : fallback
    }

    const FONT = 'inherit'
    const EDGE = 'var(--dsw-alias-border-l4, #b6b6b6)'
    const NODE_FILL = 'var(--dsw-alias-bg-layer-1, #ffffff)'
    const NODE_STROKE = 'var(--dsw-alias-border-l2, #d9d9d9)'
    const LABEL = 'var(--dsw-alias-label-primary, #1a1a1a)'
    const LABEL_2 = 'var(--dsw-alias-label-secondary, #555)'
    const CAPTION = 'var(--dsw-alias-label-caption, #aaa)'
    const BG = 'var(--dsw-alias-bg-base, #fff)'
    const BORDER = 'var(--dsw-alias-border-l2, #e0e0e0)'
    const LAYER_BG = 'var(--dsw-alias-bg-layer-1, #fff)'
    const ACCENT = 'var(--dsw-alias-state-business-primary, #4c8dff)'
    const WARN = 'var(--dsw-alias-state-warn-primary, #e8a020)'
    const GOOD = 'var(--dsw-alias-state-success-primary, var(--dsw-alias-state-business-primary, #3aa76d))'

    /** Set in `apply`; lets the conversation pill open the sidebar tab. */
    let openCanvas = () => {}

    // ---------------------------------------------------------------- parsing

    function cut(value, max) {
      if (typeof value !== 'string') return ''
      const text = value.trim()
      if (!text) return ''
      return text.length > max ? text.slice(0, max - 1) + '…' : text
    }

    function toneOf(value) {
      return TONES.has(value) ? value : 'default'
    }

    const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

    function hexColor(value) {
      if (typeof value !== 'string') return null
      const text = value.trim()
      return HEX_COLOR.test(text) ? text.toLowerCase() : null
    }

    /**
     * Resolve the palette of one expression (protocol v2):
     * AI-authored colours take precedence, the built-in mood palette is the fallback.
     */
    function resolveColors(raw, moodKey) {
      const base = MOODS[moodKey] || MOODS.neutral
      const source = raw.palette && typeof raw.palette === 'object' ? raw.palette : {}
      const custom = {
        base: hexColor(source.base),
        core: hexColor(source.core),
        tone: hexColor(source.tone),
        spectrum: Array.isArray(source.spectrum)
          ? source.spectrum.map(hexColor).filter(Boolean).slice(0, 4)
          : [],
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

    function normalize(raw) {
      if (!raw || typeof raw !== 'object') return null
      const kind = raw.kind
      const title = cut(raw.title, 48)
      if (kind === 'diagram') {
        const source = Array.isArray(raw.nodes) ? raw.nodes : []
        const nodes = []
        const known = new Set()
        for (const item of source) {
          if (nodes.length >= MAX_NODES) break
          if (!item || typeof item !== 'object') continue
          const id = cut(item.id, 32)
          if (!id || known.has(id)) continue
          known.add(id)
          nodes.push({
            id,
            label: cut(item.label, 40) || id,
            detail: cut(item.detail, 120),
            tone: toneOf(item.tone),
          })
        }
        if (!nodes.length) return null
        const edges = []
        if (Array.isArray(raw.edges)) {
          for (const item of raw.edges) {
            if (edges.length >= MAX_EDGES) break
            if (!item || typeof item !== 'object') continue
            const from = cut(item.from, 32)
            const to = cut(item.to, 32)
            if (!known.has(from) || !known.has(to) || from === to) continue
            edges.push({ from, to })
          }
        }
        return { kind, title, nodes, edges }
      }
      if (kind === 'mood') {
        const name = cut(raw.name, 40)
        const moodKey = Object.prototype.hasOwnProperty.call(MOODS, raw.mood)
          ? raw.mood
          : Object.prototype.hasOwnProperty.call(MOODS, name) ? name : 'neutral'
        const transition = raw.transition && typeof raw.transition === 'object' ? raw.transition : {}
        const nebula = raw.nebula && typeof raw.nebula === 'object' ? raw.nebula : {}
        const orb = raw.orb && typeof raw.orb === 'object' ? raw.orb : {}
        const motion = raw.motion && typeof raw.motion === 'object' ? raw.motion : {}
        const form = typeof raw.form === 'string' && NEBULA_PATTERNS.indexOf(raw.form) >= 0 ? raw.form : null
        return {
          kind,
          name,
          mood: moodKey,
          colors: resolveColors(raw, moodKey),
          intensity: clamp(raw.intensity, 0.2, 1, 0.6),
          motion: {
            speed: clamp(motion.speed, 0.2, 2, 1),
            amplitude: clamp(motion.amplitude, 0.1, 1, 0.5),
          },
          transition: {
            style: pick(transition.style, TRANSITION_STYLES, 'soft'),
            speed: pick(transition.speed, Object.keys(TRANSITION_SPEEDS), 'medium'),
          },
          nebula: {
            pattern: pick(form || nebula.pattern, NEBULA_PATTERNS, 'spiral'),
            density: clamp(nebula.density, 0.1, 1, 0.6),
            activity: clamp(nebula.activity, 0.1, 1, 0.5),
          },
          orb: {
            size: clamp(orb.size, 0.1, 1, 0.5),
            pulse: pick(orb.pulse, ORB_PULSES, 'breathe'),
            tone: pick(orb.tone, ORB_TONES, 'neutral'),
          },
        }
      }
      if (kind === 'cards') {
        const source = Array.isArray(raw.cards) ? raw.cards : []
        const cards = []
        for (const item of source) {
          if (cards.length >= MAX_CARDS) break
          if (!item || typeof item !== 'object') continue
          cards.push({
            title: cut(item.title, 48) || '—',
            body: cut(item.body, 200),
            tone: toneOf(item.tone),
          })
        }
        return cards.length ? { kind, title, cards } : null
      }
      return null
    }

    function parseCanvas(code) {
      if (typeof code !== 'string' || !code.trim()) return null
      const body = code.trim()
      let parsed
      try {
        parsed = JSON.parse(body)
      } catch {
        const match = body.match(/\{[\s\S]*\}/)
        if (!match) return null
        try {
          parsed = JSON.parse(match[0])
        } catch {
          return null
        }
      }
      return normalize(parsed)
    }

    // ------------------------------------------------------------- extraction

    // A fence only counts when it opens at the start of a line (Markdown rule):
    // inline mentions like "emit a ```canvas block" must not match.
    const FENCE = /^ {0,3}```canvas[^\n]*\n([\s\S]*?)^ {0,3}```/gm

    function lastCanvasFence(text) {
      if (typeof text !== 'string' || text.indexOf('canvas') < 0) return null
      let found = null
      let match
      FENCE.lastIndex = 0
      while ((match = FENCE.exec(text)) !== null) found = match[1]
      return found
    }

    function blocksText(blocks) {
      if (!Array.isArray(blocks)) return ''
      let out = ''
      for (const block of blocks) {
        if (block && block.kind === 'text' && typeof block.text === 'string') out += block.text + '\n'
      }
      return out
    }

    /**
     * Selector: the newest ```canvas fence anywhere in the loaded transcript.
     * Walks the immutable order backwards and stops at the first hit, so a
     * streaming session costs one pass over the newest step, not the transcript.
     */
    function latestCanvasCode(snapshot) {
      if (!snapshot) return null

      const partial = snapshot.legacy && snapshot.legacy.partial
      if (partial) {
        const streaming = lastCanvasFence(blocksText(partial.blocks))
        if (streaming) return streaming
      }

      const store = snapshot.nodes
      const order = snapshot.order
      if (store && Array.isArray(order)) {
        for (let index = order.length - 1; index >= 0; index -= 1) {
          const node = store.get(order[index])
          if (!node || node.kind !== 'assistant-step' || !node.data) continue
          const code = lastCanvasFence(blocksText(node.data.blocks))
          if (code) return code
        }
      }

      const legacyNodes = snapshot.legacy && snapshot.legacy.nodes
      if (Array.isArray(legacyNodes)) {
        for (let index = legacyNodes.length - 1; index >= 0; index -= 1) {
          const node = legacyNodes[index]
          if (!node || node.kind !== 'assistant') continue
          const code = lastCanvasFence(blocksText(node.blocks))
          if (code) return code
        }
      }

      return null
    }

    // ---------------------------------------------------------------- layout

    const NODE_W = 168
    const NODE_H = 58
    const GAP_X = 26
    const GAP_Y = 54

    function layoutDiagram(nodes, edges) {
      const ids = nodes.map(node => node.id)
      const known = new Set(ids)
      const outgoing = new Map(ids.map(id => [id, []]))
      const indegree = new Map(ids.map(id => [id, 0]))
      for (const edge of edges) {
        if (!known.has(edge.from) || !known.has(edge.to)) continue
        outgoing.get(edge.from).push(edge.to)
        indegree.set(edge.to, indegree.get(edge.to) + 1)
      }

      const depth = new Map(ids.map(id => [id, 0]))
      const queue = ids.filter(id => indegree.get(id) === 0)
      for (let head = 0; head < queue.length; head += 1) {
        const current = queue[head]
        for (const next of outgoing.get(current)) {
          depth.set(next, Math.max(depth.get(next), depth.get(current) + 1))
          indegree.set(next, indegree.get(next) - 1)
          if (indegree.get(next) === 0) queue.push(next)
        }
      }

      const layers = []
      for (const node of nodes) {
        const level = depth.get(node.id) || 0
        ;(layers[level] || (layers[level] = [])).push(node.id)
      }
      for (let index = 0; index < layers.length; index += 1) {
        if (!layers[index]) layers[index] = []
      }

      const widest = Math.max(1, ...layers.map(layer => layer.length))
      const width = widest * NODE_W + (widest - 1) * GAP_X
      const positions = new Map()
      layers.forEach((layer, level) => {
        const rowWidth = layer.length * NODE_W + Math.max(0, layer.length - 1) * GAP_X
        const startX = (width - rowWidth) / 2
        layer.forEach((id, index) => {
          positions.set(id, { x: startX + index * (NODE_W + GAP_X), y: level * (NODE_H + GAP_Y) })
        })
      })
      const height = Math.max(1, layers.length) * NODE_H + Math.max(0, layers.length - 1) * GAP_Y
      return { positions, width, height }
    }

    function wrapLabel(label, maxChars) {
      const text = String(label || '')
      if (text.length <= maxChars) return [text]
      const lines = [text.slice(0, maxChars)]
      if (text.length > maxChars) {
        lines.push(text.length > maxChars * 2 ? text.slice(maxChars, maxChars * 2 - 1) + '…' : text.slice(maxChars))
      }
      return lines
    }

    function toneStroke(tone) {
      if (tone === 'accent') return ACCENT
      if (tone === 'warn') return WARN
      if (tone === 'good') return GOOD
      return NODE_STROKE
    }

    // -------------------------------------------------------------- rendering

    const GRAIN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/></filter><rect width="140" height="140" filter="url(#n)" opacity="0.42"/></svg>'
    const GRAIN = 'url("data:image/svg+xml,' + encodeURIComponent(GRAIN_SVG) + '")'

    function hexToRgb(hex) {
      const value = hex.replace('#', '')
      const full = value.length === 3 ? value.split('').map(part => part + part).join('') : value
      const number = parseInt(full, 16)
      return [(number >> 16) & 255, (number >> 8) & 255, number & 255]
    }

    function mixHex(a, b, amount) {
      const left = hexToRgb(a)
      const right = hexToRgb(b)
      const to = value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
      return '#' + to(left[0] + (right[0] - left[0]) * amount)
        + to(left[1] + (right[1] - left[1]) * amount)
        + to(left[2] + (right[2] - left[2]) * amount)
    }

    function rgbString(channel) {
      return 'rgb(' + Math.round(channel[0]) + ' ' + Math.round(channel[1]) + ' ' + Math.round(channel[2]) + ')'
    }

    function copyChannels(channel) {
      return [channel[0], channel[1], channel[2]]
    }

    const PATTERN_BLUR = { cloud: 46, ring: 30, streak: 34, spiral: 52 }

    function gradientFor(pattern, uid) {
      if (pattern === 'ring') {
        return `radial-gradient(circle, transparent 34%, var(--aic_${uid}_c0) 43%, var(--aic_${uid}_c1) 53%, var(--aic_${uid}_c2) 64%, transparent 76%)`
      }
      if (pattern === 'streak') {
        return `linear-gradient(90deg, transparent 10%, var(--aic_${uid}_c0) 40%, var(--aic_${uid}_c1) 56%, transparent 90%)`
      }
      if (pattern === 'spiral') {
        return `conic-gradient(from 0deg, transparent 0%, var(--aic_${uid}_c1) 16%, transparent 33%, var(--aic_${uid}_c3) 50%, transparent 68%, var(--aic_${uid}_c0) 84%, transparent 100%)`
      }
      return `radial-gradient(circle, #ffffff 0%, var(--aic_${uid}_c0) 22%, var(--aic_${uid}_c1) 44%, var(--aic_${uid}_c2) 60%, transparent 78%)`
    }

    /** Interpolation time constant: how fast the glow glides to a new target. */
    function tauFor(speed, style) {
      const base = speed === 'slow' ? 1600 : speed === 'fast' ? 380 : 900
      const factor = style === 'dissolve' ? 1.4 : style === 'burst' ? 0.45 : style === 'ripple' ? 0.9 : 1.1
      return style === 'snap' ? 0 : base * factor
    }

    function targetFrom(model) {
      const palette = model.colors || MOODS[model.mood] || MOODS.neutral
      const intensity = model.intensity == null ? 0.6 : model.intensity
      const nebula = model.nebula || MOOD_DEFAULT.nebula
      const orb = model.orb || MOOD_DEFAULT.orb
      const transition = model.transition || MOOD_DEFAULT.transition
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

    function copyTarget(target) {
      return {
        ...target,
        c0: copyChannels(target.c0),
        c1: copyChannels(target.c1),
        c2: copyChannels(target.c2),
        c3: copyChannels(target.c3),
        c4: copyChannels(target.c4),
        c5: copyChannels(target.c5),
      }
    }

    /**
     * Continuous emotional glow: one persistent scene driven by requestAnimationFrame.
     * A new canvas block only replaces the TARGET; every frame interpolates colours,
     * size, opacity, blur and rotation towards it with the timing the assistant chose.
     * With no new input the glow slowly decays back towards baseline.
     */
    function MoodView({ model, revision }) {
      const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, '')
      const reduced = typeof window !== 'undefined' && window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const targetRef = React.useRef(targetFrom(model))
      targetRef.current = targetFrom(model)
      const firstRef = React.useRef(targetRef.current)
      const stateRef = React.useRef(copyTarget(targetRef.current))
      const metaRef = React.useRef({
        lastChangeAt: typeof performance !== 'undefined' ? performance.now() : 0,
        blend: 1,
        pattern: firstRef.current.pattern,
        previousPattern: null,
        spiral: 0,
        phase: 0,
        flash: 0,
        rippleAt: -1,
      })

      const rootRef = React.useRef(null)
      const wrapRef = React.useRef(null)
      const layerARef = React.useRef(null)
      const layerBRef = React.useRef(null)
      const glowRef = React.useRef(null)
      const rippleRef = React.useRef(null)
      const flashRef = React.useRef(null)

      const applyRef = React.useRef(null)
      applyRef.current = () => {
        const state = stateRef.current
        const meta = metaRef.current
        const current = targetRef.current
        const root = rootRef.current
        const wrap = wrapRef.current
        const glow = glowRef.current
        const layerA = layerARef.current
        const layerB = layerBRef.current
        const ripple = rippleRef.current
        const flash = flashRef.current
        if (root) {
          for (const name of ['c0', 'c1', 'c2', 'c3', 'c4', 'c5']) {
            root.style.setProperty(`--aic_${uid}_${name}`, rgbString(state[name]))
          }
        }
        if (wrap) {
          wrap.style.width = 'min(' + state.w.toFixed(2) + '%, ' + state.px.toFixed(1) + 'px)'
          if (current.pattern === 'streak') {
            wrap.style.aspectRatio = 'auto'
            wrap.style.height = state.h.toFixed(2) + '%'
          } else {
            wrap.style.height = 'auto'
            wrap.style.aspectRatio = '1'
          }
          wrap.style.transform = 'translate(-50%,-50%) rotate(' + (state.rot + meta.spiral).toFixed(2) + 'deg)'
        }
        if (glow) {
          const pulse = 1 + Math.sin(meta.phase) * current.pulseAmp
          glow.style.filter = 'blur(' + state.blur.toFixed(1) + 'px)'
          glow.style.opacity = String(Math.min(1, state.op * (meta.flash > 0 ? 1 + meta.flash * 0.7 : 1)))
          glow.style.transform = 'scale(' + pulse.toFixed(4) + ')'
        }
        if (meta.blend < 1) {
          meta.blend = Math.min(1, meta.blend + 0.03)
          if (layerA) layerA.style.opacity = String(meta.blend)
          if (layerB) layerB.style.opacity = String(1 - meta.blend)
          if (meta.blend >= 1 && layerB) {
            layerB.style.opacity = '0'
            layerB.style.background = 'none'
            meta.previousPattern = null
          }
        }
        if (flash) {
          if (meta.flash > 0) {
            meta.flash = Math.max(0, meta.flash - 0.035)
            flash.style.opacity = String(meta.flash * 0.32)
          } else {
            flash.style.opacity = '0'
          }
        }
        if (ripple) {
          if (meta.rippleAt >= 0) {
            const now = typeof performance !== 'undefined' ? performance.now() : 0
            const span = current.speed === 'fast' ? 700 : current.speed === 'slow' ? 1900 : 1100
            const progress = (now - meta.rippleAt) / span
            if (progress >= 1) {
              meta.rippleAt = -1
              ripple.style.opacity = '0'
            } else {
              ripple.style.transform = 'translate(-50%,-50%) scale(' + (0.25 + progress * 1.9).toFixed(3) + ')'
              ripple.style.opacity = String(0.55 * (1 - progress))
            }
          }
        }
      }

      // Initial paint: set size, blur, opacity, layer gradients once.
      React.useEffect(() => {
        const first = firstRef.current
        const meta = metaRef.current
        if (layerARef.current) {
          layerARef.current.style.background = gradientFor(first.pattern, uid)
          layerARef.current.style.opacity = '1'
        }
        if (wrapRef.current) {
          wrapRef.current.style.width = 'min(' + first.w.toFixed(2) + '%, ' + first.px.toFixed(1) + 'px)'
          if (first.pattern === 'streak') {
            wrapRef.current.style.aspectRatio = 'auto'
            wrapRef.current.style.height = first.h.toFixed(2) + '%'
          }
        }
        if (glowRef.current) {
          glowRef.current.style.filter = 'blur(' + first.blur.toFixed(1) + 'px)'
          glowRef.current.style.opacity = String(first.op)
        }
        meta.pattern = first.pattern
        if (applyRef.current) applyRef.current()
      }, [uid])

      // New target: reset timing, kick pattern crossfade and effects.
      React.useEffect(() => {
        const meta = metaRef.current
        const next = targetRef.current
        if (next.pattern !== meta.pattern) {
          meta.previousPattern = meta.pattern
          meta.pattern = next.pattern
          meta.blend = 0
          if (layerBRef.current && layerARef.current) {
            layerBRef.current.style.background = layerARef.current.style.background
            layerBRef.current.style.opacity = '1'
            layerARef.current.style.background = gradientFor(next.pattern, uid)
            layerARef.current.style.opacity = '0'
          }
        }
        meta.lastChangeAt = typeof performance !== 'undefined' ? performance.now() : 0
        meta.flash = next.style === 'burst' ? 1 : 0
        meta.rippleAt = next.style === 'ripple' ? meta.lastChangeAt : -1
        if (reduced && applyRef.current) applyRef.current()
      }, [revision, uid, reduced])

      React.useEffect(() => {
        if (reduced) {
          stateRef.current = copyTarget(targetRef.current)
          if (applyRef.current) applyRef.current()
          return undefined
        }
        let raf = 0
        let last = performance.now()
        const step = (now) => {
          const dt = Math.min(64, now - last)
          last = now
          const state = stateRef.current
          const meta = metaRef.current
          const current = targetRef.current
          const tau = tauFor(current.speed, current.style)
          const k = tau <= 0 ? 1 : 1 - Math.exp(-dt / tau)
          const idle = now - meta.lastChangeAt
          const hold = Math.max(4000, 9000 - current.intensity * 4000)
          const decay = idle > hold ? Math.min(1, (idle - hold) / 2600) : 0
          const alive = 1 - decay * 0.45

          for (const name of ['w', 'px', 'h', 'blur', 'rot']) {
            state[name] += (current[name] - state[name]) * k
          }
          state.op += (current.op * alive - state.op) * Math.min(1, k + 0.02)
          for (const name of ['c0', 'c1', 'c2', 'c3', 'c4', 'c5']) {
            const from = state[name]
            const to = current[name]
            from[0] += (to[0] - from[0]) * k
            from[1] += (to[1] - from[1]) * k
            from[2] += (to[2] - from[2]) * k
          }
          meta.phase += (dt / 1000) * current.pulseSpeed * Math.PI * 2
          if (current.pattern === 'spiral') {
            meta.spiral += (dt / 1000) * current.spin
          } else if (Math.abs(meta.spiral) > 0.01) {
            meta.spiral += (0 - meta.spiral) * k
          } else {
            meta.spiral = 0
          }
          if (applyRef.current) applyRef.current()
          raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
        return () => cancelAnimationFrame(raf)
      }, [reduced, uid])

      return h('div', {
        ref: rootRef,
        style: {
          [`--aic_${uid}_c0`]: rgbString(firstRef.current.c0),
          [`--aic_${uid}_c1`]: rgbString(firstRef.current.c1),
          [`--aic_${uid}_c2`]: rgbString(firstRef.current.c2),
          [`--aic_${uid}_c3`]: rgbString(firstRef.current.c3),
          [`--aic_${uid}_c4`]: rgbString(firstRef.current.c4),
          [`--aic_${uid}_c5`]: rgbString(firstRef.current.c5),
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: 240,
          overflow: 'hidden',
          background: `radial-gradient(circle at 50% 46%, var(--aic_${uid}_c4) 0%, var(--aic_${uid}_c5) 70%)`,
        },
      },
        h('div', {
          ref: wrapRef,
          style: {
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
          },
        },
          h('div', {
            ref: glowRef,
            style: { position: 'absolute', inset: 0, pointerEvents: 'none' },
          },
            h('div', {
              ref: layerARef,
              style: { position: 'absolute', inset: 0, opacity: 0 },
            }),
            h('div', {
              ref: layerBRef,
              style: { position: 'absolute', inset: 0, opacity: 0 },
            }),
          ),
        ),
        h('div', {
          style: {
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,.5) 100%)',
          },
        }),
        h('div', {
          style: {
            position: 'absolute',
            inset: 0,
            backgroundImage: GRAIN,
            opacity: 0.05,
            mixBlendMode: 'overlay',
            pointerEvents: 'none',
          },
        }),
        h('div', {
          ref: flashRef,
          style: {
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,.9) 0%, transparent 62%)',
            opacity: 0,
            pointerEvents: 'none',
          },
        }),
        h('div', {
          ref: rippleRef,
          style: {
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '44%',
            aspectRatio: '1',
            borderRadius: '50%',
            border: `1px solid var(--aic_${uid}_c1)`,
            transform: 'translate(-50%,-50%) scale(.25)',
            opacity: 0,
            pointerEvents: 'none',
          },
        }),
      )
    }

    function DiagramView({ model }) {
      const markerId = 'ai-canvas-arrow-' + React.useId().replace(/[^a-zA-Z0-9_-]/g, '')
      const marker = 'url(#' + markerId + ')'
      const { positions, width, height } = React.useMemo(
        () => layoutDiagram(model.nodes, model.edges),
        [model],
      )

      const edgeEls = model.edges.map((edge, index) => {
        const from = positions.get(edge.from)
        const to = positions.get(edge.to)
        if (!from || !to) return null
        let path
        if (from.y === to.y) {
          const x1 = from.x + NODE_W
          const y1 = from.y + NODE_H / 2
          const x2 = to.x
          const y2 = to.y + NODE_H / 2
          path = `M ${x1} ${y1} C ${x1 + 44} ${y1}, ${x2 - 44} ${y2}, ${x2} ${y2}`
        } else {
          const x1 = from.x + NODE_W / 2
          const y1 = from.y + NODE_H
          const x2 = to.x + NODE_W / 2
          const y2 = to.y
          path = `M ${x1} ${y1} C ${x1} ${y1 + 28}, ${x2} ${y2 - 28}, ${x2} ${y2}`
        }
        return h('path', {
          key: 'edge-' + index,
          d: path,
          fill: 'none',
          stroke: EDGE,
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          markerEnd: marker,
        })
      })

      const nodeEls = model.nodes.map(node => {
        const point = positions.get(node.id)
        if (!point) return null
        const lines = wrapLabel(node.label, 10)
        const centerY = point.y + NODE_H / 2
        const firstY = centerY - ((lines.length - 1) * 17) / 2 + 4
        const texts = lines.map((line, index) =>
          h('text', {
            key: 'text-' + index,
            x: point.x + NODE_W / 2,
            y: firstY + index * 17,
            textAnchor: 'middle',
            fill: LABEL,
            fontFamily: FONT,
            fontSize: 12.5,
          }, line),
        )
        return h('g', { key: node.id },
          h('rect', {
            x: point.x,
            y: point.y,
            width: NODE_W,
            height: NODE_H,
            rx: 10,
            fill: NODE_FILL,
            stroke: toneStroke(node.tone),
            strokeWidth: node.tone === 'default' ? 1 : 1.6,
          }),
          node.detail ? h('title', null, node.detail) : null,
          ...texts,
        )
      })

      return h('div', { style: { overflowX: 'auto', overflowY: 'hidden', padding: '2px 2px 10px' } },
        h('svg', {
          viewBox: `0 0 ${width} ${height}`,
          style: { display: 'block', width: width + 'px', height: height + 'px', margin: '0 auto' },
          role: 'img',
        },
          h('defs', null,
            h('marker', {
              id: markerId,
              viewBox: '0 0 10 10',
              refX: 9,
              refY: 5,
              markerWidth: 6,
              markerHeight: 6,
              orient: 'auto-start-reverse',
            }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: EDGE })),
          ),
          edgeEls,
          nodeEls,
        ))
    }

    function CardsView({ model }) {
      return h('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '10px',
          paddingBottom: '12px',
        },
      }, model.cards.map((card, index) =>
        h('div', {
          key: index,
          style: {
            border: '0.5px solid ' + BORDER,
            borderLeft: '3px solid ' + toneStroke(card.tone),
            borderRadius: 10,
            padding: '10px 12px',
            background: LAYER_BG,
          },
        },
          h('div', { style: { fontSize: 12.5, fontWeight: 600, color: LABEL } }, card.title),
          card.body
            ? h('div', { style: { fontSize: 12, lineHeight: 1.55, color: LABEL_2, marginTop: 4 } }, card.body)
            : null,
        )))
    }

    function ParseErrorState() {
      return h('div', {
        style: {
          minHeight: '42vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          textAlign: 'center',
          color: WARN,
          fontSize: 12.5,
          lineHeight: 1.6,
        },
      },
        h('div', { style: { fontSize: 26, lineHeight: 1 } }, '⚠'),
        h('div', null, '这一版的画布数据没能解析'),
        h('div', { style: { color: CAPTION } }, '原文保留在对话里，可以让 AI 重新画一次'),
      )
    }

    function CanvasBody(props) {
      const code = props.useChat(latestCanvasCode)
      const parsed = React.useMemo(() => parseCanvas(code), [code])
      const lastGood = React.useRef(null)
      if (parsed) lastGood.current = parsed

      const failed = !parsed && code != null && lastGood.current == null
      const model = parsed || lastGood.current || (failed ? null : MOOD_DEFAULT)

      // Every distinct model bumps `revision`; the glide itself is driven by the
      // rAF engine and needs no scene remount.
      const signature = model ? JSON.stringify(model) : 'none'
      const lastSignature = React.useRef(null)
      const revision = React.useRef(0)
      if (lastSignature.current !== signature) {
        lastSignature.current = signature
        revision.current += 1
      }

      if (failed) {
        return h('div', {
          style: {
            height: '100%',
            overflow: 'auto',
            boxSizing: 'border-box',
            padding: '14px 14px 18px',
            background: BG,
          },
        }, h(ParseErrorState))
      }

      if (model.kind === 'mood') {
        return h('div', { style: { height: '100%', background: BG } }, h(MoodView, { model, revision: revision.current }))
      }

      return h('div', {
        style: {
          height: '100%',
          overflow: 'auto',
          boxSizing: 'border-box',
          padding: '14px 14px 18px',
          background: BG,
          color: LABEL,
        },
      },
        model.title
          ? h('div', {
            style: {
              fontSize: 12,
              fontWeight: 600,
              color: LABEL_2,
              marginBottom: 12,
              letterSpacing: '0.02em',
            },
          }, model.title)
          : null,
        model.kind === 'diagram' ? h(DiagramView, { model }) : null,
        model.kind === 'cards' ? h(CardsView, { model }) : null,
      )
    }

    /** Fence layer: replace the raw canvas JSON with a compact, clickable pill. */
    function CanvasFence(props) {
      const ok = React.useMemo(() => parseCanvas(props.code) !== null, [props.code])
      const failed = !props.streaming && !ok
      const status = failed ? '画布数据无法解析，原文保留' : props.streaming ? '画布生成中…' : '已更新到 ' + NAME
      const onClick = failed ? undefined : () => openCanvas()

      const children = [
        h('span', { key: 'glyph', style: { color: failed ? WARN : ACCENT, fontWeight: 700, fontSize: 13 } }, failed ? '⚠' : '▦'),
        h('span', { key: 'status' }, status),
      ]
      if (!failed) children.push(h('span', { key: 'hint', style: { color: CAPTION } }, '· 点这里打开'))

      return h('div', null,
        h(onClick ? 'button' : 'div', {
          type: onClick ? 'button' : undefined,
          onClick,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            margin: '6px 0',
            padding: '7px 10px',
            border: '0.5px solid ' + (failed ? WARN : BORDER),
            borderRadius: 8,
            background: LAYER_BG,
            fontSize: 12,
            color: LABEL_2,
            textAlign: 'left',
            cursor: onClick ? 'pointer' : 'default',
            font: 'inherit',
          },
        }, children),
        failed ? props.children : null,
      )
    }

    // ------------------------------------------------------------ registration

    return {
      inject: ['slots', 'sidebarRightTabs', 'sidebarRight'],
      apply(ctx) {
        openCanvas = () => {
          try {
            ctx.sidebarRight.openTab(KIND)
          } catch {
            // no mounted Session surface yet: the guide page remains the entry
          }
        }

        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: PKG,
          kind: KIND,
          title: () => NAME,
          keepMounted: true,
          guide: [{
            id: 'canvas',
            order: 50,
            title: () => 'AI Dream',
            description: () => '让每个 AI 的感受有形状',
          }],
        }), 'ai-canvas tab type')

        ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
          { name: 'sidebar.right.pane.tab', key: PKG },
          CanvasBody,
        ))

        ctx.slots.inject('conversation.chat.markdown.fence', () => ctx.slots.register(
          { name: 'conversation.chat.markdown.fence', id: PKG, key: 'canvas' },
          CanvasFence,
        ))
      },
    }
  },
})
