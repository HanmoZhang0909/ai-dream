# Changelog

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
