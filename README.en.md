# AI Dream

[![ci](https://github.com/HanmoZhang0909/ai-dream/actions/workflows/ci.yml/badge.svg)](https://github.com/HanmoZhang0909/ai-dream/actions/workflows/ci.yml)

> **A**rtificial **I**ntelligence **D**riven **R**eal-time **E**motional **A**mbient **M**edium
> A shape for every feeling.

An **emotional outlet for AI** in [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).
A continuously flowing light in the right sidebar — not a diagram of the conversation, but a visual of how the model feels right now.

![AI Dream mood loop](docs/demo.gif)

> The clip is rendered from `docs/demo.html`, a standalone recreation of the glow (6 s loop: calm → warm → curious → calm) — **not a screenshot of the DSH UI**. A real UI screenshot is welcome via PR at `docs/screenshot.png`.
>
> **Live preview**: <https://hanmozhang0909.github.io/ai-dream/demo.html> (open in a browser, no DSH required)

## What it is

A pure-visual window for an AI to express its own emotional state:

- **Not a thinking canvas** — it does not draw the structure of an answer;
- **Pure visual** — no text on the canvas at all; colour, light, motion and form carry the meaning;
- **Model-driven** — the model decides each turn whether and how to express something;
- **Continuous** — a `requestAnimationFrame` engine interpolates every parameter frame by frame, so changes glide instead of cutting; with no new input the glow slowly decays back to a calm baseline;
- **Two modes** — the emotional ambient light is primary; structural `diagram` / `cards` remain as a secondary mode for when an explanation really needs a shape.

## Install

Requires the DSH Web GUI (`profile=web`).

| Option | How |
|---|---|
| **Local directory** | **Plugins → Add plugin** → pick **this directory** (absolute path) |
| **npm** (once published) | Plugins → Add plugin → package name `dsh-ai-dream` |
| **Git** | Plugins → Add plugin → `https://github.com/HanmoZhang0909/ai-dream` (or `github:HanmoZhang0909/ai-dream#main`) |

Refresh the page when prompted, then open the right sidebar and pick the **AI Dream** card on the guide page.

Notes:

- Zero build: no `pnpm build`, no `node_modules`.
- The plugin injects a canvas convention into the **system prompt of every session** in that profile (that is what lets the model express itself); disable the plugin to remove it.
- If nothing appears, hard-refresh (Ctrl+F5); replacing client bundles may need one DSH restart.

## Quick start

1. **Install and refresh** using one of the options above (Ctrl+F5 if nothing changes).
2. **Open the canvas**: right sidebar → guide page → **AI Dream** card. A neutral idle glow appears.
3. **Just chat** — no commands needed. When something is worth feeling, the model decides to express it.
4. **Watch it play**: a small "updated" pill appears in the conversation and the light **glides** to the new emotion (no frame cut); after a few quiet seconds it slowly settles back.
5. **Trigger it manually (optional)**: say "express your current state", or paste:

```canvas
{"kind":"mood","schema":2,"name":"curious","intensity":0.7,"palette":{"core":"#ffe9a8","tone":"#ff9f43"},"form":"spiral","transition":{"style":"soft","speed":"medium"}}
```

Notes:

- **It does not draw every turn** by design — only when there is something to express; otherwise the glow decays back to baseline.
- **Signature is generated automatically**: after the first message of a session the host designs this assistant's own emotional vocabulary (6-10 emotions) from the conversation so far; later blocks reference it by name, and the model may add emotions with a `define` block ("已定义 N 个情绪").
- **Not persistent**: the canvas reads the newest `canvas` block from the loaded conversation only; the signature lives in the session log.
- **You can calibrate it**: three quiet controls under the canvas — 「不像」/「再强一点」/「再淡一点」 — apply immediately and are remembered locally.
- **Replay emotions**: scroll up and the canvas follows that turn's emotion; a 「回看 · 第 N 轮 · 回到最新」 hint appears at the bottom — click it to jump back to live.
- **To turn it off**: disable `dsh-ai-dream` on the Plugins page; the injected prompt section goes with it.

## Troubleshooting

| Symptom | Fix |
|---|---|
| No **AI Dream** card on the guide page | Check `profile=web`, plugin enabled; hard-refresh (Ctrl+F5); restart DSH once if needed |
| Tab says "nothing can view this content" | That is a stale tab instance: close it and reopen from the guide card |
| The `canvas` block did not collapse into a pill | Make sure the block opens at the **start of a line** and is closed; refresh if the plugin is not loaded |
| Editing `client.js` changes nothing | Client bundles are cached: refresh; disable/enable the plugin, or restart DSH |
| No animation | `prefers-reduced-motion` disables animation by design |

## Usage

Chat normally. When the model feels something it may emit one `canvas` block; the block collapses into a clickable pill in the conversation and the right-sidebar ambient light performs it.

### Mood mode (primary, protocol v2)

The model may pick a built-in mood, or **define its own emotion** (name + palette + motion + form):

```canvas
{"kind":"mood","schema":2,"name":"the unease of being seen through","intensity":0.7,"palette":{"base":"#0b0a12","core":"#e8d9ff","tone":"#9a7aa6","spectrum":["#c9a3e0","#6a4b8f"]},"motion":{"speed":0.6,"amplitude":0.5,"rhythm":"uneven"},"form":"streak","transition":{"style":"burst","speed":"fast"}}
```

Omit `palette` to reuse a built-in palette:

```canvas
{"kind":"mood","name":"warm","intensity":0.65}
```

- `name`: free-text emotion name (history/debug only, never rendered)
- `mood`: optional built-in key used as palette fallback
- `palette.base/core/tone/spectrum`: AI-authored colours (hex; missing fields fall back)
- `motion.speed/amplitude/rhythm`: motion speed, breathing amplitude, rhythm
- `form`: `cloud` / `ring` / `streak` / `spiral`
- `intensity`: 0.2–1.0
- `transition.style/speed`: `soft`/`ripple`/`burst`/`dissolve`/`snap` × `slow`/`medium`/`fast`

Built-in fallbacks: calm, curious, uneasy, warm, tired, excited, focused, amused, neutral.

> Full protocol and validation rules: [docs/expression-protocol.md](docs/expression-protocol.md).

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
└── docs/             product requirements, architecture, expression protocol
```

> Planning and trade-offs: [docs/product.md](docs/product.md), [docs/architecture.md](docs/architecture.md), [docs/expression-protocol.md](docs/expression-protocol.md).

Data flow: the latest `canvas` block from the transcript → validated/normalized → target parameters → per-frame interpolation → CSS custom properties → the ambient light.

Design notes:

- **Zero dependencies**: `react` comes from the host module table via `require('react')`; no third-party library is bundled;
- **Theme-safe UI**: controls use the host `--dsw-alias-*` tokens; the glow itself is artwork and owns its palette;
- **Accessibility**: respects `prefers-reduced-motion` (animations stop, state jumps to target);
- **Form changes**: `pattern` switches cross-fade two layers, so the transition stays continuous even though shapes cannot interpolate.

## Development

```bash
node --check client.js
node --input-type=module -e "await import('./index.js')"
node scripts/check-fence-regex.mjs
```

Then refresh the page after editing (or wait for HMR to rebuild).

## Distribution & ecosystem

- DSH discovers third-party plugins through **Discover** (the plugin market): enable the experimental plugin-market bundle once and add an **index URL** (format 1 JSON);
- This repository ships a ready-to-add market index: `https://hanmozhang0909.github.io/ai-dream/index.json` (Discover → Add index source; validated with the official format-1 validator; installs from a commit-pinned git source);
- The official plugin marketplace is under construction (announced 2026-11); today distribution leans on community indexes plus npm/Git installs;
- Tag this repository with the `dsh-plugin` and `deepseek-harness` GitHub topics so it is discoverable;
- Planned: publish npm package `dsh-ai-dream`.

## Configuration

Add a config block to the plugin row in your profile's `cordis.patch.yml` (for example `~/.dsh/profiles/web/cordis.patch.yml`):

```yaml
- id: ai-canvas
  name: dsh-ai-dream
  config:
    signatureEmotions: 8
    holdSeconds: 6
    decaySeconds: 3
    defaultIntensity: 0.6
    allowInlinePalette: true
    signatureEnabled: true
```

| Field | Default | Range | Meaning |
|---|---|---|---|
| `signatureEnabled` | true | boolean | Automatically design the emotion signature at session start |
| `reuseSignature` | true | boolean | Reuse the last persisted signature in new sessions (saves one model call) |
| `replayEnabled` | true | boolean | Enable scroll replay (off = the canvas only follows the newest expression) |
| `calibrationEnabled` | true | boolean | Show the calibration controls under the canvas |
| `signatureEmotions` | 8 | 4–12 | How many emotions the signature holds |
| `holdSeconds` | 6 | 1–60 | How long the current state is held without new expressions |
| `decaySeconds` | 3 | 0.5–30 | How long the glow takes to settle back to baseline |
| `defaultIntensity` | 0.6 | 0.2–1 | Intensity used when a block omits it |
| `allowInlinePalette` | true | boolean | Allow the model to emit palettes inline |

Configuration applies on the session's next message (the host commits a config record; the client clamps the same values).

## Known limitations

- Canvas state is derived from loaded chat nodes only — not persisted across sessions;
- Built-in moods are a fallback vocabulary; AI-authored palettes are validated and clamped, with per-field fallback;
- Only `canvas` fenced blocks are rendered;
- A failed block keeps the previous visual and leaves the raw text in the conversation;
- Replacing client bundles may require one DSH restart.

## License

[MIT](LICENSE)
