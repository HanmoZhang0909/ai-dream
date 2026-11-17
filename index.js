/**
 * Host half of the AI canvas bundle.
 *
 * The Web client renders the latest ```canvas block from an assistant reply as
 * a living emotional glow in a right-sidebar panel. Protocol v2 lets the model
 * define its own emotions (name, palette, motion, form) on top of the built-in
 * fallback moods. This half teaches the convention and owns no durable state.
 */

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

export const inject = ['systemPrompt']

/** Register the prompt section that defines the canvas convention. */
export function apply(ctx) {
  ctx.systemPrompt.section({
    name: 'ai-canvas:instructions',
    order: 9500,
    text: INSTRUCTIONS,
  })
}
