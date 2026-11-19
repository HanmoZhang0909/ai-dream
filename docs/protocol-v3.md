# AI Dream 表达协议 v3（开放表达 + 程序不崩）

> 状态：**v3.0 设计口径（文档/契约先行，渲染器分轮接入）**。v2 表达继续有效；v3 是追加式扩展，旧渲染器忽略未知字段。
>
> 机器契约：[`protocol-v3.schema.json`](protocol-v3.schema.json) · CI：[`scripts/check-protocol-v3.mjs`](../scripts/check-protocol-v3.mjs) · 风格样例：`examples/v3/*.json`

## 0. 一句话立场

**给别的 AI 最大表达自由；程序不能崩；视觉上极端也没关系。**

- 自由 = 词汇开放（任意 primitive/form 名字）、结构开放（层数、变换、遮罩、关键帧、缓动、层间关系）、生成式（seed/variation/frou 类随机）、AI 自定义 macro；
- 不崩 = 资源与执行有硬边界（见 §4），任何异常降级到"至少一团光"；
- 视觉 = 不审美审查（怪、空、乱、极亮/极暗都允许），只做无障碍硬约束（闪烁频率、reduced-motion）。

## 1. 两种兼容

| 维度 | 兼容什么 | 手段 |
|---|---|---|
| AI 之间 | 不同 AI 的概念与审美 | 分层 L0–L3 + **开放词汇表** + 自定义 macro + 未知项通用降级 |
| 渲染器之间 | DSH / MCP App / 未来前端 | 能力声明 + 归一化参数 + L3→L0 降级 |
| 版本之间 | v2 / 未知新字段 | 只增不删、未知忽略、永不报错 |

## 2. 分层表达（能力档位）

| 层 | 内容 | 保底 |
|---|---|---|
| **L0** | `palette` + `intensity`（+ `name`） | 任何渲染器都懂 |
| **L1** | + `form`（6 内置形态）+ `motion`（基础动态） | 未知 form → cloud |
| **L2** | + `layers`（开放 primitive 名单 + 变换/遮罩/质感/方向/关系/节奏） | 未知 primitive → `fallback` → 通用 blob |
| **L3** | + `macros`（AI 自定义复合原语）+ `layers[].primitive="macro"` + `keyframes` 时间轴 | 未知 macro → fallback → blob |

`schema: 3` 仅声明"我可能用 v3 字段"，不强制。

## 3. 自由信封：开放到什么程度

### 3.1 词汇开放
`primitive` / `form` / `motion` 的键名**不再限定枚举**。AI 可以写 `"primitive": "liquid"`、`"primitive": "静默"`、`"motion": {"driftLikeRiver": {...}}`。渲染器行为：

1. 认识 → 按注册表渲染；
2. 不认识 → 看 `fallback`（若给）→ 按名字相似度猜 family（如含 `ring` 就用 ring）→ 通用 `blob`；
3. 永远不因为"名字不认识"而丢弃整块。

### 3.2 结构开放（只要在预算内）
- `layers` ≤ 8 层，每层可带 `transform`（scale/translate/rotate/skew）、`mask`（radial/linear + softness + angle）、`blend`、`grain`/`gloss`、`direction`（lean/reach/contract）、`relations`（follow/converge/split/echo）；
- 动画既可写"原语名"（breath/drift/rotate/wobble/flicker/uneven/hold/afterglow），也可写 **`keyframes` 时间轴**：`[{at:0, values:{scale:0.8,opacity:0.3}, easing:"ease-out"}, ...]`，`at` 为 0–1 归一化时间；
- `variation` 每次采样一次构图差异；`seed` 可复现。

### 3.3 AI 自定义 macro
```json
"macros": { "liquid": { "primitive": "blob", "size": 0.6, "softness": 0.9, "motion": { "wobble": { "amplitude": 0.2 } } } },
"layers": ["..."] // {"primitive":"macro","name":"liquid","fallback":"blob"}
```
macro 只能引用已注册原语与参数，不能执行代码；嵌套 macro 最多 2 层。

### 3.4 生成式
`seed` + `variation` + 原语自带随机参数（`scatter`/`drift` 等）允许每次略有不同；随机只在**采样**发生，不逐帧。

## 4. 程序不崩：硬边界（唯一不可协商的部分）

1. 不执行 raw CSS/SVG/脚本/外部资源；只接受结构化 JSON；
2. 资源上限：`layers ≤ 8`、每层元素 ≤ 6、`particles` 总数 ≤ 800、动画元素总数 ≤ 1200、模糊映射 ≤ 96px、单次动画 ≤ 60s；
3. 只允许 `transform`/`opacity` 动画（不做布局动画）；
4. 闪烁/闪动频率上限于 3 Hz（光敏安全）；`prefers-reduced-motion` 冻结动作保留静态构图；
5. 任何参数越界 → 夹紧；非法结构 → 该层/该字段降级；渲染异常 → 捕获并回落 L0 光晕；
6. **保底不空白**：最低输出 = 一团按 palette+intensity 渲染的光。

## 5. 原语参考（不是白名单，只是"认识的"）

> 认识的按语义渲染；不认识按 §3.1 降级。以下为 v3 参考集：

几何：`blob`、`ring`、`band`、`spiral`、`lines`、`haze`、`particles`，以及任何 `macro`。
层修饰：`paletteSlot`、`blend`、`grain`、`gloss`、`direction`、`transform`、`mask`。
动态：`breath`、`drift`、`rotate`、`wobble`、`flicker`、`uneven`、`hold`、`afterglow`，以及 `keyframes`。
关系：`follow`、`converge`、`split`、`echo`。

参数全部归一化：位置 0–1、偏移 -1–1、角度为度、频率 Hz、其余 0–1。

## 6. 能力协商与降级矩阵

渲染器声明：`{"protocol":3,"primitives":[...],"motions":[...],"features":["variation","macros","keyframes","relationships","afterglow"],"limits":{...}}`。表达式可写 `requires`。

| 情况 | 行为 | 保底 |
|---|---|---|
| 未知 primitive / motion 名 | fallback → 名字相似 → blob / 丢弃该动态 | blob / 静态 |
| macro 未定义 | macro 层 fallback → blob | blob |
| 不支持 particles | blob + grain | blob |
| 层数超限 | 按 `priority`（缺省数组序）保留前 N 层 | ≥1 层 |
| 不支持 keyframes | 取首帧静态值 | 静态 |
| 不支持 variation | 忽略，seed 仅用于构图 | 静态 |
| 参数非法/越界 | 夹紧/丢弃该字段 | 仍渲染 |
| 整块不可解析 | 保持上一状态 | 上一状态 |
| 全空 | 空态 | 空态 |

降级原因需可观测（debug 数据属性/Host 日志），保住可解释性。

## 7. 版本演进

v3 主版本；字段只增不删；未知字段忽略；未知枚举走降级；`schema` 不强制。MCP `express_emotion` schema 在后续轮次同步至 v3。

## 8. 兼容性证据：四种"别的 AI 风格"样例

`examples/v3/`：

1. `minimal.json` —— 只有颜色+强度（L0，极简型 AI）；
2. `lyrical.json` —— 多层 haze/echo/afterglow + variation（L2 自由信封）；
3. `geometric.json` —— rings/bands + hold/rotate（L2）；
4. `symbolic.json` —— 自定义 macro `sigil`（L3）；
5. `wild.json` —— **故意使用未注册 primitive 名 + keyframes + 极端参数**，验证"不认识也能降级渲染、程序不崩"。

CI 校验 schema、合法引用与降级期望；渲染截图在 GUI 轮次补齐。

## 9. 实现状态

- **规划器（已实现，v1.23.0）**：`renderer/core.mjs` 的 `resolveCapabilities` / `resolvePrimitive` / `normalizeMotionV3` / `normalizeKeyframesV3` / `normalizeLayerV3` / `expressionTier` / `degradeToL0` / `planExpressionV3`；
  - 输出 `{tier, tierRequested, palette, intensity, layers, macros, keyframes, seed, variation, afterglow, transition, degradations}`；
  - 保证不抛错：任何非法/超限输入都会被夹紧、降级并记录 `degradations`，最差回落 L0 光晕；
  - 单测覆盖五个风格 fixtures、能力协商（弱渲染器 / 无 variation / 无 afterglow）、层/粒子/闪烁上限、非法 keyframes、junk 输入等（`scripts/check-renderer-core.mjs`）。
- **渲染器接入（进行中）**：
  - v1.24.0 已实现**静态分层渲染**：`client.js` 的 `planV3Client` + `V3Scene` 把 `layers` 变成绝对定位 CSS 层（paletteSlot/opacity/blend/blur/transform/mask/grain，primitive 解析与 core 同款回退链），用 `window.__AI_DREAM_FORCE_V3` 可注入 v3 表达式做 GUI 断言（脚本相位 exit 20）；
  - 待接入：GUI 截图与 `v3.0.0` 发布（当前 `dsh web` token 已轮换，GUI 验证排队）。
  - v1.25.0 已实现**动画采样与播放**：core 的 `sampleMotionV3`（breath/drift/rotate/wobble/flicker/uneven/hold）、`sampleKeyframesV3`（缓动插值含 `steps(n)`）、`variationOffset`/`hashUnit`（种子采样）、`applyRelationsV3`（follow/converge/split/echo + delay/strength）；客户端 `V3Scene` 用一条 rAF 只改 `transform`/`opacity`，标签页隐藏时暂停，`prefers-reduced-motion` 下静止。