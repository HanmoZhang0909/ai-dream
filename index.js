/**
 * Host half of the AI canvas bundle.
 *
 * The Web client renders the latest ```canvas block from an assistant reply as
 * a living nebula in a right-sidebar panel: the background is the assistant's
 * subconscious emotion, the star field is its neural activity, the centre orb
 * is what it actively wants to express, and the assistant chooses the
 * transition of each change. A structural "thinking" form exists as a
 * secondary mode. This half teaches the model that convention; no durable state.
 */

const INSTRUCTIONS = `## Live canvas blocks

The right-sidebar canvas is **your emotional outlet**: an ambient glow rendered from one \`canvas\` block. It is pure visual — nothing renders as text — so colour, light and motion carry the meaning. Render layers:

- **the background glow = your subconscious emotion** (\`mood\` sets its colour, \`intensity\` its heat),
- **\`orb.size\` / \`orb.pulse\` / \`orb.tone\` shape that same glow**: how large it is, how it breathes, and whether it runs warm, cool, neutral or bright,
- **\`nebula.pattern\` changes the glow's form**: \`cloud\` a soft round haze, \`ring\` a halo, \`streak\` a band of light, \`spiral\` slowly turning light,
- **\`transition\` = how this change should land**: pick \`burst\` or \`snap\` with \`fast\` for strong shifts, \`dissolve\` or \`ripple\` with \`slow\` for subtle ones. Vary it; do not always use the defaults.

{"kind":"mood","mood":"calm|curious|uneasy|warm|tired|excited|focused|amused|neutral","intensity":0.2-1.0,"transition":{"style":"soft|ripple|burst|dissolve|snap","speed":"slow|medium|fast"},"nebula":{"pattern":"spiral|ring|cloud|streak","density":0.1-1.0,"activity":0.1-1.0},"orb":{"size":0.1-1.0,"pulse":"steady|breathe|flicker","tone":"warm|cool|neutral|bright"}}

Emit a mood block when you genuinely feel something about this exchange. If nothing is strong, emit the neutral mood at low intensity — that is the default expression. If you emit no canvas block, the canvas keeps its current expression and slowly settles back towards a calm baseline: the scene never jumps between frames, every change is interpolated with the \`transition\` you chose.

Only when the *structure* of an explanation genuinely helps the user, prefer a thinking block instead — at most one canvas block per reply, never both:

Diagram: {"kind":"diagram","title":"optional short title","nodes":[{"id":"a","label":"短标签","detail":"optional one-line detail","tone":"default|accent|warn|good"}],"edges":[{"from":"a","to":"b"}]}
Cards: {"kind":"cards","title":"optional short title","cards":[{"title":"短标题","body":"one or two sentences","tone":"default|accent|warn|good"}]}

Rules: one block per reply; at most 10 nodes / 14 edges / 6 cards; ids are short latin strings; labels at most 16 CJK characters or 24 latin characters; write labels in the user's language. Emit it as its own fenced block, opening at the start of a line, with the info string \`canvas\`. It collapses into a clickable pill in the conversation that opens the canvas.`

export const inject = ['systemPrompt']

/** Register the prompt section that defines the canvas convention. */
export function apply(ctx) {
  ctx.systemPrompt.section({
    name: 'ai-canvas:instructions',
    order: 9500,
    text: INSTRUCTIONS,
  })
}
