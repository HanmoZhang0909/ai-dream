// Portable renderer core checks (no dependencies).
import assert from 'node:assert/strict'
import {
  BUILTIN_PALETTES,
  FORMS,
  TRANSITION_STYLES,
  clamp,
  cut,
  hexColor,
  hexToRgb,
  mixHex,
  normalizeMood,
  pick,
  resolveColors,
  targetFrom,
  tauFor,
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

console.log('renderer core checks OK')
