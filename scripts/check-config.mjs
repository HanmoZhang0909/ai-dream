// Configuration and signature parsing regression tests (no dependencies).
import assert from 'node:assert/strict'
import { resolveConfig, parseSignature } from '../index.js'

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const emotion = (name, overrides = {}) => ({
  name,
  palette: { base: '#0b0a12', core: '#e8d9ff', tone: '#9a7aa6', spectrum: ['#c9a3e0', '#6a4b8f'] },
  motion: { speed: 0.6, amplitude: 0.5, rhythm: 'breathing' },
  form: 'cloud',
  ...overrides,
})
const emotions = Array.from({ length: 6 }, (_, index) => emotion('情绪' + (index + 1)))
const route = { provider: 'test-provider', model: 'test-model' }

// --- resolveConfig -----------------------------------------------------------
{
  const defaults = resolveConfig(undefined)
  assert.equal(defaults.signatureEnabled, true)
  assert.equal(defaults.signatureEmotions, 8)
  assert.equal(defaults.holdSeconds, 6)
  assert.equal(defaults.decaySeconds, 3)
  assert.equal(defaults.defaultIntensity, 0.6)
  assert.equal(defaults.allowInlinePalette, true)
  assert.ok(Object.isFrozen(defaults), 'settings must be immutable')
}

{
  const clamped = resolveConfig({
    signatureEnabled: false,
    signatureEmotions: 99,
    holdSeconds: 0,
    decaySeconds: 0.1,
    defaultIntensity: 5,
    allowInlinePalette: false,
  })
  assert.equal(clamped.signatureEnabled, false)
  assert.equal(clamped.signatureEmotions, 12)
  assert.equal(clamped.holdSeconds, 1)
  assert.equal(clamped.decaySeconds, 0.5)
  assert.equal(clamped.defaultIntensity, 1)
  assert.equal(clamped.allowInlinePalette, false)

  const low = resolveConfig({ signatureEmotions: -5, holdSeconds: -3, decaySeconds: 999, defaultIntensity: -1 })
  assert.equal(low.signatureEmotions, 4)
  assert.equal(low.holdSeconds, 1)
  assert.equal(low.decaySeconds, 30)
  assert.equal(low.defaultIntensity, 0.2)

  const junk = resolveConfig({ signatureEmotions: 'many', holdSeconds: null, decaySeconds: Number.NaN })
  assert.equal(junk.signatureEmotions, 8)
  assert.equal(junk.holdSeconds, 6)
  assert.equal(junk.decaySeconds, 3)
}

// --- parseSignature ----------------------------------------------------------
{
  const text = '```json\n' + JSON.stringify({ version: 1, emotions }) + '\n```'
  const signature = parseSignature(text, route)
  assert.ok(signature, 'fenced signature must parse')
  assert.equal(signature.emotions.length, 6)
  assert.equal(signature.emotions[0].name, '情绪1')
  assert.ok(HEX.test(signature.emotions[0].palette.base))
  assert.deepEqual(signature.model, { provider: 'test-provider', model: 'test-model' })
}

{
  const nasty = {
    version: 1,
    emotions: [
      emotion('长'.repeat(40)),
      emotion('坏色', { palette: { base: 'not-a-color', core: '#FFF', tone: '#abc' } }),
      emotion('滑', { motion: { speed: 99, amplitude: -1, rhythm: 'wild' }, form: 'unknown' }),
      ...emotions.slice(3),
    ],
  }
  const text = 'Here you go: ' + JSON.stringify(nasty) + ' hope it helps'
  const signature = parseSignature(text, route)
  assert.ok(signature, 'prose-wrapped signature must parse')
  assert.equal(signature.emotions[0].name.length, 12, 'names are cut to 12 chars')
  assert.equal(signature.emotions[1].palette.base, '#05070c', 'invalid base falls back')
  assert.equal(signature.emotions[1].palette.core.toLowerCase(), '#fff')
  assert.equal(signature.emotions[2].motion.speed, 2)
  assert.equal(signature.emotions[2].motion.amplitude, 0.1)
  assert.equal(signature.emotions[2].motion.rhythm, 'breathing')
  assert.equal(signature.emotions[2].form, 'cloud')
}

{
  assert.equal(parseSignature('{"emotions":[]}', route), null, 'empty emotion list is rejected')
  assert.equal(parseSignature('not json at all', route), null)
  assert.equal(parseSignature(undefined, route), null)
  const tooFew = { version: 1, emotions: emotions.slice(0, 2) }
  assert.equal(parseSignature(JSON.stringify(tooFew), route), null, 'fewer than 3 emotions is rejected')
}

console.log('config/signature checks OK')
