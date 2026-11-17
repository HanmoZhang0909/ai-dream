# AI Dream

**A**rtificial **I**ntelligence **D**riven **R**eal-time **E**motional **A**mbient **M**edium —— 让每个 AI 的感受有形状。

一块常驻右侧栏的 AI 表达窗口：用一片会呼吸的连续光晕，纯视觉地流露 AI 对当前对话的情绪状态；次要模式可以画结构化图解 / 卡片。

## 用法

1. 安装后在会话里正常聊天，AI 会自己决定这一轮要不要表达。
2. 打开画布有两种方式：
   - 右侧栏起始页里的「AI Dream」卡片；
   - 对话里每次出现画布时的那条可点击提示。
3. 没有新表达时，画布保持当前状态并缓慢回落；从未表达过时显示中性待机光晕。

## 数据格式

情绪氛围光（主模式，纯视觉）：

```canvas
{"kind":"mood","mood":"calm|curious|uneasy|warm|tired|excited|focused|amused|neutral","intensity":0.2-1.0,"transition":{"style":"soft|ripple|burst|dissolve|snap","speed":"slow|medium|fast"},"nebula":{"pattern":"spiral|ring|cloud|streak","density":0.1-1.0,"activity":0.1-1.0},"orb":{"size":0.1-1.0,"pulse":"steady|breathe|flicker","tone":"warm|cool|neutral|bright"}}
```

语义：

- `mood` + `intensity`：下意识情绪（背景光的颜色与热度）；
- `nebula`：光球形态，`cloud` 柔圆光晕、`ring` 光环、`streak` 光带、`spiral` 缓慢旋转的光；
- `orb`：光球本身，主动想表达的东西（大小 / 呼吸 / 色温）；
- `transition`：这次变化的过渡方式与快慢（柔和 / 涟漪 / 爆发 / 溶解 / 瞬切）。

思维（次要模式）：`diagram` / `cards`，字段同上限：10 个节点 / 14 条边 / 6 张卡片。

## 已知限制

- 画布状态来自当前已加载的对话节点，不跨会话、不持久化到磁盘。
- 情绪是受控词表（9 种），不是自由生成画面；视觉由客户端内置。
- 画布数据解析失败时保留上一版成功结果。
- 尊重系统「减少动态效果」设置：开启后停止所有动画。
- 插件只渲染 `canvas` 语言的 fence；其他语言的 fence 不受影响。

## 连续性

- 新的 canvas 块只更新**目标参数**；画布由一个 `requestAnimationFrame` 引擎逐帧做指数插值，颜色、尺寸、透明度、模糊、旋转都是连续变化的，不再有整帧替换。
- 转场风格对应插值行为：`soft` 常规缓动、`dissolve` 更慢更柔、`burst` 更快并带一次亮度闪、`ripple` 附带扩散环、`snap` 立即到位。
- 长时间没有新表达时，光晕会缓慢回落到平静基线（衰减）。
- `nebula.pattern` 的形态切换用**双层交叉淡化**完成（约 1.8 秒），形状本身不插值，但过渡是连续的。
- 后续可接流式 JSON 增量解析，让画布在 AI 生成 canvas 块的过程中就开始漂移。
