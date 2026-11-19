// MCP app manifest check (no dependencies): keeps the portable tool contract in
// sync with the expression protocol the DSH client actually implements.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'mcp/app-manifest.json'), 'utf8'))
const problems = []
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function expect(condition, message) {
  if (!condition) problems.push(message)
}

expect(manifest.name === 'ai-dream', 'manifest.name must be ai-dream')
expect(manifest.protocol === 3, 'manifest.protocol must be 3 (expression protocol v3)')
expect(manifest.manifestVersion === 1, 'manifest.manifestVersion must be 1')

const tool = manifest.tool || {}
expect(tool.name === 'express_emotion', 'tool.name must be express_emotion')
const schema = tool.inputSchema || {}
expect(schema.type === 'object', 'inputSchema.type must be object')
expect(Array.isArray(schema.required) && schema.required.includes('kind'), 'kind must be required')
expect(schema.properties && schema.properties.kind && schema.properties.kind.const === 'mood', 'kind must be the mood literal')

const props = schema.properties || {}
expect(props.name && props.name.maxLength === 40, 'name maxLength must match the protocol (40)')
expect(props.intensity && props.intensity.minimum === 0.2 && props.intensity.maximum === 1, 'intensity range must be 0.2..1')

// v3: open vocabulary — form/primitive/motion are free strings, not enums.
expect(props.form && props.form.type === 'string' && props.form.maxLength === 40, 'form must be an open string (v3)')

const palette = props.palette && props.palette.properties
expect(palette && palette.base && HEX.test('#0b0a12'), 'palette.base hex pattern must exist')
for (const key of ['base', 'core', 'tone']) {
  expect(palette && palette[key] && typeof palette[key].pattern === 'string', `palette.${key} pattern is required`)
}
expect(palette && palette.spectrum && palette.spectrum.minItems === 2 && palette.spectrum.maxItems === 4, 'palette.spectrum must allow 2..4 colours')

// v3 layer/macro/keyframe/relationship surface.
const layers = props.layers || {}
expect(layers.type === 'array' && layers.maxItems === 8, 'layers must allow at most 8 items')
const layerDef = manifest.definitions && manifest.definitions.layer
expect(layerDef && layerDef.properties && layerDef.properties.primitive && layerDef.properties.primitive.type === 'string', 'layer.primitive must be an open string')
for (const key of ['fallback', 'softness', 'opacity', 'blend', 'paletteSlot', 'grain', 'gloss', 'direction', 'transform', 'mask', 'motion', 'relations', 'keyframes']) {
  expect(layerDef && layerDef.properties && layerDef.properties[key], `layer.${key} must be present`)
}
const relations = layerDef && layerDef.properties && layerDef.properties.relations
expect(relations && relations.type === 'array' && relations.maxItems === 3, 'layer.relations must allow at most 3 entries')
expect(JSON.stringify(relations && relations.items && relations.items.properties && Object.keys(relations.items.properties).sort()) === JSON.stringify(['delay', 'strength', 'target', 'type']), 'relation fields drifted')

expect(props.macros && props.macros.type === 'object', 'macros must be an object of layers')
expect(props.seed && props.seed.type === 'integer' && props.seed.minimum === 0, 'seed must be a non-negative integer')
expect(props.variation && props.variation.minimum === 0 && props.variation.maximum === 1, 'variation must be 0..1')
expect(props.afterglow && props.afterglow.properties, 'afterglow must be described')
expect(props.keyframes && props.keyframes.$ref === '#/definitions/keyframes', 'keyframes must reference the shared definition')
expect(props.requires && props.requires.type === 'array', 'requires must be an array')

const keyframes = manifest.definitions && manifest.definitions.keyframes
expect(keyframes && keyframes.minItems === 2 && keyframes.maxItems === 12, 'keyframes must allow 2..12 frames')
expect(keyframes && keyframes.items && keyframes.items.properties && keyframes.items.properties.at && keyframes.items.properties.at.maximum === 1, 'keyframe.at must be 0..1')

const transition = props.transition && props.transition.properties
expect(JSON.stringify(transition && transition.style && transition.style.enum) === JSON.stringify(['soft', 'ripple', 'burst', 'dissolve', 'snap']), 'transition.style enum drifted')
expect(JSON.stringify(transition && transition.speed && transition.speed.enum) === JSON.stringify(['slow', 'medium', 'fast']), 'transition.speed enum drifted')

expect(manifest.resources && manifest.resources.renderer, 'resources.renderer is required')
expect(manifest.resources && manifest.resources.persistence === 'none', 'the portable renderer must not persist state')
expect(manifest.hosts && manifest.hosts.dsh && manifest.hosts.chatgpt && manifest.hosts.claude, 'host matrix is required')

// The renderer target must stay documented; the file itself is produced when porting.
const doc = path.join(root, 'docs/mcp-app.md')
if (!fs.existsSync(doc)) problems.push('docs/mcp-app.md is missing')

// Protocol v3 doc must mention the synchronized manifest.
const v3doc = path.join(root, 'docs/protocol-v3.md')
if (!fs.existsSync(v3doc)) problems.push('docs/protocol-v3.md is missing')
else if (!fs.readFileSync(v3doc, 'utf8').includes('express_emotion')) problems.push('protocol-v3 must mention the express_emotion tool contract')

if (problems.length > 0) {
  console.error('mcp manifest check failed:')
  for (const problem of problems) console.error(' - ' + problem)
  process.exit(1)
}
console.log('mcp manifest check OK (protocol v3)')
