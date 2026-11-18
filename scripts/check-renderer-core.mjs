// Portable renderer core checks (no dependencies).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  BUILTIN_PALETTES,
  FORMS,
  TIMELINE_LAYOUT,
  TRANSITION_STYLES,
  buildTimelineDots,
  clamp,
  cut,
  hexColor,
  hexToRgb,
  inReplayMode,
  mixHex,
  normalizeMood,
  pick,
  resolveColors,
  sentinelSelector,
  targetFrom,
  tauFor,
  timelineRowRects,
} from '../renderer/core.mjs'

// --- primitives ---------------------------------------------------------------
assert.deepEqual(hexToRgb('#0b0a12'), [11, 10, 18])
assert.deepEqual(hexToRgb('#fff'), [255, 255, 255])
assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080')
assert.equal(mixHex('#000000', '#ffffff', 0), '#000000')
assert.equal(hexColor('#ABCDEF'), '#abcdef')
assert.equal(hexColor('not-a-colour'), null)
assert.equal(hexColor(' #abc '), '#abc')
assert.equal(clamp(5, 1, 3, 2), 3)
assert.equal(clamp(-5, 1, 3, 2), 1)
assert.equal(clamp('x', 1, 3, 2), 2)
assert.equal(clamp(Number.NaN, 1, 3, 2), 2)
assert.equal(pick('ring', FORMS, 'cloud'), 'ring')
assert.equal(pick('unknown', FORMS, 'cloud'), 'cloud')
assert.equal(cut('  被看穿  ', 40), '被看穿')
assert.equal(cut('x'.repeat(50), 40).length, 40)
assert.equal(cut(undefined, 10), '')

// --- palette resolution -------------------------------------------------------
{
  const custom = resolveColors({
    palette: { base: '#101010', core: '#202020', tone: '#303030', spectrum: ['#404040', '#505050'] },
  }, 'warm')
  assert.equal(custom.base, '#101010')
  assert.equal(custom.core, '#202020')
  assert.equal(custom.tint, '#303030')
  assert.equal(custom.spectrum[0], '#404040')
  assert.equal(custom.spectrum[1], '#505050')
  assert.equal(custom.spectrum.length, 4, 'spectrum always fills to four entries')

  const partial = resolveColors({ palette: { core: '#abcdef' } }, 'cool')
  assert.equal(partial.core, '#abcdef')
  assert.equal(partial.base, BUILTIN_PALETTES.neutral.base, 'cool is not built-in, neutral is the fallback')
  assert.ok(partial.spectrum.length >= 2)

  const fallback = resolveColors({}, 'neutral')
  assert.deepEqual(fallback, {
    base: BUILTIN_PALETTES.neutral.base,
    tint: BUILTIN_PALETTES.neutral.tint,
    spectrum: BUILTIN_PALETTES.neutral.spectrum,
    core: BUILTIN_PALETTES.neutral.core,
  })
  assert.deepEqual(resolveColors({}, 'no-such-mood'), fallback)
}

// --- mood normalization -------------------------------------------------------
{
  const model = normalizeMood({
    kind: 'mood',
    name: '长'.repeat(60),
    intensity: 7,
    palette: { core: '#e8d9ff' },
    motion: { speed: 99, amplitude: -1, rhythm: 'wild' },
    form: 'streak',
    transition: { style: 'burst', speed: 'fast' },
  })
  assert.equal(model.kind, 'mood')
  assert.equal(model.name.length, 40)
  assert.equal(model.intensity, 1)
  assert.equal(model.motion.speed, 2)
  assert.equal(model.motion.amplitude, 0.1)
  assert.equal(model.motion.rhythm, 'breathing')
  assert.equal(model.nebula.pattern, 'streak')
  assert.equal(model.colors.core, '#e8d9ff')
  assert.equal(model.transition.style, 'burst')

  const builtin = normalizeMood({ name: 'calm' })
  assert.equal(builtin.mood, 'calm')
  assert.equal(builtin.colors.core, BUILTIN_PALETTES.calm.core)

  const junk = normalizeMood({ form: 'weather:rain', transition: { style: 'x', speed: 'y' }, orb: { tone: 'nope' } })
  assert.equal(junk.nebula.pattern, 'spiral')
  assert.equal(junk.transition.style, 'soft')
  assert.equal(junk.transition.speed, 'medium')
  assert.equal(junk.orb.tone, 'neutral')
}

// --- interpolation shaping ----------------------------------------------------
assert.equal(tauFor('medium', 'snap'), 0)
assert.ok(tauFor('slow', 'soft') > tauFor('medium', 'soft'))
assert.ok(tauFor('medium', 'soft') > tauFor('fast', 'soft'))
assert.ok(tauFor('medium', 'dissolve') > tauFor('medium', 'soft'))
assert.ok(tauFor('medium', 'burst') < tauFor('medium', 'soft'))

// --- render target ------------------------------------------------------------
{
  const target = targetFrom(normalizeMood({ intensity: 0.5, form: 'ring', orb: { size: 0.5, pulse: 'steady', tone: 'warm' } }))
  assert.equal(target.pattern, 'ring')
  assert.equal(target.blur, 30)
  assert.equal(target.c0.length, 3)
  assert.equal(target.c5.length, 3)
  assert.ok(target.w > 44 && target.w < 100)
  assert.ok(target.op > 0.6 && target.op < 1)
  assert.ok(target.pulseSpeed > 0)

  const flicker = targetFrom(normalizeMood({ orb: { pulse: 'flicker', tone: 'bright' } }))
  assert.ok(flicker.pulseSpeed > 5)
  assert.deepEqual(flicker.c1, [255, 255, 255])

  const custom = targetFrom({ colors: resolveColors({ palette: { base: '#101010', core: '#202020', tone: '#303030', spectrum: ['#404040', '#505050'] } }, 'neutral') })
  assert.deepEqual(custom.c0, [32, 32, 32])
  assert.deepEqual(custom.c5, [16, 16, 16])
}

// --- scroll replay (mini timeline) -------------------------------------------
assert.equal(sentinelSelector(42), '[data-ai-dream-sentinel="42"]')
assert.equal(sentinelSelector(0), '[data-ai-dream-sentinel="0"]')
assert.equal(inReplayMode(5, 10), true)
assert.equal(inReplayMode(10, 10), false)
assert.equal(inReplayMode(11, 10), false)
assert.equal(inReplayMode(5, 10, false), false, 'replayEnabled:false disables replay')
assert.equal(inReplayMode(null, 10), false)
assert.equal(inReplayMode(5, null), false)

{
  const models = new Map([
    [3, { colors: { core: '#111111' } }],
    [5, { colors: { core: '#222222' } }],
    [4, {}],
    [2, { colors: {} }],
  ])
  const dots = buildTimelineDots(models)
  assert.deepEqual(dots.map(dot => dot.turn), [2, 3, 4, 5], 'dots ascend by turn')
  assert.equal(dots[0].core, '#9a7aa6', 'missing colour falls back')
  assert.equal(dots[1].core, '#111111')
  assert.equal(dots[2].core, '#9a7aa6')
  const many = new Map(Array.from({ length: 12 }, (_, index) => [index + 1, { colors: { core: '#123456' } }]))
  const limited = buildTimelineDots(many)
  assert.equal(limited.length, 8, 'at most eight dots')
  assert.deepEqual(limited.map(dot => dot.turn), [5, 6, 7, 8, 9, 10, 11, 12], 'newest eight turns')
  assert.deepEqual(buildTimelineDots(models, { limit: 2 }).map(dot => dot.turn), [4, 5])
  assert.deepEqual(buildTimelineDots(null), [])
  assert.deepEqual(buildTimelineDots(new Map()), [])
}

// --- bottom stack layout invariants (overlap / hit-target bug class) ---------
{
  assert.equal(TIMELINE_LAYOUT.dotHitSize >= 24, true, 'dot hit target must be at least 24px')
  assert.equal(TIMELINE_LAYOUT.dotVisualSize < TIMELINE_LAYOUT.dotHitSize, true)
  assert.equal(TIMELINE_LAYOUT.nearBottomThreshold, 48, 'near-bottom threshold matches the client')

  const rows = timelineRowRects({ dotCount: 8 })
  assert.deepEqual(rows.map(row => row.id), ['controls', 'dots', 'hint'])
  assert.equal(rows[0].bottom, TIMELINE_LAYOUT.bottomOffset)
  for (let index = 1; index < rows.length; index += 1) {
    assert.ok(rows[index].bottom >= rows[index - 1].top, 'stack rows must not overlap')
  }
  const dots = rows.find(row => row.id === 'dots')
  assert.equal(dots.height, TIMELINE_LAYOUT.dotHitSize, 'dots row is the hit-target height')

  const noDots = timelineRowRects({ dotCount: 0 })
  assert.equal(noDots.some(row => row.id === 'dots'), false, 'no dots row without expressed turns')
  const noControls = timelineRowRects({ dotCount: 3, hasControls: false })
  assert.equal(noControls.some(row => row.id === 'controls'), false)
  const compact = timelineRowRects({ dotCount: 3, hintHeight: 0 })
  assert.equal(compact.some(row => row.id === 'hint'), false)
}

// --- client.js parity (the zero-build copy must not silently drift) ----------
{
  const client = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  assert.ok(client.includes('.slice(-8)'), 'client applies the same dot limit')
  assert.ok(client.includes("'#9a7aa6'"), 'client applies the same fallback colour')
  assert.ok(client.includes('data-ai-dream-sentinel="'), 'client queries the same sentinel attribute')
  assert.ok(client.includes("block: 'center'"), 'client anchors jumps the same way')
  assert.ok(client.includes('prefers-reduced-motion'), 'client honours reduced motion')
  assert.ok(client.includes('width: 24'), 'client keeps the 24px dot hit area')
  assert.ok(client.includes('height: 22'), 'client keeps the reserved hint height')
  assert.ok(client.includes('gap: 2'), 'client keeps the compact dot gap')
  assert.ok(client.includes('scrollHeight - 48'), 'client keeps the near-bottom threshold')
}

console.log('renderer core checks OK')
