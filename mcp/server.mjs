#!/usr/bin/env node
/**
 * Minimal MCP server for AI Dream (stdio JSON-RPC).
 *
 * Exposes one tool (`express_emotion`, schema from `mcp/app-manifest.json`) and
 * one resource (the portable renderer). The request handler is a pure async
 * function so it can be unit-tested without spawning the process.
 */
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { normalizeMood } from '../renderer/core.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'mcp/app-manifest.json'), 'utf8'))
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const RENDERER_URI = 'ai-dream://renderer'

export function rpcError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

export function listTools() {
  return [manifest.tool]
}

export function listResources() {
  return [{
    uri: RENDERER_URI,
    name: 'AI Dream renderer',
    description: 'Self-contained glow renderer; load it in the MCP App iframe.',
    mimeType: 'text/html',
  }]
}

export function readResource(uri) {
  if (uri !== RENDERER_URI) throw rpcError(-32002, 'Resource not found: ' + String(uri))
  return {
    contents: [{
      uri,
      mimeType: 'text/html',
      text: fs.readFileSync(path.join(root, 'resources/ai-dream.html'), 'utf8'),
    }],
  }
}

/** Normalize one tool call and return the MCP tool result content. */
export function callTool(name, args) {
  if (name !== 'express_emotion') throw rpcError(-32602, 'Unknown tool: ' + String(name))
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw rpcError(-32602, 'arguments must be an object')
  if (args.kind !== 'mood') throw rpcError(-32602, 'kind must be "mood"')
  const model = normalizeMood(args)
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        ok: true,
        protocol: 2,
        mood: model.mood,
        pattern: model.nebula.pattern,
        intensity: model.intensity,
        colors: model.colors,
        transition: model.transition,
      }),
    }],
  }
}

/** Pure JSON-RPC handler: request object in, response object out. */
export async function handle(message) {
  const request = message && typeof message === 'object' ? message : {}
  const base = { jsonrpc: '2.0', id: request.id }
  try {
    if (typeof request.method !== 'string' || request.method.length === 0) throw rpcError(-32600, 'Invalid Request')
    const method = request.method
    const params = request.params && typeof request.params === 'object' ? request.params : {}
    switch (method) {
      case 'initialize':
        return {
          ...base,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {}, resources: {} },
            serverInfo: { name: 'ai-dream', version: pkg.version },
          },
        }
      case 'ping':
        return { ...base, result: {} }
      case 'tools/list':
        return { ...base, result: { tools: listTools() } }
      case 'tools/call':
        return { ...base, result: callTool(params.name, params.arguments) }
      case 'resources/list':
        return { ...base, result: { resources: listResources() } }
      case 'resources/read':
        return { ...base, result: readResource(params.uri) }
      default:
        return { ...base, error: { code: -32601, message: 'Method not found: ' + method } }
    }
  } catch (error) {
    return {
      ...base,
      error: { code: typeof error.code === 'number' ? error.code : -32603, message: String(error.message || error) },
    }
  }
}

// stdio glue: newline-delimited JSON-RPC, one response per request with an id.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const rl = readline.createInterface({ input: process.stdin })
  rl.on('line', async line => {
    if (!line.trim()) return
    let message
    try {
      message = JSON.parse(line)
    } catch {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n')
      return
    }
    const response = await handle(message)
    if (response.id !== undefined && response.id !== null) process.stdout.write(JSON.stringify(response) + '\n')
  })
}
