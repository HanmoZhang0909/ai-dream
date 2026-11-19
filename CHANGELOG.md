# Changelog

## 1.17.0 — 2026-11-18

- Keyboard accessibility (GUI-verified): the dot row is now `role="toolbar"` with `aria-orientation` and roving tabindex (one Tab stop); ArrowLeft/ArrowRight/Home/End move focus inside the group without jumping; Enter/Space still jump. Focus rings use a two-tone outline (white 2px + dark halo) so they stay visible over bright glow cores.
- Esc now returns from replay to live (scoped: ignored while typing/composing or with the signature panel open); the replay capsule advertises `aria-keyshortcuts="Escape"`, and a polite live region announces 「回看 · 第 N 轮」 for screen readers.
- Layout/a11y polish: the reserved hint row is 24px (`TIMELINE_LAYOUT.hintReservedHeight`, unit-tested) and the replay capsule has a 24px minimum height.
- Replay robustness: "回到最新" only finishes after the bottom has held for 1.5s, so lazy-load gaps can no longer bring the replay hint back.

## 1.16.0 — 2026-11-18

- Streaming expressions (part 1): while the assistant is still writing a ```canvas fence, the canvas now folds the unterminated block as a partial mood and glides towards it, so the glow starts moving before the JSON finishes. The completed fence replaces the preview seamlessly.
- Pure helpers in `renderer/core.mjs`: `PARTIAL_MARK`, `extractPartialCanvas` (finds a trailing open fence, rejects closed ones), `parsePartialMood` (best-effort name/intensity/form/palette extraction from truncated JSON), with unit tests and client-copy parity assertions.
- GUI regression stays green (signature viewer, calibration notes, waiting state, dots/jump/back); a live generation preview is covered by the pure tests because it needs real streaming output.

## 1.15.0 — 2026-11-18

- Emotion signature viewer (GUI-verified): a low-contrast pill in the canvas top-right — 「情绪词表 · N」 — opens an anchored popover listing the emotions the AI defined for this session (colour dot + name, up to 12), with the panel title 「情绪签名」and the line 「AI 自己定义的情绪词表」. It also shows in the waiting state when a signature exists.
- Accessibility: `aria-expanded` / `aria-controls` / `role="dialog"` / `aria-label`, focus moves into the panel and returns to the pill, Esc and ✕ close it, clicking outside closes it, `:focus-visible` outlines, 24px targets.
- `signatureChips` (de-dupe, invalid-colour fallback, 12-chip limit) lives in `renderer/core.mjs` with unit tests and a client-copy parity assertion; the GUI self-test asserts the pill label, chip names, focus, Esc and ✕ behaviour.
- "回到最新" keeps pinning up to 12s (60ms cadence) for very long sessions so the replay hint no longer reappears mid-scroll.

## 1.14.0 — 2026-11-18

- Waiting state (GUI-verified): when the session has no expression yet the canvas no longer shows a default "neutral" glow with calibration buttons. It now renders a dimmer, slower "sleeping" version of the same glow, a faint dashed breathing ring, and the copy 「还没有感受可以成形状」/「发送消息后画布会亮起」, with the dots and calibration controls hidden. `EMPTY_STATE` and `isEmptyState` live in `renderer/core.mjs` with unit tests.
- Fixed a real bug the review found: the waiting state used to consume the one-time onboarding hint (it marked it as seen even though it was never rendered), so first-time users could permanently miss the hint. The hint is now only consumed after it actually rendered, and the waiting state leaves it for the first real expression.
- Test hook `window.__AI_DREAM_FORCE_EMPTY` (CDP preload) forces the waiting state; the GUI self-test gains a waiting-state phase that asserts the copy, ring, hidden controls and that the onboarding flag stays unset.

## 1.13.0 — 2026-11-18

- Calibration feedback (GUI-verified): every 不像 / 再强一点 / 再淡一点 click now shows a short note in the reserved hint row — 「更亮了 · 只影响画面」 / 「更淡了 · 只影响画面」, and 「已到上限 · 只影响画面」 when the ±0.4 bias bound is reached — then fades after 1.6s. Pure logic lives in `renderer/core.mjs` (`CALIBRATION`, `nextCalibrationBias`, `calibrationNoteFor`) with unit tests and client-copy parity assertions.
- "回到最新" pins only until the bottom is stable for two consecutive checks, so lazy-loaded history can no longer leave the replay hint visible afterwards.

## 1.12.0 — 2026-11-18

- Discoverability (GUI-verified): first time the canvas opens, a one-time hint explains the dots and calibration buttons — "圆点＝最近几轮情绪，点它回看；按钮只调光，不改回复" — with a 知道了 dismiss, 5s auto-hide + fade, remembered in `localStorage['ai-dream:onboarded:v1']`; it only shows in live mode, never while replaying.
- Accessibility: calibration buttons gain `title` + `aria-label` and a 24px minimum height; dots become an ARIA group ("最近几轮情绪，点击回看") with 11px visuals at 0.7 opacity when inactive.
- Replay robustness: "回到最新" now suppresses the replay hint while it keeps pinning the transcript to the bottom (long sessions lazy-load pages), and the pin loop runs up to 8s.
- Test hooks: `data-ai-dream-*` attributes and `?ai-dream-onboard=1` / `window.__AI_DREAM_FORCE_ONBOARD` for deterministic GUI checks (no effect for real users).

## 1.11.3 — 2026-11-18

- Fix CI: `TIMELINE_LAYOUT.nearBottomThreshold` now matches the client (48px) and the parity assertion checks the shipped value, so the layout invariant and the zero-build copy cannot drift again.

## 1.11.2 — 2026-11-18

- Real-GUI verified fixes for the mini emotion timeline (driven through the authenticated GUI with Chrome DevTools Protocol, screenshots captured):
  - dot jumps now settle the anchor while lazy-loaded history keeps shifting it (turn 116 lands on turn 116 instead of drifting to an older turn);
  - "回到最新" keeps pinning to the bottom until the transcript stops growing, so the hint reliably disappears in long sessions;
  - the near-bottom threshold is 48px, and the hint pill uses near-white text on a dark backdrop for readability over the glow;
  - UI gains stable `data-ai-dream-*` hooks used by the self-test (canvas, stack, dot, hint, sentinel already existed).

## 1.11.1 — 2026-11-17

- UI-testability hardening: the bottom-stack layout invariants (24px dot hit targets, non-overlapping rows, reserved hint height, near-bottom threshold) are encoded in `renderer/core.mjs` as `TIMELINE_LAYOUT` + `timelineRowRects()` and asserted in CI, so the overlap / tiny-hit-target bug class is caught without a browser. The client copy gains parity assertions for the same constants.

## 1.11.0 — 2026-11-17

- Fixed the mini emotion timeline: the hint, dots and calibration rows are now one bottom flex stack (no absolute overlap), dots have 24×24 hit targets with a 9px visual dot, jumps anchor `center` and honour `prefers-reduced-motion`, the replay hint reserves its height (no layout shift), near-bottom scrolling returns to live mode, and clicking a dot flashes it for feedback.
- Testability: `renderer/core.mjs` gained `buildTimelineDots` / `inReplayMode` / `sentinelSelector` with unit tests, plus a client-copy parity assertion so the inline implementation cannot silently drift.
- UX review: one subagent UI/UX review was run before delivery (per `references/verification.md`); visual verification in a live GUI remains unavailable in this environment and is reported as such.

## 1.10.1 — 2026-11-17

- Added `docs/iterations.md`: the ten-round autonomous iteration record (per-round increment, self-test evidence, engineering lessons, remaining backlog).
- README and docs index link the iteration record; docs status reflects the wrap-up.

## 1.10.0 — 2026-11-17

- Model-side calibration: `~/.dsh/storages/dsh-ai-dream/calibration.json` (`tone` / `note` / `intensity`) is read by the host at load, sanitized and injected as a `## Calibration` section of the system prompt, so calibration shapes the model's own expression rather than only the visuals.
- New `readCalibration` / `calibrationFilePath` helpers with unit tests (control-character stripping, length caps, clamping, invalid JSON fallback).
- Verified end-to-end: a probe calibration file appeared verbatim in the next turn's injected prompt section.

## 1.9.0 — 2026-11-17

- Mini emotion timeline under the canvas: the latest eight expressed turns render as colour dots (each dot uses that turn's light-core colour); clicking a dot scrolls the transcript to that turn. Hidden when `replayEnabled` is off.

## 1.8.0 — 2026-11-17

- MCP server skeleton `mcp/server.mjs`: stdio JSON-RPC with `initialize`, `ping`, `tools/list`, `tools/call`, `resources/list`, `resources/read`; `express_emotion` normalizes through `renderer/core.mjs` and the renderer HTML is served as an `ai-dream://renderer` resource.
- New `scripts/check-mcp-server.mjs` (CI) covers the handler: protocol handshake, tool schema, clamping, error codes, resource reads.
- Package `files` now ships `mcp/`, `renderer/` and `resources/`.

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
