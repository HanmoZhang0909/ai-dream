// Portable renderer core checks (no dependencies).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  BUILTIN_PALETTES,
  CALIBRATION,
  EMPTY_STATE,
  FORMS,
  PARTIAL_MARK,
  PATTERN_BLUR,
  SIGNATURE_VIEW_LIMIT,
  TIMELINE_LAYOUT,
  TRANSITION_STYLES,
  buildTimelineDots,
  calibrationNoteFor,
  calibrationSnippet,
  clamp,
  cut,
  expressionTier,
  extractPartialCanvas,
  formLabel,
  hexColor,
  hexToRgb,
  inReplayMode,
  isEmptyState,
  mixHex,
  nextCalibrationBias,
  nextDotTurn,
  normalizeMood,
  parsePartialMood,
  pick,
  planExpressionV3,
  resolveCapabilities,
  resolveColors,
  sentinelSelector,
  signatureChips,
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

// --- calibration feedback -----------------------------------------------------
assert.equal(CALIBRATION.minBias, -0.4)
assert.equal(CALIBRATION.maxBias, 0.4)
assert.equal(nextCalibrationBias(0, 0.08), 0.08)
assert.equal(nextCalibrationBias(0.36, 0.08), 0.4, 'bias clamps at the upper bound')
assert.equal(nextCalibrationBias(-0.36, -0.08), -0.4, 'bias clamps at the lower bound')
assert.equal(nextCalibrationBias('x', 0.08), 0.08, 'invalid bias starts from zero')
assert.equal(nextCalibrationBias(0.1, NaN), 0.1, 'invalid delta leaves the bias unchanged')
assert.equal(calibrationNoteFor(0, 0.08), '更亮了 · 只影响画面')
assert.equal(calibrationNoteFor(0, -0.08), '更淡了 · 只影响画面')
assert.equal(calibrationNoteFor(0.36, 0.08), '已到上限 · 只影响画面', 'hitting the bound reports the limit')
assert.equal(calibrationNoteFor(-0.36, -0.08), '已到上限 · 只影响画面')

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

// --- empty / waiting state ----------------------------------------------------
assert.equal(EMPTY_STATE.title, '还没有感受可以成形状')
assert.equal(EMPTY_STATE.hint, '发送消息后画布会亮起')
assert.equal(EMPTY_STATE.intensity, 0.2, 'waiting glow is dimmer than a normal expression')
assert.equal(isEmptyState(false), true)
assert.equal(isEmptyState(true), false)
assert.equal(isEmptyState(undefined), true)

// --- model-side calibration export -------------------------------------------
{
  const neutral = calibrationSnippet(0)
  assert.equal(neutral.bias, 0)
  assert.equal(neutral.intensity, 0.6)
  assert.equal(neutral.tone, null)
  assert.equal(neutral.json, null, 'no JSON is generated for a neutral bias')
  const brighter = calibrationSnippet(0.4)
  assert.equal(brighter.intensity, 1)
  assert.equal(brighter.tone, '画布偏好更亮/更强')
  assert.deepEqual(JSON.parse(brighter.json), { tone: '画布偏好更亮/更强', intensity: 1 })
  const dimmer = calibrationSnippet(-0.4)
  assert.equal(dimmer.intensity, 0.2)
  assert.equal(dimmer.tone, '画布偏好更淡/更弱')
  assert.equal(calibrationSnippet(9).bias, 0.4, 'bias is clamped before export')
  assert.equal(calibrationSnippet(undefined).bias, 0)
  assert.equal(calibrationSnippet(0.085).bias, 0.09, 'bias is rounded to two decimals')
}

// --- weather forms (v2.1 additive) -------------------------------------------
assert.deepEqual(FORMS, ['cloud', 'ring', 'streak', 'spiral', 'rain', 'fog'])
assert.equal(PATTERN_BLUR.rain, 26)
assert.equal(PATTERN_BLUR.fog, 72)
assert.equal(PATTERN_BLUR.fog > PATTERN_BLUR.cloud * 1.5, true, 'fog is much softer than cloud')
assert.equal(formLabel('rain'), '雨')
assert.equal(formLabel('fog'), '雾')
assert.equal(formLabel('spiral'), '旋')
assert.equal(formLabel('snow'), null)
assert.equal(formLabel(undefined), null)
{
  const rain = normalizeMood({ form: 'rain' })
  assert.equal(rain.nebula.pattern, 'rain')
  const fog = normalizeMood({ form: 'fog' })
  assert.equal(fog.nebula.pattern, 'fog')
  assert.equal(normalizeMood({ form: 'snow' }).nebula.pattern, 'spiral', 'unknown forms still fall back')
  assert.equal(targetFrom(rain).blur, 26)
  assert.equal(targetFrom(fog).blur, 72)
}

// --- streaming (partial) mood parsing ----------------------------------------
assert.equal(extractPartialCanvas('no fence here'), null)
assert.equal(extractPartialCanvas('```canvas\n{"kind":"mood"}\n```'), null, 'closed fences are not partial')
assert.equal(extractPartialCanvas('x\n```canvas\n{"kind":"mood",'), '{"kind":"mood",', 'open fence body is partial')
assert.equal(extractPartialCanvas('```canvas\n{"a":1}\n```\nafter'), null)

{
  const partial = parsePartialMood('{"kind":"mood","name":"被看穿","intensity":0.8,"form":"streak","palette":{"base":"#0B0A12","core":"#E8D9FF","tone":"#9A7AA6"')
  assert.equal(partial.name, '被看穿')
  assert.equal(partial.intensity, 0.8)
  assert.equal(partial.form, 'streak')
  assert.deepEqual(partial.palette, { base: '#0b0a12', core: '#e8d9ff', tone: '#9a7aa6' })
  assert.equal(parsePartialMood('{"kind":"mood","name":"半句'), null)
  assert.equal(parsePartialMood('{"kind":"mood","intensity":0.5').intensity, 0.5)
  assert.equal(parsePartialMood('{"kind":"mood","form":"weather"').form, undefined, 'unknown forms are ignored')
  assert.equal(parsePartialMood('{"kind":"mood","palette":{"core":"#abc"}').palette.core, '#abc')
  assert.equal(parsePartialMood(''), null)
  assert.equal(parsePartialMood('{"kind":"mood"'), null, 'kind alone is not enough to preview')
}

// --- keyboard dot navigation --------------------------------------------------
assert.equal(nextDotTurn([], 5, 'next'), null)
assert.equal(nextDotTurn([10, 11, 12], 10, 'next'), 11)
assert.equal(nextDotTurn([10, 11, 12], 12, 'next'), 12, 'stays on the last dot')
assert.equal(nextDotTurn([10, 11, 12], 10, 'previous'), 10, 'stays on the first dot')
assert.equal(nextDotTurn([10, 11, 12], 11, 'previous'), 10)
assert.equal(nextDotTurn([10, 11, 12], 12, 'home'), 10)
assert.equal(nextDotTurn([10, 11, 12], 10, 'end'), 12)
assert.equal(nextDotTurn([10, 11, 12], 99, 'next'), 10, 'unknown turns start at the first dot')

// --- protocol v3 planner (open vocabulary, safe degradation) -----------------
{
  const fixtures = ['minimal', 'lyrical', 'geometric', 'symbolic', 'wild']
  const loaded = {}
  for (const name of fixtures) {
    const file = new URL(`../examples/v3/${name}.json`, import.meta.url)
    loaded[name] = JSON.parse(fs.readFileSync(file, 'utf8'))
  }
  assert.equal(expressionTier(loaded.minimal), 'L0')
  assert.equal(expressionTier(loaded.lyrical), 'L2')
  assert.equal(expressionTier(loaded.symbolic), 'L3')
  assert.equal(expressionTier(loaded.wild), 'L3')

  const minimal = planExpressionV3(loaded.minimal)
  assert.equal(minimal.tier, 'L0')
  assert.equal(minimal.layers.length, 0)
  assert.equal(minimal.degradations.length, 0)

  const lyrical = planExpressionV3(loaded.lyrical)
  assert.equal(lyrical.tier, 'L2')
  assert.equal(lyrical.layers.length, 3)
  assert.ok(lyrical.variation > 0)
  assert.equal(lyrical.layers[1].relations[0].type, 'echo')
  assert.ok(lyrical.afterglow && lyrical.afterglow.hold > 0)

  const geometric = planExpressionV3(loaded.geometric)
  assert.equal(geometric.layers.length, 3)
  assert.ok(geometric.layers[0].motion.rotate.speed > 0)

  const symbolic = planExpressionV3(loaded.symbolic)
  assert.equal(symbolic.tier, 'L3')
  assert.equal(symbolic.layers[0].primitive, 'ring', 'known macro resolves to its primitive')
  assert.ok(symbolic.degradations.some(item => item.reason === 'macro-missing'), 'unknown-rune degrades')
  assert.equal(symbolic.layers[1].primitive, 'spiral', 'unknown macro uses its fallback')

  const wild = planExpressionV3(loaded.wild)
  assert.equal(wild.tier, 'L3')
  assert.equal(wild.layers[0].primitive, 'blob', 'unknown primitive falls back to blob')
  assert.ok(wild.degradations.some(item => item.reason === 'unknown-primitive'))
  assert.ok(wild.keyframes && wild.keyframes.length === 3)
  assert.equal(wild.layers.length, 8)
  assert.ok(wild.layers[0].motion.flicker.rate <= 3, 'flicker is capped for photosensitivity')

  // planner never throws on junk and always yields a visible fallback
  for (const junk of [null, undefined, 'text', 42, [], {}, { kind: 'cards' }, { palette: 'nope', layers: 'nope' }]) {
    const planned = planExpressionV3(junk)
    assert.equal(planned.tier, 'L0')
    assert.ok(planned.palette && planned.palette.core, 'fallback palette is always present')
  }

  // malformed nested data is clamped, not fatal
  const harsh = planExpressionV3({
    kind: 'mood',
    intensity: 5,
    variation: 9,
    seed: -3,
    layers: Array.from({ length: 12 }, (_, index) => ({
      primitive: index === 0 ? 'particles' : 'blob',
      count: 99,
      size: -4,
      opacity: 7,
      motion: { flicker: { rate: 9, depth: 9 }, bogusMotion: {} },
      relations: [{ type: 'follow', target: 99 }, { type: 'bogus', target: 0 }],
    })),
  })
  assert.equal(harsh.tier, 'L2')
  assert.equal(harsh.layers.length, 8, 'layer budget is enforced')
  assert.equal(harsh.intensity, 1)
  assert.equal(harsh.variation, 1)
  assert.equal(harsh.seed, 0)
  assert.ok(harsh.degradations.some(item => item.reason === 'layer-limit'))
  assert.ok(harsh.layers.every(layer => layer.opacity <= 1 && layer.size >= 0))
  assert.ok(harsh.layers.every(layer => layer.motion.flicker.rate <= 3))
  assert.ok(harsh.degradations.some(item => item.reason === 'unknown-motion'))
  assert.ok(harsh.degradations.some(item => item.reason === 'unknown-relation'))
  assert.ok(harsh.degradations.some(item => item.reason === 'relation-target'))

  // capabilities negotiation: a weak renderer still gets something visible
  const weak = resolveCapabilities({ primitives: ['blob'], motions: ['breath'], relations: [], features: [] })
  const weakPlan = planExpressionV3(loaded.symbolic, weak)
  assert.ok(weakPlan.layers.length > 0)
  assert.ok(weakPlan.layers.every(layer => layer.primitive === 'blob'))
  assert.equal(weakPlan.tier, 'L2')
  const noVariation = planExpressionV3(loaded.lyrical, resolveCapabilities({ features: ['macros'] }))
  assert.equal(noVariation.variation, 0)
  assert.ok(noVariation.degradations.some(item => item.reason === 'variation-unsupported'))
  assert.equal(noVariation.afterglow, null)

  // keyframes must contain at least two usable frames
  const single = planExpressionV3({ kind: 'mood', keyframes: [{ at: 0, values: { scale: 1 } }] })
  assert.equal(single.keyframes, null)
  assert.ok(single.degradations.some(item => item.reason === 'keyframes-insufficient'))
}

// --- signature viewer chips ---------------------------------------------------
{
  const entries = [
    { name: '专注', palette: { core: '#e8d9ff' } },
    { name: '专注', palette: { core: '#111111' } },
    { name: '  ', palette: {} },
    { name: '调试紧', palette: { core: 'not-a-colour' } },
    { name: '被看穿' },
    null,
  ]
  const chips = signatureChips(entries)
  assert.deepEqual(chips.map(chip => chip.name), ['专注', '调试紧', '被看穿'])
  assert.equal(chips[0].core, '#e8d9ff')
  assert.equal(chips[1].core, '#9a7aa6', 'invalid colours fall back to the default')
  assert.equal(chips[0].form, undefined, 'no form label without a form')
  const withForms = signatureChips([{ name: '雾里', form: 'fog' }, { name: '雨停', form: 'rain' }])
  assert.equal(withForms[0].form, '雾')
  assert.equal(withForms[1].form, '雨')
  assert.equal(signatureChips('nope').length, 0)
  assert.equal(signatureChips(entries, 1).length, 1)
  const many = Array.from({ length: 20 }, (_, index) => ({ name: 'e' + index }))
  assert.equal(signatureChips(many).length, SIGNATURE_VIEW_LIMIT)
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
  assert.ok(client.includes('height: 24'), 'client keeps the reserved hint height')
  assert.equal(TIMELINE_LAYOUT.hintReservedHeight, 24, 'hint row keeps a 24px target height')
  assert.ok(client.includes('gap: 2'), 'client keeps the compact dot gap')
  assert.ok(client.includes('scrollHeight - 48'), 'client keeps the near-bottom threshold')
  assert.ok(client.includes('ai-dream:onboarded:v1'), 'client keeps the onboarding flag key')
  assert.ok(client.includes('data-ai-dream-onboarding'), 'client keeps the onboarding hook')
  assert.ok(client.includes("role: 'toolbar'"), 'client groups the dots as a toolbar')
  assert.ok(client.includes('aria-orientation'), 'client exposes the toolbar orientation')
  assert.ok(client.includes('aria-keyshortcuts'), 'client advertises the Esc shortcut')
  assert.ok(client.includes("aria-live"), 'client announces replay state')
  assert.ok(client.includes('tabIndex'), 'client uses roving tabindex for the dots')
  assert.ok(client.includes('最近几轮情绪，点击回看'), 'client keeps the dots group label')
  assert.ok(client.includes('minHeight: 24'), 'client keeps the calibration hit height')
  assert.ok(client.includes('width: 11'), 'client keeps the 11px visual dot')
  assert.ok(client.includes('ai-dream-onboard=1'), 'client keeps the onboarding test hook')
  assert.ok(client.includes('showingReplayHint'), 'client suppresses the hint while returning to live')
  assert.ok(client.includes('calibrationNoteFor'), 'client keeps the calibration feedback logic')
  assert.ok(client.includes('data-ai-dream-calibration-note'), 'client keeps the calibration note hook')
  assert.ok(client.includes('还没有感受可以成形状'), 'client keeps the empty-state title')
  assert.ok(client.includes('发送消息后画布会亮起'), 'client keeps the empty-state hint')
  assert.ok(client.includes('data-ai-dream-empty'), 'client keeps the empty-state hook')
  assert.ok(client.includes('data-ai-dream-signature-btn'), 'client keeps the signature pill hook')
  assert.ok(client.includes('data-ai-dream-signature-panel'), 'client keeps the signature panel hook')
  assert.ok(client.includes('情绪词表'), 'client keeps the user-facing signature wording')
  assert.ok(client.includes('PARTIAL_MARK'), 'client keeps the streaming marker')
  assert.ok(client.includes('extractPartialCanvas'), 'client keeps the partial fence extractor')
  assert.ok(client.includes('parsePartialMood'), 'client keeps the partial mood parser')
  assert.ok(client.includes('nextDotTurn'), 'client keeps the dot keyboard navigation')
  assert.ok(client.includes('data-ai-dream-hint'), 'client keeps the replay hint hook for Esc')
  assert.ok(client.includes('rain: 26'), 'client keeps the rain blur value')
  assert.ok(client.includes('fog: 72'), 'client keeps the fog blur value')
  assert.ok(client.includes('color-mix'), 'client keeps the softened weather gradients')
  assert.ok(client.includes('FORM_LABELS'), 'client keeps the Chinese form labels')
  assert.ok(client.includes('calibrationSnippet'), 'client keeps the calibration export logic')
  assert.ok(client.includes('data-ai-dream-sync'), 'client keeps the sync-to-AI hook')
  assert.ok(client.includes('重载插件'), 'client mentions the plugin reload requirement')
  assert.ok(client.includes('整份覆盖'), 'client warns about overwriting the calibration file')
  assert.ok(client.includes('data-ai-dream-streaming'), 'client keeps the streaming indicator hook')
  assert.ok(client.includes('data-ai-dream-partial'), 'client exposes the partial flag')
  assert.ok(client.includes('__AI_DREAM_FORCE_PARTIAL'), 'client keeps the partial test hook')
  assert.ok(client.includes('__AI_DREAM_FORCE_FORM'), 'client keeps the form test hook')
  assert.ok(client.includes('data-ai-dream-form'), 'client exposes the rendered form')
}

console.log('renderer core checks OK')
