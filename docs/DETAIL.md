# AI Dream

**A**rtificial **I**ntelligence **D**riven **R**eal-time **E**motional **A**mbient **M**edium —— 让每个 AI 的感受有形状。

一块常驻右侧栏的 AI 表达窗口：用一片会呼吸的连续光晕，纯视觉地流露 AI 对当前对话的情绪状态；次要模式可以画结构化图解 / 卡片。

## 用法

1. 安装后在会话里正常聊天，AI 会自己决定这一轮要不要表达。
2. 打开画布有两种方式：
   - 右侧栏起始页里的「AI Dream」卡片；
   - 对话里每次出现画布时的那条可点击提示。
3. 每个会话第一条消息之后，Host 会根据对话历史生成你的 AI 专属的**情绪签名**（6–10 个情绪，含色板/运动/形态），之后 AI 按名字引用；AI 也能随时用 `define` 块新增情绪。
4. 没有新表达时，画布保持当前状态并缓慢回落；从未表达过时显示中性待机光晕。
5. 可在 profile 的 `cordis.patch.yml` 里给插件行加 `config:` 调整（签名数量、保持/衰减时长、默认强度、是否允许自定义色板），详见仓库 README「配置」。

## 数据格式（协议 v2）

情绪氛围光（主模式，纯视觉，AI 可定义自己的情绪）：

```canvas
{"kind":"mood","schema":2,"name":"被看穿时的不安","intensity":0.7,"palette":{"base":"#0b0a12","core":"#e8d9ff","tone":"#9a7aa6","spectrum":["#c9a3e0","#6a4b8f"]},"motion":{"speed":0.6,"amplitude":0.5,"rhythm":"uneven"},"form":"streak","transition":{"style":"burst","speed":"fast"}}
```

省略 `palette` 时复用内置词表（calm / curious / uneasy / warm / tired / excited / focused / amused / neutral）。

字段：

- `name`：情绪名（自由文本，仅用于历史/调试，不上屏）；
- `palette`：AI 自定义色板，`base` 背景、`core` 光核、`tone` 辅助色、`spectrum` 光谱色（2–4 个 hex）；
- `motion`：`speed` 运动速度（0.2–2.0）、`amplitude` 呼吸幅度（0.1–1.0）、`rhythm` 节奏；
- `form`：`cloud` 柔圆光晕 / `ring` 光环 / `streak` 光带 / `spiral` 缓慢旋转；
- `orb`（可选，高级）：`size` / `pulse` / `tone` 微调光球；
- `intensity`：强度 0.2–1.0；
- `transition`：过渡方式与快慢（柔和 / 涟漪 / 爆发 / 溶解 / 瞬切）。

思维（次要模式）：`diagram` / `cards`，上限 10 个节点 / 14 条边 / 6 张卡片。

> 完整协议、签名与降级规则见 [expression-protocol.md](expression-protocol.md)。

## 已知限制

- 画布状态来自当前已加载的对话节点，不跨会话、不持久化到磁盘（情绪签名与记忆是 v1.0 的内容）。
- 内置情绪是 fallback 词表；AI 自定义色板受客户端 hex 校验与数值夹紧保护，非法输入逐字段回退。
- 画布数据解析失败时保留上一版成功结果。
- 尊重系统「减少动态效果」设置：开启后停止所有动画。
- 插件只渲染 `canvas` 语言的 fence；其他语言的 fence 不受影响。

## 连续性

- 新的 canvas 块只更新**目标参数**；画布由一个 `requestAnimationFrame` 引擎逐帧做指数插值，颜色、尺寸、透明度、模糊、旋转都是连续变化的，不再有整帧替换。
- 转场风格对应插值行为：`soft` 常规缓动、`dissolve` 更慢更柔、`burst` 更快并带一次亮度闪、`ripple` 附带扩散环、`snap` 立即到位。
- 长时间没有新表达时，光晕会缓慢回落到平静基线（衰减）。
- `form` 的形态切换用**双层交叉淡化**完成（约 1.8 秒），形状本身不插值，但过渡是连续的。
- 后续可接流式 JSON 增量解析，让画布在 AI 生成 canvas 块的过程中就开始漂移。
