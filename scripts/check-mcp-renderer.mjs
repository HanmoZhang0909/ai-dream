// MCP renderer check: serves the repo and verifies resources/ai-dream.html in
// headless Chrome. Skips gracefully when Chrome is unavailable (e.g. some CI).
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' }

/** Validate a dumped DOM document; returns a list of problems. */
function validateDump(stdout) {
  const problems = []
  const match = String(stdout || '').match(/\{"ok":true[^<]*\}/)
  if (!match) return { problems: ['probe JSON missing from DOM'], probe: null }
  const probe = JSON.parse(match[0])
  if (probe.protocol === 3) {
    if (probe.tier !== 'L2' && probe.tier !== 'L3') problems.push('v3 probe must report L2/L3, got ' + probe.tier)
    if (!(probe.layers >= 1)) problems.push('v3 probe must report rendered layers')
    if (!Array.isArray(probe.primitives) || probe.primitives.length !== probe.layers) problems.push('v3 probe primitives must match layers')
    if (typeof probe.animated !== 'boolean') problems.push('v3 probe must report animation support')
    if (typeof probe.degradations !== 'number') problems.push('v3 probe must report degradation count')
    return { problems, probe }
  }
  if (probe.protocol !== 2) problems.push('protocol must be 2 (v2) or 3 (v3)')
  if (probe.pattern !== 'cloud') problems.push('default form must fall back to cloud, got ' + probe.pattern)
  if (probe.intensity !== 0.7) problems.push('intensity must survive normalization, got ' + probe.intensity)
  if (probe.c0 !== '243,230,255') problems.push('core colour must come from the spec palette, got ' + probe.c0)
  if (probe.c5 !== '10,7,18') problems.push('base colour must come from the spec palette, got ' + probe.c5)
  if (typeof probe.tau !== 'number' || probe.tau <= 0) problems.push('tau must be a positive number')
  return { problems, probe }
}

// Offline validation mode: `node check-mcp-renderer.mjs --from-dump <file>`.
if (process.argv[2] === '--from-dump') {
  const file = process.argv[3]
  if (!file || !fs.existsSync(file)) {
    console.error('renderer check failed: dump file missing')
    process.exit(1)
  }
  const { problems, probe } = validateDump(fs.readFileSync(file, 'utf8'))
  if (problems.length > 0) {
    console.error('mcp renderer check failed:')
    for (const problem of problems) console.error(' - ' + problem)
    process.exit(1)
  }
  console.log('mcp renderer check OK', JSON.stringify(probe))
  process.exit(0)
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe') : null,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate
  return null
}

const chrome = findChrome()
if (!chrome) {
  console.log('mcp renderer check skipped: Chrome not found (set CHROME_PATH to enable)')
  process.exit(0)
}

const profileDir = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMPDIR || '/tmp', 'ai-dream-chrome-'))
const baseArgs = [
  '--headless=new',
  '--disable-gpu',
  '--disable-extensions',
  '--no-first-run',
  '--no-default-browser-check',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--user-data-dir=' + profileDir,
]

const server = http.createServer((request, response) => {
  const urlPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)
  const file = path.normalize(path.join(root, urlPath))
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404); response.end('not found'); return
  }
  response.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(response)
})

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
const url = `http://127.0.0.1:${port}/resources/ai-dream.html?t=1`
console.log('renderer url:', url)

// Keep the page served for offline capture: `node check-mcp-renderer.mjs --serve`.
if (process.argv[2] === '--serve') {
  console.log('serving; press Ctrl+C to stop')
  await new Promise(() => {})
}

const result = spawnSync(chrome, [
  ...baseArgs,
  '--virtual-time-budget=5000',
  '--dump-dom',
  url,
], { encoding: 'utf8', timeout: 60000, windowsHide: true })

server.close()
if (result.error) {
  console.error('renderer check failed:', result.error.message)
  process.exit(1)
}
if (result.status !== 0) {
  console.error('renderer check failed: chrome exit ' + result.status)
  console.error(String(result.stderr || '').slice(0, 400))
  process.exit(1)
}

const dump = String(result.stdout || '')
const { problems, probe } = validateDump(dump)
if (!probe) {
  console.error('renderer check failed: probe JSON missing from DOM')
  console.error(dump.slice(0, 400))
  process.exit(1)
}

// Optional screenshot for human/agent inspection.
const shot = process.env.AI_DREAM_SHOT
if (shot) {
  const capture = spawnSync(chrome, [
    ...baseArgs,
    '--window-size=900,600',
    '--virtual-time-budget=5000',
    '--screenshot=' + shot,
    url,
  ], { encoding: 'utf8', timeout: 60000, windowsHide: true })
  if (capture.status === 0 && fs.existsSync(shot)) console.log('screenshot:', shot)
  else problems.push('screenshot capture failed')
}

if (problems.length > 0) {
  console.error('mcp renderer check failed:')
  for (const problem of problems) console.error(' - ' + problem)
  process.exit(1)
}
console.log('mcp renderer check OK', JSON.stringify(probe))
