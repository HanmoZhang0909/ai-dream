# Changelog

## 1.7.1 — 2026-11-17

- Fix CI: the headless-Chrome MCP renderer check now runs only when `AI_DREAM_BROWSER_CHECK=1` (GitHub runners are environment-dependent); protocol/renderer semantics stay covered by the manifest and renderer-core unit tests. The screenshot remains committed as evidence.

## 1.7.0 — 2026-11-17

- MCP renderer skeleton `resources/ai-dream.html`: renders the expression spec through `renderer/core.mjs`, supports `?t=` deterministic frames, `?spec=` override, and exposes a `#probe` JSON of the computed target.
- New `scripts/check-mcp-renderer.mjs`: serves the repo, drives headless Chrome, validates the probe (protocol/pattern/intensity/palette/tau), optional screenshot; skips when Chrome is unavailable. Verified output committed as `docs/mcp-renderer.png`.

## 1.6.0 — 2026-11-17

- Extracted `renderer/core.mjs`: the host-independent renderer core (protocol normalization, palette resolution, interpolation targets, tau shaping). The DSH client keeps an equivalent copy inside `client.js` for the zero-build constraint.
- New `scripts/check-renderer-core.mjs` unit tests (CI) cover primitives, palette fallbacks, clamping, built-in lookup, tau ordering and render targets.
- `docs/mcp-app.md` step 1 is done; architecture documents the duplication rule.

## 1.5.0 — 2026-11-17

- MCP App port groundwork: `docs/mcp-app.md` documents the host shapes and constraints, and `mcp/app-manifest.json` defines the portable `express_emotion` tool contract.
- New CI check `scripts/check-mcp-manifest.mjs` keeps the manifest fields, enums and ranges in sync with expression protocol v2 (and requires the port doc to exist).

## 1.4.0 — 2026-11-17

- New config flags: `replayEnabled` (turn scroll replay on/off) and `calibrationEnabled` (show/hide the calibration controls). Both are delivered through the existing `aiDreamConfig` projection and applied by the client.

## 1.3.0 — 2026-11-17

- **Cross-session signature reuse**: the emotion signature is persisted to `~/.dsh/storages/dsh-ai-dream/signature.json`; a new session copies it instead of calling the model again (`reuseSignature`, default on). Older sessions seed the file on their next message.
- New `scripts/check-config.mjs` coverage for persistence round-trips and `lastSignatureOf`.
- Config table documents `reuseSignature`; architecture notes the single-file, model-agnostic boundary.

## 1.2.0 — 2026-11-17

- Scroll replay now shows a hint while reviewing: 「回看 · 第 N 轮 · 回到最新」. Clicking it scrolls the transcript back to the bottom and returns to live mode.

## 1.1.1 — 2026-11-17

- Fix scroll replay never activating: `conversation.chat.turnTail` passes a `TurnLocation` object (read `.turn`), and the sentinel is now visible to `IntersectionObserver` (no negative margins, full-viewport observation, topmost visible turn wins).
- Removed the temporary on-canvas debug line.

## 1.1.0 — 2026-11-17

- Scroll replay: a 1px sentinel in the `conversation.chat.turnTail` slot reports which turn sits nearest the viewport top; scrolling above the newest turn renders that turn's emotion (or the nearest earlier expressed turn when it is silent) with a fast transition, and scrolling back to the bottom returns to live mode.

## 1.0.0 — 2026-11-17

- **Session continuity**: the client keeps the recent emotion history and the glow always interpolates from its current state (the renderer was already continuous, so expressions now feel like one evolving mood).
- **Cross-session baseline (client)**: the emotion signature is cached in `localStorage`; a new session resolves signature names before the host init completes, and the fresh signature overwrites the cache.
- **User calibration**: three quiet controls under the canvas — 「不像」/「再强一点」/「再淡一点」 — adjust an intensity bias (-0.4..0.4) that applies immediately and persists in `localStorage`.
- Honest limits: calibration is a client-side visual bias (no prompt write-back), and both the bias and the signature cache are per-browser; model-side learning and host-side signature reuse are 1.0.x work.

## Unreleased

- Tests: `scripts/check-config.mjs` covers configuration clamping and signature parsing (prose/code-fence wrappers, invalid colours, unknown enums, minimum emotion count); CI runs it.

## 0.6.1 — 2026-11-17

- Fix: the config record was dropped by the session publication reentrancy guard; it is now committed on the next tick. Sessions receive iDreamConfig (and the client applies it).


## 0.6.0 — 2026-11-17

- **Plugin configuration**: the host resolves a configuration object from the Cordis row config (`cordis.patch.yml` in the profile) and commits it to the session as `plugin:ai-dream/config`; a second session projection (`aiDreamConfig`) delivers it to the client.
- Fields: `signatureEnabled` (skip the init call), `signatureEmotions` (4–12, default 8), `holdSeconds` (1–60, default 6), `decaySeconds` (0.5–30, default 3), `defaultIntensity` (0.2–1, default 0.6), `allowInlinePalette` (default true).
- Host instructions and the signature prompt now follow the configuration; the client clamps the same values.
- `allowInlinePalette: false` makes the client ignore inline palettes and the prompt forbid them, so expression stays on signature/built-in palettes.

## 0.5.0 — 2026-11-17

- **Emotion signature (Host)**: on the first human message of a session the host asks the model to design this assistant's own emotional vocabulary from the conversation (6–10 emotions with palette/motion/form), validates it, and commits it as the experimental plugin record `plugin:ai-dream/signature`.
- A session projection (`emotionSignature`) plus `wire.view` delivers the signature to the client; `mood.name` resolves against it (signature → inline override → built-in → neutral).
- Client half of the signature: session signature store and `define` blocks that merge new emotion definitions mid-conversation; the canvas fence shows "已定义 N 个情绪".
- The canvas tab folds the **whole loaded timeline** in order (all `canvas` fences), so a `define` from an earlier turn still applies after a refresh.
- Prompt: the model is taught the `define` block.
- CI: examples check (`scripts/check-examples.mjs`).
- Known limits: the signature is stored in the session log (survives refresh and resume), not yet across sessions; init is one auxiliary model call per session.

## 0.4.0 — 2026-11-17

- **Protocol v2**: the model can define its own emotion — `name`, `palette` (base/core/tone/spectrum), `motion` (speed/amplitude/rhythm) and `form`; built-in moods stay as palette fallback.
- Renderer accepts AI-authored colours and motion parameters with hex validation and numeric clamping; invalid input degrades field by field.
- System prompt rewritten around self-defined emotions instead of a fixed list.
- Docs: product requirements, architecture and expression protocol added to `docs/`.

## 0.3.0 — 2026-11-16

First public release.

- **AI Dream** — Artificial Intelligence Driven Real-time Emotional Ambient Medium.
- Continuous emotional glow in the DSH right sidebar, driven by `requestAnimationFrame` interpolation (no frame replacement).
- Mood vocabulary of nine emotions, each with its own palette; `intensity` scales heat, size and breathing.
- AI-chosen transitions: `soft` / `dissolve` / `burst` / `ripple` / `snap` × `slow` / `medium` / `fast`.
- Nebula patterns (`cloud` / `ring` / `streak` / `spiral`) change the light's form with a cross-fade.
- Idle decay: without new input the glow settles back towards a calm baseline.
- Secondary thinking modes: structural `diagram` / `cards` blocks.
- Zero-build, zero-dependency client bundle (single `client.js`, `react` from the host module table).
- Respects `prefers-reduced-motion`; only `canvas` fenced blocks are rendered.
- Repo assets: standalone `docs/demo.html` recreation and the rendered `docs/demo.gif` loop used by the README.

## Renamed earlier in development

- `@local/dsh-ai-canvas` → `dsh-ai-canvas` → **`dsh-ai-dream`**.
