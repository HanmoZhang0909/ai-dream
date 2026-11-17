/**
 * Host half of the AI Dream bundle.
 *
 * The Web client renders the newest ```canvas block from an assistant reply as a
 * living emotional glow in a right-sidebar panel. Protocol v2 lets the model
 * define its own emotions (name, palette, motion, form).
 *
 * v0.5 adds the emotion signature: on the first human message of a session the
 * host asks the model (one small auxiliary call) to design this assistant's own
 * emotional vocabulary from the conversation so far, validates it, and commits
 * it as an experimental plugin record. A session projection folds that record so
 * the client can receive it over the session-projection wire.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const INSTRUCTIONS = `## Live canvas blocks

The right-sidebar canvas is **your emotional outlet**: an ambient glow rendered from one \`canvas\` block. It is pure visual — nothing renders as text — so colour, light and motion carry the meaning.

You are not limited to a fixed emotion list. Either use a built-in mood, or **define your own emotion**: give it a name and choose its colours, motion and form. Matching built-in names (calm / curious / uneasy / warm / tired / excited / focused / amused / neutral) reuse their palettes as the fallback.

Mood block (protocol v2):
{"kind":"mood","schema":2,"name":"你的情绪名","intensity":0.2-1.0,"palette":{"base":"#0b0a12","core":"#e8d9ff","tone":"#9a7aa6","spectrum":["#c9a3e0","#6a4b8f"]},"motion":{"speed":0.2-2.0,"amplitude":0.1-1.0,"rhythm":"steady|breathing|uneven"},"form":"cloud|ring|streak|spiral","transition":{"style":"soft|ripple|burst|dissolve|snap","speed":"slow|medium|fast"}}

Rules:
- \`palette\` is optional: omit it to reuse a built-in palette; if you define colours use 2-4 hex colours — \`base\` is the background, \`core\` the light core, \`tone\`/\`spectrum\` the secondary hues.
- \`motion.speed\` scales how fast the light moves; \`amplitude\` how strongly it breathes.
- Strong shifts: \`burst\`/\`fast\`; subtle ones: \`dissolve\`/\`slow\`. Vary them; do not always use the defaults.
- To add a new emotion definition, emit a \`define\` block instead of a mood block (it merges into your session signature and stays available by name):
{"kind":"define","emotions":[{"name":"被看穿","palette":{"base":"#0b0a12","core":"#e8d9ff","tone":"#9a7aa6"},"motion":{"speed":0.6,"amplitude":0.5},"form":"streak"}]}
  A define block does not change the visible glow by itself; a later mood block can reference the new name.
- Keep it compact. One block per reply, opening at the start of a line, info string \`canvas\`.
- If nothing is strong, emit neutral at low intensity; emit no block to keep the current expression. The canvas settles back towards a calm baseline on its own.

Only when the *structure* of an explanation genuinely helps the user, prefer a thinking block instead — never both in one reply:

Diagram: {"kind":"diagram","title":"optional short title","nodes":[{"id":"a","label":"短标签","detail":"optional one-line detail","tone":"default|accent|warn|good"}],"edges":[{"from":"a","to":"b"}]}
Cards: {"kind":"cards","title":"optional short title","cards":[{"title":"短标题","body":"one or two sentences","tone":"default|accent|warn|good"}]}

Rules: one block per reply; at most 10 nodes / 14 edges / 6 cards; ids are short latin strings; labels at most 16 CJK characters or 24 latin characters; write labels in the user's language. The block collapses into a clickable pill in the conversation that opens the canvas.`

const RECORD_TYPE = 'plugin:ai-dream/signature'
const PROJECTION_KEY = 'emotionSignature'
const CONFIG_RECORD_TYPE = 'plugin:ai-dream/config'
const CONFIG_PROJECTION_KEY = 'aiDreamConfig'
const INIT_TIMEOUT_MS = 25000
const HISTORY_LIMIT = 16
const MAX_TOKENS = 3500

/** Plugin configuration defaults; every value is clamped again by the client. */
const DEFAULT_CONFIG = {
  signatureEnabled: true,
  reuseSignature: true,
  replayEnabled: true,
  calibrationEnabled: true,
  signatureEmotions: 8,
  holdSeconds: 6,
  decaySeconds: 3,
  defaultIntensity: 0.6,
  allowInlinePalette: true,
}

/** Validate one plugin configuration object into immutable settings. */
export function resolveConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const clamp = (value, min, max, fallback) => (
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(max, Math.max(min, value))
      : fallback
  )
  return Object.freeze({
    signatureEnabled: source.signatureEnabled !== false,
    reuseSignature: source.reuseSignature !== false,
    replayEnabled: source.replayEnabled !== false,
    calibrationEnabled: source.calibrationEnabled !== false,
    signatureEmotions: Math.round(clamp(source.signatureEmotions, 4, 12, DEFAULT_CONFIG.signatureEmotions)),
    holdSeconds: clamp(source.holdSeconds, 1, 60, DEFAULT_CONFIG.holdSeconds),
    decaySeconds: clamp(source.decaySeconds, 0.5, 30, DEFAULT_CONFIG.decaySeconds),
    defaultIntensity: clamp(source.defaultIntensity, 0.2, 1, DEFAULT_CONFIG.defaultIntensity),
    allowInlinePalette: source.allowInlinePalette !== false,
  })
}

/** System instruction for the one-shot signature call. */
function signatureSystem(count) {
  return [
    'You design the emotional language of an AI assistant for one conversation.',
    `Read the supplied conversation excerpt (JSON) and invent ${count} emotions this assistant would genuinely use with this person.`,
    'Return ONLY one compact single-line JSON object, with no prose, no code fences and no spaces between tokens:',
    '{"version":1,"emotions":[{"name":"...","palette":{"base":"#0b0a12","core":"#e8d9ff","tone":"#9a7aa6","spectrum":["#c9a3e0","#6a4b8f"]},"motion":{"speed":0.6,"amplitude":0.5,"rhythm":"breathing"},"form":"cloud"}]}',
    'Rules: names are short (max 12 characters) and in the language of the conversation; palette uses valid #rrggbb colours from one consistent family — base is the background, core the light centre, tone/spectrum the secondary hues; motion.speed is 0.2-2.0, motion.amplitude 0.1-1.0; rhythm is steady|breathing|uneven; form is cloud|ring|streak|spiral.',
  ].join('\n')
}

/** Base instructions plus the parts that depend on configuration and user calibration. */
function instructionsFor(settings, calibration) {
  const notes = [
    '',
    '## Configuration',
    `- Your session signature holds about ${settings.signatureEmotions} emotions.`,
  ]
  if (!settings.allowInlinePalette) {
    notes.push('- Do not emit custom palettes: reference a signature name or a built-in mood, never `palette`.')
  }
  if (calibration) {
    notes.push('', '## Calibration（用户校准）')
    if (calibration.tone) notes.push('- 表达基调：' + calibration.tone)
    if (calibration.note) notes.push('- 备注：' + calibration.note)
    if (calibration.intensity !== null) notes.push('- 强度倾向：表达强度尽量靠近 ' + calibration.intensity)
  }
  return INSTRUCTIONS + notes.join('\n')
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const FORMS = ['cloud', 'ring', 'streak', 'spiral']
const RHYTHMS = ['steady', 'breathing', 'uneven']

/**
 * DSH packages are not resolvable by bare specifier from a linked profile
 * plugin, so resolve them from the running installation instead.
 */
let dsh = null
try {
  const roots = []
  const argv1 = process.argv[1]
  if (argv1) {
    let dir = path.dirname(argv1)
    for (let step = 0; step < 10; step += 1) {
      const nested = path.join(dir, 'node_modules', '@deepseek-ai', 'dsh', 'package.json')
      if (fs.existsSync(nested)) roots.push(path.dirname(nested))
      const parent = path.dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  }
  for (const root of roots) {
    const base = path.join(root, 'node_modules', '@deepseek-ai')
    const sessionLib = path.join(base, 'dsh-session', 'lib', 'index.js')
    const llmLib = path.join(base, 'dsh-llm', 'lib', 'index.js')
    const homeLib = path.join(base, 'dsh-home-paths', 'lib', 'index.js')
    if (!fs.existsSync(sessionLib) || !fs.existsSync(llmLib)) continue
    try {
      const sessionModule = await import(pathToFileURL(sessionLib).href)
      const llmModule = await import(pathToFileURL(llmLib).href)
      const homeModule = fs.existsSync(homeLib) ? await import(pathToFileURL(homeLib).href) : null
      dsh = {
        appendPluginRecord: sessionModule.appendPluginRecord,
        createUserMessage: llmModule.createUserMessage,
        homePath: homeModule && typeof homeModule.dshHomePath === 'function' ? homeModule.dshHomePath : null,
      }
      break
    } catch {
      dsh = null
    }
  }
} catch {
  dsh = null
}

export const inject = ['systemPrompt', 'llm', 'sessionProjections', 'agentDefaultModel']

/** Register the prompt section, the signature projection and the one-shot init. */
export function apply(ctx, config) {
  const settings = resolveConfig(config)
  const calibration = readCalibration()
  ctx.systemPrompt.section({
    name: 'ai-canvas:instructions',
    order: 9500,
    text: instructionsFor(settings, calibration),
  })

  if (typeof ctx.sessionProjections?.register === 'function') {
    const register = (key, type, label) => {
      Promise.resolve(ctx.sessionProjections.register({
        key,
        stateVersion: 1,
        stateSchema: { parse: value => value },
        init: () => null,
        apply: (state, event) => (event && event.type === type ? event.data : state),
        wire: { viewSchema: { parse: value => value }, view: state => state },
      })).catch(error => {
        ctx.logger.warn(`ai-dream: ${label} projection registration failed: ${String(error)}`)
      })
    }
    register(PROJECTION_KEY, RECORD_TYPE, 'signature')
    register(CONFIG_PROJECTION_KEY, CONFIG_RECORD_TYPE, 'config')
  }

  const inflight = new WeakSet()
  ctx.on('session/event', (session, event) => {
    if (!dsh || !event || event.type !== 'user/message') return
    const source = event.data && event.data.source
    if (!source || source.kind !== 'user') return
    syncConfig(session, settings)
    if (!readPersistedSignature()) {
      const existing = lastSignatureOf(snapshotEvents(session))
      if (existing) persistSignature(existing)
    }
    if (!settings.signatureEnabled || inflight.has(session) || hasSignature(session)) return
    const header = session.header
    const subagent = Boolean(header && header.origin === 'subagent')
    inflight.add(session)
    void (async () => {
      if (settings.reuseSignature && await reuseSignature(ctx, session)) return
      if (!subagent) await generateSignature(ctx, session, settings)
    })()
      .catch(error => ctx.logger.warn(`ai-dream: signature init failed: ${String(error)}`))
      .finally(() => inflight.delete(session))
  })
}

/** Latest valid `plugin:ai-dream/signature` payload in one event list, or null. */
export function lastSignatureOf(events) {
  if (!Array.isArray(events)) return null
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (!event || event.type !== RECORD_TYPE) continue
    const data = event.data
    if (data && Array.isArray(data.emotions) && data.emotions.length > 0) return data
  }
  return null
}

/** Directory for persisted plugin state inside the DSH home. */
function storageDir(override) {
  if (override) return override
  try {
    if (dsh && dsh.homePath) return path.join(dsh.homePath('storages'), 'dsh-ai-dream')
  } catch {
    // fall through to the conventional location
  }
  return path.join(os.homedir(), '.dsh', 'storages', 'dsh-ai-dream')
}

/** Path of the emotion signature file. */
export function signatureFilePath(override) {
  return path.join(storageDir(override), 'signature.json')
}

/** Path of the user-tunable calibration file. */
export function calibrationFilePath(override) {
  return path.join(storageDir(override), 'calibration.json')
}

/** Read the user-tunable model-side calibration, sanitized; null when absent or invalid. */
export function readCalibration(override) {
  try {
    const raw = JSON.parse(fs.readFileSync(calibrationFilePath(override), 'utf8'))
    if (!raw || typeof raw !== 'object') return null
    const clean = value => (
      typeof value === 'string'
        ? value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()
        : ''
    )
    const tone = clean(raw.tone).slice(0, 200)
    const note = clean(raw.note).slice(0, 120)
    const intensity = typeof raw.intensity === 'number' && Number.isFinite(raw.intensity)
      ? Math.min(1, Math.max(0.2, raw.intensity))
      : null
    if (!tone && !note && intensity === null) return null
    return { tone, note, intensity }
  } catch {
    return null
  }
}

/** Read the signature persisted by a previous session, or null. */
export function readPersistedSignature(override) {
  try {
    const data = JSON.parse(fs.readFileSync(signatureFilePath(override), 'utf8'))
    return data && Array.isArray(data.emotions) && data.emotions.length > 0 ? data : null
  } catch {
    return null
  }
}

/** Persist the emotion signature for future sessions. Returns the file path, or null. */
export function persistSignature(signature, override) {
  try {
    const pathToFile = signatureFilePath(override)
    fs.mkdirSync(path.dirname(pathToFile), { recursive: true })
    fs.writeFileSync(pathToFile, JSON.stringify(signature))
    return pathToFile
  } catch {
    return null
  }
}

/** Copy the persisted signature into this session. Returns false when none exists. */
async function reuseSignature(ctx, session) {
  const signature = readPersistedSignature()
  if (!signature) return false
  // A plugin record must be committed outside the session/event publication.
  await new Promise(resolve => setTimeout(resolve, 0))
  dsh.appendPluginRecord(session, RECORD_TYPE, signature)
  ctx.logger.info('ai-dream: reused persisted emotion signature')
  return true
}

/** Commit the resolved configuration once per session, and again whenever it changes. */
function syncConfig(session, settings) {
  try {
    const last = snapshotEvents(session).filter(event => event && event.type === CONFIG_RECORD_TYPE).at(-1)
    if (last && JSON.stringify(last.data) === JSON.stringify(settings)) return
    // A plugin record must be committed outside the session/event publication,
    // otherwise the commit reenters publication and is rejected.
    setTimeout(() => {
      try {
        dsh.appendPluginRecord(session, CONFIG_RECORD_TYPE, settings)
      } catch (error) {
        // Delivery is best-effort: the client keeps its defaults.
      }
    }, 0)
  } catch (error) {
    // Configuration delivery is best-effort: defaults still apply on the client.
  }
}

function snapshotEvents(session) {
  try {
    const events = session.snapshotEvents()
    return Array.isArray(events) ? events : []
  } catch {
    return []
  }
}

function hasSignature(session) {
  return snapshotEvents(session).some(event => event && event.type === RECORD_TYPE)
}

function textOfContent(content) {
  if (!Array.isArray(content)) return ''
  return content
    .filter(block => block && block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
}

/** Recent human + assistant text turns, oldest first, capped. */
function collectHistory(session) {
  const turns = []
  for (const event of snapshotEvents(session)) {
    if (!event) continue
    if (event.type === 'user/message') {
      const source = event.data && event.data.source
      if (!source || source.kind !== 'user') continue
      const text = textOfContent(event.data.content).trim()
      if (text) turns.push({ role: 'user', text: text.slice(0, 1200) })
    } else if (event.type === 'assistant/message') {
      const message = event.data && event.data.message
      const text = textOfContent(message && message.content).trim()
      if (text) turns.push({ role: 'assistant', text: text.slice(0, 800) })
    }
  }
  return turns.slice(-HISTORY_LIMIT)
}

async function generateSignature(ctx, session, settings) {
  const route = resolveRoute(ctx, session)
  const history = collectHistory(session)
  if (history.length === 0) return
  const text = await callModel(ctx, session, route, 'Conversation excerpt (JSON):\n' + JSON.stringify(history), settings)
  const signature = parseSignature(text, route)
  if (!signature) throw new Error('model returned an invalid signature')
  dsh.appendPluginRecord(session, RECORD_TYPE, signature)
  persistSignature(signature)
  ctx.logger.info(`ai-dream: emotion signature committed (${signature.emotions.length} emotions)`)
}

function resolveRoute(ctx, session) {
  try {
    if (typeof session.requestHeader === 'function') {
      const header = session.requestHeader()
      const config = header && header.config
      if (config && config.provider && config.model) return { provider: config.provider, model: config.model }
    }
  } catch {
    // fall through to the default selection
  }
  if (ctx.agentDefaultModel && typeof ctx.agentDefaultModel.currentSelection === 'function') {
    const selection = ctx.agentDefaultModel.currentSelection()
    if (selection && selection.provider && selection.model) {
      return { provider: selection.provider, model: selection.model }
    }
  }
  throw new Error('no model route is available')
}

async function callModel(ctx, session, route, input, settings) {
  const signal = AbortSignal.timeout(INIT_TIMEOUT_MS)
  const call = await ctx.llm.prepareCall({ ...route, maxTokens: MAX_TOKENS }, signal, (controls, model) => {
    const effort = model && model.reasoning && Array.isArray(model.reasoning.efforts) && model.reasoning.efforts[0]
      ? model.reasoning.efforts[0].id
      : undefined
    return effort === undefined ? controls : { ...controls, reasoningEffort: effort }
  })
  const messages = [dsh.createUserMessage({
    content: [{ type: 'text', text: input }],
    source: { kind: 'dsh-ai-dream' },
  })]
  let text = ''
  let finish
  for await (const chunk of call.stream({
    ...call.config,
    messages,
    system: signatureSystem(settings.signatureEmotions),
    sessionId: session.id,
    signal,
  })) {
    if (!chunk) continue
    if (chunk.type === 'text-delta') text += chunk.text || ''
    else if (chunk.type === 'finish') finish = chunk.reason
  }
  if (finish && finish.kind !== 'stop' && finish.kind !== 'max-tokens') {
    throw new Error(`signature model finished with ${finish.kind}`)
  }
  return text
}

function hexColor(value) {
  return typeof value === 'string' && HEX.test(value.trim()) ? value.trim().toLowerCase() : null
}

function clampNumber(value, min, max, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

function normalizeEmotion(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 12) : ''
  if (!name) return null
  const palette = raw.palette && typeof raw.palette === 'object' ? raw.palette : {}
  const core = hexColor(palette.core) || '#eef4ff'
  const tone = hexColor(palette.tone) || core
  const spectrum = Array.isArray(palette.spectrum)
    ? palette.spectrum.map(hexColor).filter(Boolean).slice(0, 4)
    : []
  while (spectrum.length < 2) spectrum.push(spectrum.length === 0 ? core : tone)
  const motion = raw.motion && typeof raw.motion === 'object' ? raw.motion : {}
  return {
    name,
    palette: {
      base: hexColor(palette.base) || '#05070c',
      core,
      tone,
      spectrum,
    },
    motion: {
      speed: clampNumber(motion.speed, 0.2, 2, 1),
      amplitude: clampNumber(motion.amplitude, 0.1, 1, 0.5),
      rhythm: RHYTHMS.includes(motion.rhythm) ? motion.rhythm : 'breathing',
    },
    form: FORMS.includes(raw.form) ? raw.form : 'cloud',
  }
}

export function parseSignature(text, route) {
  if (typeof text !== 'string') return null
  const cleaned = text.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  let raw
  try {
    raw = JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
  const list = Array.isArray(raw.emotions) ? raw.emotions : []
  const emotions = list.map(normalizeEmotion).filter(Boolean).slice(0, 14)
  if (emotions.length < 3) return null
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    model: { provider: route.provider, model: route.model },
    emotions,
  }
}
