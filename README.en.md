# AI Dream

> **A**rtificial **I**ntelligence **D**riven **R**eal-time **E**motional **A**mbient **M**edium
> Giving every AI's feelings a shape.

An **emotional outlet for AI** in [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).
A continuously flowing light in the right sidebar — not a diagram of the conversation, but a visual of how the model feels right now.

> Screenshot placeholder: run the canvas once, save an image as `docs/screenshot.png`, then un-comment the line below.
>
> `<!-- ![Screenshot](docs/screenshot.png) -->`

## What it is

A pure-visual window for an AI to express its own emotional state:

- **Not a thinking canvas** — it does not draw the structure of an answer;
- **Pure visual** — no text on the canvas at all; colour, light, motion and form carry the meaning;
- **Model-driven** — the model decides each turn whether and how to express something;
- **Continuous** — a `requestAnimationFrame` engine interpolates every parameter frame by frame, so changes glide instead of cutting; with no new input the glow slowly decays back to a calm baseline;
- **Two modes** — the emotional ambient light is primary; structural `diagram` / `cards` remain as a secondary mode for when an explanation really needs a shape.

## Install

Requires the DSH Web GUI (`profile=web`).

1. Open **Plugins → Add plugin** and pick **this directory** (absolute path);
2. Refresh the page when prompted;
3. Open the right sidebar and pick the **AI Dream** card on the guide page.

Notes:

- Zero build: no `pnpm build`, no `node_modules`.
- The plugin injects a canvas convention into the **system prompt of every session** in that profile (that is what lets the model express itself); disable the plugin to remove it.
- If nothing appears, hard-refresh (Ctrl+F5); replacing client bundles may need one DSH restart.

## Usage

Chat normally. When the model feels something it may emit one `canvas` block; the block collapses into a clickable pill in the conversation and the right-sidebar ambient light performs it.

### Mood mode (primary)

```canvas
{"kind":"mood","mood":"calm|curious|uneasy|warm|tired|excited|focused|amused|neutral","intensity":0.2-1.0,"transition":{"style":"soft|ripple|burst|dissolve|snap","speed":"slow|medium|fast"},"nebula":{"pattern":"spiral|ring|cloud|streak","density":0.1-1.0,"activity":0.1-1.0},"orb":{"size":0.1-1.0,"pulse":"steady|breathe|flicker","tone":"warm|cool|neutral|bright"}}
```

- `mood` sets the subconscious colour; `intensity` its heat;
- `transition` chooses the interpolation character and duration (`slow` ≈ 2.2s, `medium` ≈ 1.0s, `fast` ≈ 0.4s);
- `nebula.pattern` reshapes the light; `orb.size` / `orb.pulse` / `orb.tone` shape the core.

### Thinking modes (secondary)

```canvas
{"kind":"diagram","nodes":[{"id":"a","label":"short label"}],"edges":[{"from":"a","to":"b"}]}
```

```canvas
{"kind":"cards","cards":[{"title":"short title","body":"one or two sentences"}]}
```

## Architecture

```
Plugin bundle
├── index.js          Host half: injects the canvas convention into the system prompt
├── client.js         Client half: single-file lazy-CJS
│   ├── right sidebar tab      sidebarRightTabs.register + sidebar.right.pane.tab
│   ├── fence layer            conversation.chat.markdown.fence (key = canvas)
│   └── rAF engine             target params → exponential interpolation → CSS vars → glow
├── cordis.patch.yml
├── locale/*.json
└── docs/DETAIL.md
```

Data flow: the latest `canvas` block from the transcript → validated/normalized → target parameters → per-frame interpolation → CSS custom properties → the ambient light.

Design notes:

- **Zero dependencies**: `react` comes from the host module table via `require('react')`; no third-party library is bundled;
- **Theme-safe UI**: controls use the host `--dsw-alias-*` tokens; the glow itself is artwork and owns its palette;
- **Accessibility**: respects `prefers-reduced-motion` (animations stop, state jumps to target);
- **Form changes**: `pattern` switches cross-fade two layers, so the transition stays continuous even though shapes cannot interpolate.

## Development

```bash
node --check client.js
node --check index.js
```

Then refresh the page after editing (or wait for HMR to rebuild).

## Known limitations

- Canvas state is derived from loaded chat nodes only — not persisted across sessions;
- The mood vocabulary is a controlled list of nine; the visuals are not freely generated;
- Only `canvas` fenced blocks are rendered;
- A failed block keeps the previous visual and leaves the raw text in the conversation;
- Replacing client bundles may require one DSH restart.

## License

[MIT](LICENSE)
