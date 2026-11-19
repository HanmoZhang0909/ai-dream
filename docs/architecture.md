# AI Dream — 技术框架

> 状态：进行中（v0.5 情绪签名）。目标是把现在"能跑的产品"整理成"可演进的产品"：协议与渲染引擎解耦，宿主适配器可替换。
>
> 文档索引与维护规则见 [`docs/README.md`](README.md)。

## 1. 分层架构

```
┌─ 宿主适配层 ──────────────────────────────────────────
│  DSH 插件（现在）：Host 系统提示 + Client slot（右栏 tab / fence）
│  MCP App（以后）：MCP server + 沙箱 iframe（ChatGPT / Claude）
├─ 上下文层 ────────────────────────────────────────────
│  现在：当前会话对话快照（useChat）
│  以后：语音 / 屏幕 / 历史情绪
├─ 创作层（谁决定表达）───────────────────────────────────
│  现在：主模型在回复中携带一个 canvas 块
│  以后：独立导演调用 / 用户手动触发（保留简单优先）
├─ 协议层 ──────────────────────────────────────────────
│  Expression Spec（v2）：情绪名 + 色板 + 运动 + 形态 + 强度 + 转场
├─ 渲染引擎 ────────────────────────────────────────────
│  插值核心（与框架无关）+ 渲染后端（DOM/CSS → 未来 Canvas/WebGL）
└─ 状态层 ──────────────────────────────────────────────
   现在：无状态（读最新表达）
   以后：会话状态（延续/衰减）+ 跨会话人格基线 + 用户校准
```

## 2. 表达协议 v2（已实现）

AI 自定义情绪为核心：**名称自由、颜色自由、运动可调，渲染器负责安全边界**。完整规范见 `docs/expression-protocol.md`。

```json
{
  "kind": "mood",
  "schema": 2,
  "name": "被看穿时的不安",
  "palette": { "base": "#0b0a12", "core": "#e8d9ff", "tone": "#9a7aa6" },
  "motion": { "speed": 0.6, "amplitude": 0.4, "rhythm": "uneven" },
  "form": "streak",
  "intensity": 0.7,
  "transition": { "style": "burst", "speed": "fast" }
}
```

约束：

- `palette` 缺失或非法 → 回退到 AI 情绪签名 / 内置 neutral；
- `intensity` 夹紧 0.2–1；`motion.speed` 夹紧 0.2–2；
- `form` 只接受已实现形态（`cloud|ring|streak|spiral`），未知回退 `cloud`；
- 颜色只接受 hex；渲染器保证亮度/对比/性能边界（细节见协议文档）。

## 3. 渲染引擎

**目标**：与宿主、框架解耦，一个可移植的 `EmotionRenderer`。

```ts
interface EmotionRenderer {
  mount(container: HTMLElement): void
  apply(spec: ExpressionSpec, opts?: { transition?: Transition }): void
  destroy(): void
}
```

- **插值核心**：目标参数（颜色/尺寸/透明度/模糊/形态权重）→ 指数插值（τ 由 transition 决定）；
- **渲染后端**：现在 DOM + CSS 自定义属性（轻、主题安全）；粒子/流体/角色需要 Canvas/WebGL 后端，做接口预留；
- **状态机**：idle（基线）→ expressing（插值到目标）→ decaying（回落基线）；
- **约束**：尊重 `prefers-reduced-motion`；单画面元素数量可控；每帧只写必要属性。

当前实现（`client.js` 单文件）将拆分为：

```
client.js            DSH 适配器 + React 组件（保持单文件零构建）
core/emotion-core.js 协议校验 + 插值状态机（纯 JS，可移植）
core/emotion-dom.js  DOM 渲染后端
```

> 拆分时机：**v1.x 移植 MCP App 时**（届时需要可移植的纯 JS 核心）。v0.4 先在单文件内增量支持协议 v2，贯彻"越简单越好"。

**可移植核心（v1.6）**：`renderer/core.mjs` 抽出与宿主无关的纯函数（`normalizeMood`、`resolveColors`、`targetFrom`、`tauFor` 等），由 `scripts/check-renderer-core.mjs` 单测覆盖；`client.js` 因零构建约束保留一份等价实现，两者语义需同步（改动渲染语义时同时更新）。

## 4. 状态与记忆

```ts
interface EmotionState {
  base: ExpressionSpec        // AI 情绪签名（跨会话基线）
  current: ExpressionSpec     // 当前显示（插值目标）
  lastExpressionAt: number
  history: Array<{ t: number; name: string; intensity: number }>
  feedback: Array<{ t: number; delta: number }>  // 用户校准
}
```

- **会话内**：持久化在插件内存；衰减曲线 = `intensity → base.intensity`，速率可配置；
- **跨会话**：基线（签名）与历史存 profile 存储（v1.0）；
- **校准**：`不像/更强/更弱` → intensity 偏置 + 色板偏好，写入 `feedback`，影响后续目标值。

### 4.1 情绪签名（v0.5，已实现）

"AI 定义自己的情绪语言"的落地方式：**会话初始化时生成一次签名**，之后每轮只引用。

1. **触发**：会话第一个真人 `user/message`（`origin !== subagent`；已有签名记录则跳过）；
2. **读历史**：`session.snapshotEvents()` 里最近 16 条 user/assistant 文本；
3. **调用**：`ctx.llm.prepareCall` + `call.stream`（`maxTokens 3500`、最低推理强度、25 秒超时），要求返回紧凑 JSON 签名；
4. **校验**：6–10 个情绪、hex 色板、数值夹紧、未知枚举丢弃；
5. **提交**：`appendPluginRecord(session, 'plugin:ai-dream/signature', data)`（实验 API；经 `process.argv` 推导 DSH 安装根后以绝对路径导入 `@deepseek-ai/dsh-session`，因为链接插件无法用裸包名解析）；
6. **下发**：`sessionProjections.register({ key: 'emotionSignature', wire: { view } })` 折叠该记录，客户端 `props.useProjection('emotionSignature')` 读取；
7. **降级**：调用失败/超时只记 warn，回退内置词表，下一会话重试；
8. **动态新增**：AI 在回复里用 `define` 块追加情绪，客户端合并进会话签名。

客户端折叠已加载时间线里的全部 `canvas` 块，签名在刷新/恢复后从会话日志恢复（实验记录跨格式迁移为 best-effort）。

### 4.2 运行时配置（v0.6，已实现）

配置来源是 **Cordis 行配置**：用户在 profile 的 `cordis.patch.yml` 里给 `ai-canvas` 行加 `config:`，Host 在 `apply(ctx, config)` 里解析（无 schema，手动校验 + 夹紧）。

```yaml
- id: ai-canvas
  name: dsh-ai-dream
  config:
    signatureEmotions: 8
    holdSeconds: 6
    decaySeconds: 3
    defaultIntensity: 0.6
    allowInlinePalette: true
```

- Host 在会话首条真人消息时把解析后的配置写成 `plugin:ai-dream/config` 记录（与上次相同则跳过；必须 `setTimeout(0)` 延后提交，否则会撞上 `session/event` 的发布重入限制），`aiDreamConfig` projection 下发客户端；
- Host 用它调整系统提示（签名情绪数量、是否允许 inline 色板）和签名调用的产出要求；
- 客户端对同一组值再夹紧，用于衰减曲线、基线强度、inline 色板开关，以及 `replayEnabled`（滚动回看）与 `calibrationEnabled`（校准按钮）两个行为开关。

### 4.3 状态、记忆与用户校准（v1.0，客户端实现）

- **会话内状态**：客户端用 `HISTORY` 记录最近 24 次表达（名称/强度/时间）；渲染引擎本身是连续的，因此新表达天生从当前视觉状态继续插值；
- **跨会话基线（客户端）**：签名（情绪词表）缓存在 `localStorage`，新会话在 Host 初始化完成前先用缓存解析名字，避免"名字突然变成中性色"；Host 生成新签名后覆盖缓存；
- **用户校准**：画布底部三个轻量按钮「不像 / 再强一点 / 再淡一点」，调整 `CALIBRATION.intensityBias`（-0.4–0.4），立即作用于渲染并写入 `localStorage`；
- **边界（诚实）**：校准是**客户端视觉偏置**，不写回模型提示词，也不改历史；按浏览器 localStorage 持久化，换浏览器/清缓存会丢。模型侧学习与 Host 侧跨会话复用留到 1.0.x。

### 4.4 跨会话签名持久化（v1.3，已实现）

- 签名生成成功后写入 `dshHomePath('storages')/dsh-ai-dream/signature.json`（`dsh-home-paths` 以绝对路径导入，失败回退 `~/.dsh/storages/...`）；
- 新会话首条消息时，若 `reuseSignature` 开启：读文件 → `setTimeout(0)` 延后 → `appendPluginRecord` 复制进本会话，**跳过模型调用**；无文件则照常生成；
- 已存在签名的旧会话在下一条消息时会把签名补写进文件（迁移）；
- 边界：单份"最新签名"，不区分模型/工作区；换模型后仍复用上一份，需要时可关 `reuseSignature` 或删除文件。

### 4.5 模型侧校准（v1.10，已实现）

- 本地文件：`dshHomePath('storages')/dsh-ai-dream/calibration.json`（与签名同目录）；字段 `tone`（≤200 字）、`note`（≤120 字）、`intensity`（0.2–1）；
- Host 在 `apply()` 时读取并清洗（去控制字符/换行、截断、夹紧），拼进系统提示的 `## Calibration` 段；文件缺失或非法则整段不出现；
- 修改文件后需要重载插件（Host 加载时读取一次），配合同一文件目录里的签名持久化，形成"用户可调 + AI 自己定义"的双向校准；
- 边界：只影响模型的表达倾向（提示词层），不改写历史表达；画布底部三按钮的即时偏置仍是纯客户端行为。

### 4.6 流式表达（v1.16，第一部分）

- `canvasFeed` 在扫描完所有完整 fence 后，检查最后一条 assistant 文本是否以未闭合的 ```canvas 块结尾（`extractPartialCanvas`），若是则追加一条带 `PARTIAL_MARK` 前缀的条目；
- 折叠循环遇到 partial 条目时用 `parsePartialMood` 做尽力解析（name/mood/intensity/form/palette），经客户端 `normalize` 后作为 `latest` 预览（标记 `partial: true`，不写入 `turnModels`）；
- 完整 fence 到达后，同一条目被替换，预览无缝过渡到正式模型；解析失败绝不报错（等待下一条消息）；
- 局限：真实流式输出无法在 GUI 自测里稳定构造，因此这一层由 `extractPartialCanvas`/`parsePartialMood` 单测覆盖，GUI 回归确保完整路径不受影响。

## 5. 情绪时间轴（滚动回看，v1.1）

**数据**：表达块已经在每条助手消息的文本里（`canvas` fence），因此**无需额外存储**——从 `ChatSnapshot` 中按 `messageId` 解析出该轮的表达规格即可。更早的历史需要 Host projection 分页加载（后续）。

**位置检测（已实现）**：

1. 在 `conversation.chat.turnTail` 注册 1px `TurnSentinel`（该 slot 的 props 自带 `turn`）；
2. `IntersectionObserver` 的 root 取 `el.closest('[data-conversation-scroll]')`，观察整个视口（`threshold: 0`，不设 rootMargin）；哨兵为 1px 透明全宽元素，不加负 margin，保证可见；
3. 多个哨兵之间取父元素 top 最小者写入共享 store，右栏用 `useTopTurn` 订阅；
4. turn → 该轮 `canvas` 表达（`canvasFeed` 每块带上所属 turn）；无表达则向前找最近一次，并强制 `soft/fast` 转场。

已知限制：turn-tail 行有 16px gap，用负 margin 抵消；折叠/分页可能让哨兵暂时不可见，此时保持实时模式。

回看提示（v1.2）：`topTurn < latestTurn` 时面板底部显示「回看 · 第 N 轮 · 回到最新」，点击把 `[data-conversation-scroll]` 滚到底部（自动退出回看）。

迷你情绪时间轴（v1.11 / v1.11.2）：底部为**单一 flex column 栈**（回看提示占位 22px + 颜色点行 + 校准按钮行，gap 7，栈 `pointerEvents:none`、行 `auto`），杜绝重叠与点击遮挡；圆点 24×24 命中区 + 9px 视觉点；点击锚点 `block:'center'` 且遵循 `prefers-reduced-motion`，**并在历史懒加载期间持续吸附到目标轮次**（约 2.4s，稳定后停止）；「回到最新」**持续 pin 到底部**直到滚动高度不再增长；距底部 48px 内视为 live，避免短末轮误判；回看胶囊近白文字 + 深色底保证光晕上的可读性；`replayEnabled: false` 时整体隐藏。数据逻辑由 `renderer/core.mjs` 的 `buildTimelineDots`/`inReplayMode`/`sentinelSelector` 单测覆盖，client 内联副本有文本一致性断言。**布局不变量（v1.11.1）**：`TIMELINE_LAYOUT` 与 `timelineRowRects()` 把 24px 命中区、行不重叠、提示占位、近底阈值固化为 CI 断言——这类 UI 重叠/误触 bug 不再只能靠人眼发现。**真实 GUI 自测（v1.11.2，本地）**：通过 CDP 驱动已认证页面，断言圆点命中自身、行不重叠、跳转落到目标轮次、回到最新后提示消失；测试标识为 `data-ai-dream-canvas|stack|dot|hint`。**键盘与屏幕阅读器（v1.17）**：圆点行 `role="toolbar"` + `aria-orientation` + roving tabindex（整组一个 Tab 停靠点），方向键/Home/End 在组内移动焦点、Enter/Space 触发跳转；回看胶囊 `aria-keyshortcuts="Escape"`，Esc 在回看态回到最新（输入中/输入法组合/词表面板打开时不抢）；隐藏的 `role="status"` live region 播报「回看 · 第 N 轮」；focus-visible 双色描边（白环 + 深色外圈）保证光核上可见；提示行高 24px 由 `TIMELINE_LAYOUT` 常量与单测保证。**可发现性（v1.12）**：首次打开时在预留提示行渲染一次性引导（26 字 + 「知道了」），5s 自动淡出，`localStorage['ai-dream:onboarded:v1']` 记忆；仅实时态显示、回看态让位给回看胶囊；「回到最新」期间用 `returning` 状态抑制回看胶囊，等 pin 到底后再恢复判定；测试可用 `?ai-dream-onboard=1` 或 CDP 预载 `window.__AI_DREAM_FORCE_ONBOARD` 强制展示（对真实用户无影响）。**校准反馈（v1.13）**：三枚校准按钮每次点击在预留提示行显示 1.6s 短提示（更亮了/更淡了/已到上限 · 只影响画面），语义由 `CALIBRATION`/`nextCalibrationBias`/`calibrationNoteFor` 纯函数定义并单测；「回到最新」要求连续两次到底才结束 pin，避免懒加载把提示重新露出。**空/等待态（v1.14）**：会话里还没有任何表达时不再显示会误导的默认中性光+校准按钮，改为"睡着的同一颗光"（更小更慢更暗）+ 0.5px 呼吸虚线环 + 「还没有感受可以成形状」/「发送消息后画布会亮起」，控件隐藏；`EMPTY_STATE`/`isEmptyState` 在 core 中单测；引导只在实际渲染后才会被标记为已看过（空态不会消耗引导）；可用 `window.__AI_DREAM_FORCE_EMPTY` 强制验证。**情绪签名查看器（v1.15）**：画布右上角「情绪词表 · N」胶囊（N=签名数量，0 时不渲染），点击就地锚定半透明浮层列出 AI 自定义情绪（圆点+名字，最多 12 个）；面板 `role="dialog"` + 焦点管理 + Esc/✕/点外关闭；空态也有入口；`signatureChips` 纯函数在 core 单测，client 副本有纹理断言。**天气形态（v1.18，协议 v2.1）**：`form` 追加 `rain`/`fog`（旧渲染器回退默认形态）；`PATTERN_BLUR` 给雨 26px、雾 72px（雾显著更柔），渐变用 `color-mix` 拉开层次并各补径向光核避免过暗；词表用 `FORM_LABELS`/`formLabel` 标注中文形态名；测试钩子 `window.__AI_DREAM_FORCE_FORM` 可指定形态。**校准导出（v1.20）**：底部校准行的「同步给 AI」把客户端 bias 转成可复制的模型侧校准 JSON（`calibrationSnippet`，core 单测），面板给出去向路径、整份覆盖/全机生效/需重载/JSON 错误会被忽略等警告；这是通往双向校准的第一步（用户手动写入 Host 的 calibration.json 通道），剪贴板改用可选中只读 textarea + 全选，避免 iframe 权限问题。

**模式与渲染**：

- `mode: live | replay`：滚到底部 → live（跟随最新表达，保留 AI 选择的 transition）；离开底部 → replay；
- replay 模式下**缩短插值 τ（约 120ms）**，避免滚动经过多轮时出现长拖尾；
- 回看提示与「跳回该轮」由客户端 slot 渲染在画布面板内，不写宿主 DOM。

**边界**：

- 虚拟列表只挂载可见附近的行，未挂载轮次没有哨兵 → 只能估算；先接受"已加载窗口"范围；
- 无表达轮次沿用最近一次（情绪有惯性），从未表达则显示基线；
- 回看只读：用户校准不写入历史，只影响未来；
- 若宿主改变 chat 结构，哨兵方案需重新验证（slot 契约优先）。

## 6. 宿主适配与平台兼容

| 平台 | 扩展形态 | 常驻能力 | 持续动画 | 主要限制 |
|---|---|---|---|---|
| **DSH**（现在） | 客户端插件（进程内、代码级） | 右栏 tab 常驻 | ✅ rAF | 绑定 DSH 版本 |
| **ChatGPT** | MCP App（Apps SDK / Plugin Extensions） | 侧栏 / conversation panel / PiP | ✅（PiP 定位支持持续内容） | CSP、禁内联脚本、尺寸封顶、上架审核 |
| **Claude** | MCP App（连接器） | side panel / fullscreen（部分限组织） | ✅（官方示例含实时 shader） | 常驻面灰度、目录需 Verified |
| **WorkBuddy（腾讯）** | MCP + 插件（Skill/MCP/Hook/Agent/Rule） | ❌ 无自定义侧栏 | MCP Apps iframe（桌面端未核实） | 无自定义面板接口 |
| **Claude Code** | plugin（skills/hooks/mods） | 终端/VS Code pane | ❌ 无 Web UI | 只能静态降级 |

移植策略：**协议 + 渲染引擎做成 MCP App 可承载的 HTML/JS 产物**，AI 通过工具调用推送表达参数；宿主适配层各写一份。

## 7. 技术债与迁移计划

| 债务 | 影响 | 计划 |
|---|---|---|
| 单文件 37KB，协议与渲染耦合 | 难测试/难移植 | v0.4 先增量改协议；v1.x 移植时拆 core/protocol/renderer |
| 情绪词表硬编码 | 与"AI 自定义情绪"冲突 | v0.4 改为 AI 定义 + 内置 fallback |
| 无 Config | 用户无法调参 | v0.5 加插件 Config（需先设计 Host→Client 配置通道） |
| 无状态 | 每次从零开始 | v1.0 状态层 |
| 无反馈入口 | 无法校准 | v1.0 |
| 仅 DSH 宿主 | 平台受限 | v1.x MCP App 适配器 |

## 8. 风险

- **协议自由度 vs 审美**：AI 自定义颜色可能丑 → 需要默认签名 + 边界夹紧 + 人工可调；
- **跨平台渲染一致性**：不同 iframe 的 CSP/性能差异 → 渲染核心保持纯函数式、少依赖；
- **成本**：协议参数占 token → 控制表达块长度，必要时用短键名。
