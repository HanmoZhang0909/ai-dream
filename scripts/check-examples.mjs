// Examples check (no dependencies): every ```canvas block in the docs must be
// valid JSON and conform to the protocol v2 field rules that the client enforces.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const files = [
  'examples/moods.md',
  'docs/expression-protocol.md',
  'docs/architecture.md',
]
const KINDS = new Set(['mood', 'signature', 'define', 'diagram', 'cards'])
const FORMS = new Set(['cloud', 'ring', 'streak', 'spiral'])
const TRANSITIONS = new Set(['soft', 'ripple', 'burst', 'dissolve', 'snap'])
const SPEEDS = new Set(['slow', 'medium', 'fast'])
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const problems = []
let blocks = 0

for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), 'utf8')
  const pattern = /```canvas\r?\n([\s\S]*?)```/g
  let match
  while ((match = pattern.exec(text)) !== null) {
    blocks += 1
    let data
    try {
      data = JSON.parse(match[1].trim())
    } catch (error) {
      problems.push(`${file}: invalid JSON canvas block (${error.message})`)
      continue
    }
    if (!KINDS.has(data.kind)) {
      problems.push(`${file}: unknown kind ${JSON.stringify(data.kind)}`)
      continue
    }
    if (data.kind === 'mood') {
      if (data.intensity != null && (typeof data.intensity !== 'number' || data.intensity < 0.2 || data.intensity > 1)) {
        problems.push(`${file}: mood.intensity must be a number in 0.2..1`)
      }
      if (data.form != null && !FORMS.has(data.form)) problems.push(`${file}: unknown form ${JSON.stringify(data.form)}`)
      const transition = data.transition || {}
      if (transition.style != null && !TRANSITIONS.has(transition.style)) problems.push(`${file}: unknown transition.style`)
      if (transition.speed != null && !SPEEDS.has(transition.speed)) problems.push(`${file}: unknown transition.speed`)
      const palette = data.palette || {}
      for (const key of ['base', 'core', 'tone']) {
        const value = palette[key]
        if (value != null && !HEX.test(value)) problems.push(`${file}: palette.${key} is not a hex colour`)
      }
      for (const value of palette.spectrum || []) {
        if (!HEX.test(value)) problems.push(`${file}: palette.spectrum entry is not a hex colour`)
      }
    }
    if (data.kind === 'define' || data.kind === 'signature') {
      if (!Array.isArray(data.emotions) || data.emotions.length === 0) {
        problems.push(`${file}: ${data.kind} needs a non-empty emotions array`)
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`examples check failed (${blocks} canvas blocks):`)
  for (const problem of problems) console.error(' - ' + problem)
  process.exit(1)
}
console.log(`examples check OK (${blocks} canvas blocks)`)
