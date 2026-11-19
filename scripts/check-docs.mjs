// Docs consistency check (no dependencies).
// Enforces the maintenance rules written in docs/README.md:
//   - required docs exist
//   - package version matches CHANGELOG and the market index
//   - legacy terminology was removed from current docs
//   - relative markdown links resolve
//   - planning docs carry a status/version line
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = rel => fs.existsSync(path.join(root, rel))
const problems = []

// 1. Required docs.
const required = [
  'README.md',
  'README.en.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'docs/README.md',
  'docs/product.md',
  'docs/architecture.md',
  'docs/expression-protocol.md',
  'docs/DETAIL.md',
  'docs/mcp-app.md',
  'docs/iterations.md',
  'docs/protocol-v3.md',
  'docs/protocol-v3.schema.json',
  'mcp/app-manifest.json',
  'mcp/server.mjs',
  'renderer/core.mjs',
  'resources/ai-dream.html',
  'examples/moods.md',
]
for (const rel of required) {
  if (!exists(rel)) problems.push(`missing required doc: ${rel}`)
}

// 2. Version consistency.
const pkg = JSON.parse(read('package.json'))
const changelog = read('CHANGELOG.md')
if (!changelog.includes(`## ${pkg.version}`)) {
  problems.push(`CHANGELOG.md has no "## ${pkg.version}" section for package.json version`)
}
const market = JSON.parse(read('docs/index.json'))
const marketVersions = market.plugins?.[0]?.versions?.map(version => version.version) ?? []
if (!marketVersions.includes(pkg.version)) {
  problems.push(`docs/index.json is missing version ${pkg.version} (has: ${marketVersions.join(', ') || 'none'})`)
}

// 3. Legacy terminology must be gone from current docs (CHANGELOG keeps history).
const current = [
  'README.md',
  'README.en.md',
  'docs/README.md',
  'docs/product.md',
  'docs/architecture.md',
  'docs/DETAIL.md',
  'examples/moods.md',
]
const banned = [
  { term: 'nebula', why: 'v0.3 field renamed to `form`' },
  { term: 'neurons', why: 'removed in v0.3' },
  { term: '受控词表', why: 'replaced by AI-defined emotions plus built-in fallback' },
  { term: 'controlled list of nine', why: 'replaced by AI-defined emotions plus built-in fallback' },
]
for (const rel of current) {
  const text = read(rel)
  for (const { term, why } of banned) {
    if (text.includes(term)) problems.push(`${rel}: legacy term "${term}" (${why})`)
  }
}

// 4. Relative markdown links resolve.
const linkPattern = /\[[^\]]*\]\(([^)\s#]+)(?:#[^)]*)?\)/g
for (const rel of [...current, 'docs/expression-protocol.md', 'docs/architecture.md']) {
  const text = read(rel)
  let match
  while ((match = linkPattern.exec(text)) !== null) {
    const target = match[1].trim()
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue
    const resolved = path.resolve(path.dirname(path.join(root, rel)), target)
    if (!fs.existsSync(resolved)) problems.push(`${rel}: broken relative link -> ${target}`)
  }
}

// 5. Planning docs carry a status or version line near the top.
for (const rel of ['docs/product.md', 'docs/architecture.md', 'docs/expression-protocol.md']) {
  const head = read(rel).split('\n').slice(0, 8).join('\n')
  if (!/状态：|版本：/.test(head)) problems.push(`${rel}: missing a status/version line near the top`)
}

if (problems.length > 0) {
  console.error('docs check failed:')
  for (const problem of problems) console.error(' - ' + problem)
  process.exit(1)
}
console.log('docs check OK')
