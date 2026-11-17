# 表达协议（Expression Protocol）

> 版本：v2 **已实现**（v0.4，2026-11）；v1 = 之前发布的 9 情绪枚举。协议是 AI Dream 的核心资产：**AI 定义表达，渲染器负责安全与连续性**。
>
> 实现说明：`client.js` 的 `normalize()` 负责校验与降级，`resolveColors()` 负责调色板解析；`index.js` 的提示词是协议对模型可见的那一侧。

## 1. 目标

- AI 不被固定情绪词表限制：可以定义自己的情绪名、颜色语言、运动方式；
- 渲染端可控：亮度/对比/性能/可访问性由客户端夹紧，非法输入自动降级；
- 可移植：协议与渲染引擎不依赖宿主（DSH、ChatGPT、Claude 都能承载）。

## 2. 块格式

仍然是回复里一个行首 fenced block：

````
```canvas
{"kind":"mood", ...}
```
````

一个回复最多一个表达块。JSON 必须是合法对象，未知字段忽略。

## 3. v2 字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `kind` | `"mood"` | 是 | 情绪块 |
| `schema` | `2` | 否 | 缺省视为 1（兼容旧块） |
| `name` | string ≤40 | 否 | 情绪名（自由文本，用于历史/调试，不上屏） |
| `intensity` | number | 否 | 0.2–1.0，缺省 0.6 |
| `palette.base` | hex | 否 | 背景底色 |
| `palette.core` | hex | 否 | 光核颜色 |
| `palette.tone` | hex | 否 | 辅助色（色温倾向） |
| `palette.spectrum` | hex[] 2–4 项 | 否 | 光谱色（环形/旋转形态使用） |
| `motion.speed` | number | 否 | 0.2–2.0，整体运动速度倍率 |
| `motion.amplitude` | number | 否 | 0.1–1.0，呼吸/脉动幅度 |
| `motion.rhythm` | `steady｜breathing｜uneven` | 否 | 运动节奏，缺省 `breathing` |
| `form` | `cloud｜ring｜streak｜spiral` | 否 | 光的形态，缺省 `cloud` |
| `transition.style` | `soft｜ripple｜burst｜dissolve｜snap` | 否 | 变化方式 |
| `transition.speed` | `slow｜medium｜fast` | 否 | 插值时长：约 2.2s / 1.0s / 0.4s |

## 3.1 情绪签名与动态定义（v0.5）

**签名文档**（Host 初始化时生成，不经过聊天消息，直接下发客户端）：

```json
{
  "kind": "signature",
  "version": 1,
  "emotions": [
    { "name": "心疼", "palette": { "base": "#0d0906", "core": "#ffe3d1", "tone": "#ff9a6b" }, "motion": { "speed": 0.7, "amplitude": 0.5, "rhythm": "breathing" }, "form": "cloud" }
  ]
}
```

**动态新增**（AI 在回复里随时追加，客户端合并进会话签名；对话里折叠成一行提示）：

```canvas
{"kind":"define","emotions":[{"name":"被看穿","palette":{"base":"#0b0a12","core":"#e8d9ff","tone":"#9a7aa6"},"motion":{"speed":0.6,"amplitude":0.5,"rhythm":"uneven"},"form":"streak"}]}
```

**解析顺序**（逐字段）：

1. `mood.name` 命中**会话签名** → 用签名里的 palette/motion/form；
2. 块内 **inline `palette`/`motion`/`form`** 覆盖签名（允许单次微调）；
3. 命中**内置词表**（按 `mood` 或 `name`）；
4. 全部未命中 → neutral 基线。

## 4. 降级与校验

优先级（逐字段独立）：

1. **块内 inline 值**（AI 本次显式给出且合法）；
2. **会话情绪签名**（初始化生成 / `define` 追加，v0.5）；
3. **内置词表**（9 种情绪，按 `mood` 或 `name` 命中）；
4. **neutral 基线**。

校验规则：

- 颜色只接受 `#rgb` / `#rrggbb`；非法颜色逐字段回退；
- 数值夹紧到区间（不报错），非数值忽略；
- 未知 `form` 回退 `cloud`；未知 `transition` 回退 `soft/medium`；
- 整个 JSON 解析失败：保留上一版画面，原文保留在对话中。

## 5. 渲染器安全边界

- **亮度/对比**：光核与背景的亮度差夹紧，避免全屏刺眼或看不见；
- **性能**：单画面动画元素数量有限；`prefers-reduced-motion` 下停止动画、直接到目标状态；
- **可读性**：画布不承载文字，颜色只做情绪表达；
- **尺寸**：形态尺寸由 `orb.size` / `intensity` 推导并封顶，避免超出容器。

## 6. 示例

**AI 自定义情绪（v2）**

```canvas
{"kind":"mood","schema":2,"name":"被看穿时的不安","palette":{"base":"#0b0a12","core":"#e8d9ff","tone":"#9a7aa6","spectrum":["#c9a3e0","#6a4b8f"]},"motion":{"speed":0.6,"amplitude":0.5,"rhythm":"uneven"},"form":"streak","intensity":0.7,"transition":{"style":"burst","speed":"fast"}}
```

**内置 fallback（只写 name）**

```canvas
{"kind":"mood","name":"温暖","intensity":0.65}
```

**思维模式（不受 v2 影响）**

```canvas
{"kind":"diagram","nodes":[{"id":"a","label":"A"}],"edges":[{"from":"a","to":"b"}]}
```

## 7. 兼容与版本

- v1 块（`mood: "warm"` 枚举）继续有效，映射到内置词表；
- 新字段只增不删，`schema` 升版时保证旧块可读；
- 渲染器实现版本与协议版本解耦：先升级协议，再按需升级渲染能力。

## 8. 未来扩展（草案）

- `form` 扩展为可注册形态：`weather:rain`、`weather:fog`、`character:idle`；
- `stream`：支持 partial 片段，让画面在生成过程中就开始漂移；
- `feedback`：用户校准事件回写情绪签名（v1.0 行为，不进协议块）。
