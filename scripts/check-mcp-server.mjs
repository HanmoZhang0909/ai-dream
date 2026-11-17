// MCP server handler checks (no dependencies, no child processes).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { callTool, handle, listResources, listTools, readResource } from '../mcp/server.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'mcp/app-manifest.json'), 'utf8'))
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

// --- initialize ---------------------------------------------------------------
{
  const response = await handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } })
  assert.equal(response.jsonrpc, '2.0')
  assert.equal(response.id, 1)
  assert.equal(response.result.protocolVersion, '2024-11-05')
  assert.ok(response.result.capabilities.tools)
  assert.ok(response.result.capabilities.resources)
  assert.equal(response.result.serverInfo.name, 'ai-dream')
  assert.equal(response.result.serverInfo.version, pkg.version)
}

// --- tools --------------------------------------------------------------------
{
  const tools = listTools()
  assert.equal(tools.length, 1)
  assert.equal(tools[0].name, 'express_emotion')
  assert.equal(tools[0].inputSchema.required.includes('kind'), true)
  const listed = await handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
  assert.deepEqual(listed.result.tools, tools)
}

{
  const result = callTool('express_emotion', {
    kind: 'mood',
    name: 'mcp-test',
    intensity: 3,
    palette: { base: '#101010', core: '#abcdef', tone: '#202020', spectrum: ['#303030', '#404040'] },
    form: 'ring',
    transition: { style: 'burst', speed: 'fast' },
  })
  const payload = JSON.parse(result.content[0].text)
  assert.equal(payload.ok, true)
  assert.equal(payload.protocol, 2)
  assert.equal(payload.intensity, 1, 'intensity is clamped like the client')
  assert.equal(payload.pattern, 'ring')
  assert.equal(payload.colors.core, '#abcdef')
  assert.equal(payload.transition.style, 'burst')
}

{
  const response = await handle({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'express_emotion', arguments: { kind: 'cards' } } })
  assert.equal(response.error.code, -32602)
  const unknown = await handle({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope', arguments: { kind: 'mood' } } })
  assert.equal(unknown.error.code, -32602)
  const missing = await handle({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'express_emotion' } })
  assert.equal(missing.error.code, -32602)
}

// --- resources ----------------------------------------------------------------
{
  const resources = listResources()
  assert.equal(resources.length, 1)
  assert.equal(resources[0].uri, 'ai-dream://renderer')
  assert.equal(resources[0].mimeType, 'text/html')
  const read = readResource('ai-dream://renderer')
  assert.ok(read.contents[0].text.includes('probe'))
  assert.ok(read.contents[0].text.includes('core.mjs'))
  assert.throws(() => readResource('ai-dream://missing'), /Resource not found/)
}

// --- protocol edges -----------------------------------------------------------
{
  assert.equal((await handle({ jsonrpc: '2.0', id: 6, method: 'ping' })).result !== undefined, true)
  assert.equal((await handle({ jsonrpc: '2.0', id: 7, method: 'unknown/method' })).error.code, -32601)
  assert.equal((await handle({ jsonrpc: '2.0', id: 8 })).error.code, -32600)
  assert.equal((await handle(null)).error.code, -32600)
  assert.equal((await handle({ jsonrpc: '2.0', id: 9, method: 'tools/list' })).id, 9)
}

// --- manifest stays the source of truth --------------------------------------
assert.equal(manifest.tool.name, listTools()[0].name)
assert.equal(manifest.resources.renderer, 'resources/ai-dream.html')

console.log('mcp server checks OK')
