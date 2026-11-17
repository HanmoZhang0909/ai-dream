// Regression check for the canvas fence extractor.
//
// Mirrors the regex in client.js: a fence only counts when it opens at the
// start of a line, so inline mentions like "emit a ```canvas block" must not
// be mistaken for a fenced block. The captured body keeps its trailing
// newline; the client trims it before parsing.
import assert from 'node:assert'

const FENCE = /^ {0,3}```canvas[^\n]*\n([\s\S]*?)^ {0,3}```/gm

function lastCanvasFence(text) {
  if (typeof text !== 'string' || text.indexOf('canvas') < 0) return null
  let found = null
  let match
  FENCE.lastIndex = 0
  while ((match = FENCE.exec(text)) !== null) found = match[1]
  return found
}

const body = text => (lastCanvasFence(text) ?? '').trim()

// 1. An inline mention must not match.
assert.equal(
  lastCanvasFence('Emit a ```canvas block when it helps.\n\nPlain prose follows.'),
  null,
  'inline mention was mistaken for a fence',
)

// 2. A real fence matches, and the body comes back (modulo the trailing newline).
const real = ['Some prose.', '', '```canvas', '{"kind":"mood","mood":"calm"}', '```', '', 'More prose.'].join('\n')
assert.equal(body(real), '{"kind":"mood","mood":"calm"}')

// 3. The newest fence wins.
const two = ['```canvas', '{"first":true}', '```', 'middle', '```canvas', '{"second":true}', '```'].join('\n')
assert.equal(body(two), '{"second":true}')

// 4. Unclosed fences are ignored (streaming safety).
assert.equal(lastCanvasFence('```canvas\n{"half":'), null)

// 5. Up to three leading spaces are a legal fence opener.
assert.equal(body('   ```canvas\n{"indented":true}\n   ```'), '{"indented":true}')

console.log('fence extractor OK')
