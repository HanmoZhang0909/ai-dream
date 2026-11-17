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
expect(manifest.protocol === 2, 'manifest.protocol must be 2 (expression protocol v2)')
expect(manifest.manifestVersion === 1, 'manifest.manifestVersion must be 1')

const tool = manifest.tool || {}
expect(tool.name === 'express_emotion', 'tool.name must be express_emotion')
const schema = tool.inputSchema || {}
expect(schema.type === 'object', 'inputSchema.type must be object')
expect(schema.additionalProperties === false, 'inputSchema must reject unknown fields')
expect(Array.isArray(schema.required) && schema.required.includes('kind'), 'kind must be required')
expect(schema.properties && schema.properties.kind && schema.properties.kind.const === 'mood', 'kind must be the mood literal')

const props = schema.properties || {}
expect(props.name && props.name.maxLength === 40, 'name maxLength must match the protocol (40)')
expect(props.intensity && props.intensity.minimum === 0.2 && props.intensity.maximum === 1, 'intensity range must be 0.2..1')

const palette = props.palette && props.palette.properties
expect(palette && palette.base && HEX.test('#0b0a12'), 'palette.base hex pattern must exist')
for (const key of ['base', 'core', 'tone']) {
  expect(palette && palette[key] && typeof palette[key].pattern === 'string', `palette.${key} pattern is required`)
}
expect(palette && palette.spectrum && palette.spectrum.minItems === 2 && palette.spectrum.maxItems === 4, 'palette.spectrum must allow 2..4 colours')

const motion = props.motion && props.motion.properties
expect(motion && motion.speed && motion.speed.minimum === 0.2 && motion.speed.maximum === 2, 'motion.speed range must be 0.2..2')
expect(motion && motion.amplitude && motion.amplitude.minimum === 0.1 && motion.amplitude.maximum === 1, 'motion.amplitude range must be 0.1..1')
expect(JSON.stringify(motion && motion.rhythm && motion.rhythm.enum) === JSON.stringify(['steady', 'breathing', 'uneven']), 'motion.rhythm enum drifted')

expect(JSON.stringify(props.form && props.form.enum) === JSON.stringify(['cloud', 'ring', 'streak', 'spiral']), 'form enum drifted')
const transition = props.transition && props.transition.properties
expect(JSON.stringify(transition && transition.style && transition.style.enum) === JSON.stringify(['soft', 'ripple', 'burst', 'dissolve', 'snap']), 'transition.style enum drifted')
expect(JSON.stringify(transition && transition.speed && transition.speed.enum) === JSON.stringify(['slow', 'medium', 'fast']), 'transition.speed enum drifted')

expect(manifest.resources && manifest.resources.renderer, 'resources.renderer is required')
expect(manifest.resources && manifest.resources.persistence === 'none', 'the portable renderer must not persist state')
expect(manifest.hosts && manifest.hosts.dsh && manifest.hosts.chatgpt && manifest.hosts.claude, 'host matrix is required')

// The renderer target must stay documented; the file itself is produced when porting.
const doc = path.join(root, 'docs/mcp-app.md')
if (!fs.existsSync(doc)) problems.push('docs/mcp-app.md is missing')

if (problems.length > 0) {
  console.error('mcp manifest check failed:')
  for (const problem of problems) console.error(' - ' + problem)
  process.exit(1)
}
console.log('mcp manifest check OK')
