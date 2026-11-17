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
- 客户端对同一组值再夹紧，用于衰减曲线、基线强度与 inline 色板开关。

## 5. 情绪时间轴（滚动回看，v1.1）

目标：用户上下滚动对话时，右栏渲染**对应那一轮**的情绪，而不是永远显示最新一条。

**数据**：表达块已经在每条助手消息的文本里（`canvas` fence），因此**无需额外存储**——从 `ChatSnapshot` 中按 `messageId` 解析出该轮的表达规格即可。更早的历史需要 Host projection 分页加载（后续）。

**位置检测**（推荐方案）：

1. 注册 `conversation.chat.assistant-actions`（list，每条完成消息一次，owner props 含 `messageId`）；
2. 在里面渲染一个 1px 不可见的哨兵元素（`data-ai-dream-message-id`）；
3. 用 `IntersectionObserver`（`root: null`，祖先 `overflow` 裁剪由规范保证）找出**最上方可见**的哨兵；
4. 该 `messageId` → 该消息的 `canvas` 表达 → 设为回看目标。

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
