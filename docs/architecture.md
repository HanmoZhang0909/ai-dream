# AI Dream — 技术框架

> 状态：草案。目标是把现在"能跑的 demo"整理成"可演进的产品"：协议与渲染引擎解耦，宿主适配器可替换。

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

## 2. 表达协议 v2（草案）

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

> 拆分时机：v0.4 协议 v2 落地时。DSH 客户端仍保持单文件产物（可内联打包）。

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

## 5. 宿主适配与平台兼容

| 平台 | 扩展形态 | 常驻能力 | 持续动画 | 主要限制 |
|---|---|---|---|---|
| **DSH**（现在） | 客户端插件（进程内、代码级） | 右栏 tab 常驻 | ✅ rAF | 绑定 DSH 版本 |
| **ChatGPT** | MCP App（Apps SDK / Plugin Extensions） | 侧栏 / conversation panel / PiP | ✅（PiP 定位支持持续内容） | CSP、禁内联脚本、尺寸封顶、上架审核 |
| **Claude** | MCP App（连接器） | side panel / fullscreen（部分限组织） | ✅（官方示例含实时 shader） | 常驻面灰度、目录需 Verified |
| **WorkBuddy（腾讯）** | MCP + 插件（Skill/MCP/Hook/Agent/Rule） | ❌ 无自定义侧栏 | MCP Apps iframe（桌面端未核实） | 无自定义面板接口 |
| **Claude Code** | plugin（skills/hooks/mods） | 终端/VS Code pane | ❌ 无 Web UI | 只能静态降级 |

移植策略：**协议 + 渲染引擎做成 MCP App 可承载的 HTML/JS 产物**，AI 通过工具调用推送表达参数；宿主适配层各写一份。

## 6. 技术债与迁移计划

| 债务 | 影响 | 计划 |
|---|---|---|
| 单文件 37KB，协议与渲染耦合 | 难测试/难移植 | v0.4 拆 core/protocol/renderer |
| 情绪词表硬编码 | 与"AI 自定义情绪"冲突 | v0.4 改为 AI 定义 + 内置 fallback |
| 无 Config | 用户无法调参 | v0.4 加插件 Config |
| 无状态 | 每次从零开始 | v1.0 状态层 |
| 无反馈入口 | 无法校准 | v1.0 |
| 仅 DSH 宿主 | 平台受限 | v1.x MCP App 适配器 |

## 7. 风险

- **协议自由度 vs 审美**：AI 自定义颜色可能丑 → 需要默认签名 + 边界夹紧 + 人工可调；
- **跨平台渲染一致性**：不同 iframe 的 CSP/性能差异 → 渲染核心保持纯函数式、少依赖；
- **成本**：协议参数占 token → 控制表达块长度，必要时用短键名。
