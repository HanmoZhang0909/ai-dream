// Protocol v3 contract check (no dependencies): validates the machine-readable
// schema, the cross-style fixtures, and the downgrade matrix documented in docs.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaPath = path.join(root, 'docs/protocol-v3.schema.json')
const diagPath = path.join(root, 'docs/protocol-v3.md')
const fixturesDir = path.join(root, 'examples/v3')
const problems = []

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))
const defs = schema.definitions || {}

function resolveRef(ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/definitions/')) return null
  return defs[ref.slice('#/definitions/'.length)] || null
}

function validate(value, spec, where) {
  if (!spec || typeof spec !== 'object') return
  if (spec.$ref) {
    const target = resolveRef(spec.$ref)
    if (!target) problems.push(where + ': broken $ref ' + spec.$ref)
    else validate(value, target, where)
    return
  }
  const types = spec.type ? [].concat(spec.type) : []
  if (types.length > 0) {
    const actual = Array.isArray(value) ? 'array'
      : value === null ? 'null'
        : typeof value === 'number' ? (Number.isInteger(value) ? 'integer' : 'number')
          : typeof value
    const ok = types.some(type => type === actual || (type === 'number' && actual === 'integer'))
    if (!ok) {
      problems.push(where + ': expected ' + types.join('|') + ', got ' + actual)
      return
    }
  }
  if (Array.isArray(spec.enum) && spec.enum.indexOf(value) < 0) {
    problems.push(where + ': value ' + JSON.stringify(value) + ' not in enum')
  }
  if (typeof value === 'number') {
    if (typeof spec.minimum === 'number' && value < spec.minimum) problems.push(where + ': below minimum ' + spec.minimum)
    if (typeof spec.maximum === 'number' && value > spec.maximum) problems.push(where + ': above maximum ' + spec.maximum)
  }
  if (typeof value === 'string') {
    if (spec.maxLength && value.length > spec.maxLength) problems.push(where + ': longer than maxLength')
    if (spec.pattern) {
      const pattern = new RegExp(spec.pattern.replace(/^\^|\$$/g, ''))
      if (!pattern.test(value)) problems.push(where + ': does not match pattern')
    }
  }
  if (Array.isArray(value)) {
    if (spec.minItems && value.length < spec.minItems) problems.push(where + ': fewer than minItems')
    if (spec.maxItems && value.length > spec.maxItems) problems.push(where + ': more than maxItems')
    if (spec.items) value.forEach((item, index) => validate(item, spec.items, where + '[' + index + ']'))
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of spec.required || []) {
      if (!(key in value)) problems.push(where + ': missing required ' + key)
    }
    const props = spec.properties || {}
    for (const [key, child] of Object.entries(value)) {
      if (props[key]) validate(child, props[key], where + '.' + key)
      else if (spec.additionalProperties === false) problems.push(where + ': unexpected field ' + key)
    }
  }
}

const expectedFixtures = ['minimal.json', 'lyrical.json', 'geometric.json', 'symbolic.json', 'wild.json']
const fixtureData = {}
for (const name of expectedFixtures) {
  const file = path.join(fixturesDir, name)
  if (!fs.existsSync(file)) {
    problems.push('missing fixture examples/v3/' + name)
    continue
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  fixtureData[name] = data
  validate(data, schema, 'examples/v3/' + name)
}

// Style intent: fixtures must cover L0..L3 and at least one unknown vocabulary.
{
  const minimal = fixtureData['minimal.json'] || {}
  if (minimal.layers) problems.push('minimal.json should stay at L0 (no layers)')
  if (typeof minimal.intensity !== 'number') problems.push('minimal.json needs intensity')
}
{
  const lyrical = fixtureData['lyrical.json'] || {}
  if (!Array.isArray(lyrical.layers) || lyrical.layers.length < 2) problems.push('lyrical.json needs multiple layers')
  if (!(lyrical.variation > 0)) problems.push('lyrical.json should use variation')
  const hasEcho = (lyrical.layers || []).some(layer => (layer.relations || []).some(rel => rel.type === 'echo'))
  if (!hasEcho) problems.push('lyrical.json should use an echo relation')
}
{
  const geometric = fixtureData['geometric.json'] || {}
  const hasRotate = (geometric.layers || []).some(layer => layer.motion && layer.motion.rotate)
  if (!hasRotate) problems.push('geometric.json should use rotate')
}
{
  const symbolic = fixtureData['symbolic.json'] || {}
  if (!symbolic.macros || !symbolic.macros.sigil) problems.push('symbolic.json should define the sigil macro')
  const hasMacroLayer = (symbolic.layers || []).some(layer => layer.primitive === 'macro')
  if (!hasMacroLayer) problems.push('symbolic.json should reference a macro layer')
}
{
  const wild = fixtureData['wild.json'] || {}
  const unknown = (wild.layers || []).some(layer => ['blob', 'ring', 'band', 'spiral', 'lines', 'haze', 'particles', 'macro'].indexOf(layer.primitive) < 0 && layer.fallback)
  if (!unknown) problems.push('wild.json should exercise an unknown primitive with fallback')
  if (!Array.isArray(wild.keyframes) || wild.keyframes.length < 2) problems.push('wild.json should use keyframes')
  if ((wild.layers || []).length < 8) problems.push('wild.json should reach the 8-layer budget')
}

// Downgrade matrix must stay documented (these rows are the compatibility promise).
const doc = fs.readFileSync(diagPath, 'utf8')
for (const needle of ['未知 primitive', 'macro 未定义', '不支持 particles', '层数超限', '不支持 keyframes', '不支持 variation', '参数非法', '整块不可解析', '全空']) {
  if (!doc.includes(needle)) problems.push('docs/protocol-v3.md downgrade matrix is missing: ' + needle)
}
if (!doc.includes('程序')) problems.push('docs/protocol-v3.md should state the program-safety promise')
if (!doc.includes('种子') && !doc.includes('seed')) problems.push('docs/protocol-v3.md should describe the generative seed')

if (problems.length > 0) {
  console.error('protocol v3 check failed:')
  for (const problem of problems) console.error(' - ' + problem)
  process.exit(1)
}
console.log('protocol v3 check OK (' + expectedFixtures.length + ' fixtures validated)')
