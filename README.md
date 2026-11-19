# AI Dream

[![ci](https://github.com/HanmoZhang0909/ai-dream/actions/workflows/ci.yml/badge.svg)](https://github.com/HanmoZhang0909/ai-dream/actions/workflows/ci.yml)

> **A**rtificial **I**ntelligence **D**riven **R**eal-time **E**motional **A**mbient **M**edium
> 让每个 AI 的感受有形状。
> *A shape for every feeling.*

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 **AI 情感出口**：
右侧栏一块连续流动的光——不是解释对话，而是表达 AI 自己的情绪状态。

![AI Dream 情绪循环演示](docs/demo.gif)

> 上图为 `docs/demo.html` 独立复刻页渲染的 6 秒循环（calm → warm → curious → calm），**不是 DSH 界面截图**；真实界面截图欢迎 PR 补到 `docs/screenshot.png`。
>
> **在线交互预览**：<https://hanmozhang0909.github.io/ai-dream/demo.html>（浏览器直接打开即有效果，不需要装 DSH）

## 它是什么

给 AI 一个纯视觉的表达窗口：

- **不是思维画布**：不画答案的结构，画的是"我此刻是什么状态"；
- **纯视觉**：画布上没有任何文字，颜色、亮度、运动、形态承担表达；
- **AI 自主**：每一轮由模型自己决定要不要表达、表达什么，不逼迫、不每轮必画；
- **连续演化**：由 `requestAnimationFrame` 逐帧插值，新状态不会"跳帧"，而是滑过去；长时间没有新表达会自然衰减回基线；
- **可选的双模式**：主模式是情绪氛围光，次模式保留结构化的 `diagram` / `cards`，用于确实需要解释结构的场合。

## 安装

前提：正在使用 DSH 的 Web 界面（`profile=web`）。

| 方式 | 操作 |
|---|---|
| **本地目录** | 打开 **插件** 页 → **Add plugin** → 选**本仓库目录**（绝对路径） |
| **npm**（发布后） | 插件页 → Add plugin → 输入包名 `dsh-ai-dream` |
| **Git** | 插件页 → Add plugin → 输入 `https://github.com/HanmoZhang0909/ai-dream`（或 `github:HanmoZhang0909/ai-dream#main`） |

安装完成后按提示刷新页面，然后打开右侧栏，在起始页点「**AI Dream**」卡片。

> 也可以让 Agent 用 `plugin_manager` 的 `install_bundle`，`target` 传本目录的绝对路径。

注意事项：

- 本插件**零构建**，不需要 `pnpm build`，也不需要 `node_modules`。
- 安装后会在该 profile 的**所有会话**里注入一段画布格式说明（这是 AI 能自主表达的前提）；不需要时禁用插件即可。
- 如果页面没变化，先强制刷新（Ctrl+F5）；插件安装/替换后偶尔需要重启一次 DSH。

## 快速上手

第一次用，跟着这五步：

1. **安装并刷新**：按上面的方式安装插件，按提示刷新页面（不生效就 Ctrl+F5）。
2. **打开画布**：打开右侧栏 → 起始页 → 点「**AI Dream**」卡片。画布会先显示一个中性待机光。
3. **正常聊天**：不用下指令。聊到有情绪的地方，AI 会自己决定表达——例如聊到累、开心、害怕、被安慰。
4. **看它演出**：对话里会出现一行「已更新到 Dream」的折叠提示，右侧的光会**滑向**新的情绪（不是跳变），停下几秒后会慢慢暗下来。
5. **主动触发（可选）**：直接说「表达一下你现在的状态」，或者把下面这段贴进对话：

```canvas
{"kind":"mood","schema":2,"name":"好奇","intensity":0.7,"palette":{"core":"#ffe9a8","tone":"#ff9f43"},"form":"spiral","transition":{"style":"soft","speed":"medium"}}
```

几个要知道的点：

- **不是每轮都画**：这是设计——只在真的"有感受"时表达；没有新表达时光会自然衰减回基线。
- **AI 可以定义新情绪**：它随时能发一个 `define` 块，给会话签名加新情绪（对话里显示为「已定义 N 个情绪」）。
- **签名自动生成**：每个会话第一条消息之后，Host 会根据当前对话历史给这个 AI 生成一套自己的情绪词汇（6–10 个），之后按名字引用，不需要每次都给色板。
- **画布不持久**：它只从当前会话已加载的对话里取最新 `canvas` 块，换会话/刷新会重新开始。
- **可以校准它的表达**：画布底部有「不像 / 再强一点 / 再淡一点」三个轻量按钮，调节会立即生效并记在本地。
- **回看情绪**：把对话往上滚，画布会跟随那一轮的情绪；面板底部出现「回看 · 第 N 轮 · 回到最新」，点击即可回到底部恢复实时。
- **迷你情绪时间轴**：底部一排颜色点代表最近几轮的情绪，点击任意一个跳回那一轮。
- **首次使用引导**：第一次打开画布会有一条简短说明（颜色点/校准按钮是什么），点「知道了」或 5 秒后消失，之后不再出现。
- **画布校准**：底部三枚按钮只调光（不像 / 再强一点 / 再淡一点），每次点击会短暂提示效果，到上限会提示「已到上限」，校准只影响画面、不改 AI 的回复。
- **还没有表达时**：画布是一颗更小更慢的"睡着"的光，下面写着「还没有感受可以成形状 / 发送消息后画布会亮起」；校准与圆点会等到 AI 第一次表达后才出现。
- **想让它停下来**：在插件页禁用 `dsh-ai-dream` 即可，注入的提示词也会一起移除。

## 常见问题

| 现象 | 处理 |
|---|---|
| 起始页没有「AI Dream」卡片 | 确认 profile 是 `web`、插件已启用；强制刷新（Ctrl+F5）；仍不行重启一次 DSH |
| 画布 tab 显示「这类内容还没有可用的查看方式」 | 那是旧的 tab 实例：关掉该 tab，再从起始页卡片重新打开 |
| 对话里的 canvas 块没折叠成提示 | 确认块以**行首的三个反引号 + canvas** 开头并完整闭合；插件未加载时先刷新页面 |
| 改了 `client.js` 页面没变化 | 客户端 bundle 有缓存：刷新；必要时禁用再启用插件，或重启 DSH |
| 画布没有动画 | 系统开启了「减少动态效果」（prefers-reduced-motion）时会停用动画，属预期行为 |
| 不想让所有会话都带提示词 | 插件页禁用插件；提示词随插件一起移除 |

## 使用

正常聊天即可。AI 有情绪时会自己输出一个 `canvas` 块，对话里它会折叠成一行可点击提示，右侧氛围光同步演出。

### 情绪模式（主，协议 v2）

AI 可以选内置情绪，也可以**定义自己的情绪**（名字 + 调色板 + 运动 + 形态）：

```canvas
{"kind":"mood","schema":2,"name":"被看穿时的不安","intensity":0.7,"palette":{"base":"#0b0a12","core":"#e8d9ff","tone":"#9a7aa6","spectrum":["#c9a3e0","#6a4b8f"]},"motion":{"speed":0.6,"amplitude":0.5,"rhythm":"uneven"},"form":"streak","transition":{"style":"burst","speed":"fast"}}
```

省略 `palette` 就复用内置词表：

```canvas
{"kind":"mood","name":"温暖","intensity":0.65}
```

| 字段 | 含义 |
|---|---|
| `name` | 情绪名（自由文本，用于历史/调试，不上屏） |
| `mood` | 可选，内置情绪 key，作为色板 fallback |
| `palette.base/core/tone/spectrum` | AI 自定义色板（hex；缺省字段回退到内置） |
| `motion.speed/amplitude/rhythm` | 运动快慢 / 呼吸幅度 / 节奏 |
| `form` | 形态：`cloud` / `ring` / `streak` / `spiral` |
| `intensity` | 情绪强度 0.2–1.0 |
| `transition.style/speed` | 转场方式：`soft`/`ripple`/`burst`/`dissolve`/`snap`，时长 `slow`/`medium`/`fast` |

内置情绪（fallback）：`calm` 平静、`curious` 好奇、`uneasy` 不安、`warm` 温暖、`tired` 疲惫、`excited` 兴奋、`focused` 专注、`amused` 轻快、`neutral` 中性待机。

> 完整协议与校验规则见 [docs/expression-protocol.md](docs/expression-protocol.md)。

### 思维模式（次）

```canvas
{"kind":"diagram","nodes":[{"id":"a","label":"短标签"}],"edges":[{"from":"a","to":"b"}]}
```

```canvas
{"kind":"cards","cards":[{"title":"短标题","body":"一两句话"}]}
```

## 架构

```
Plugin bundle
├── index.js          Host 半边：向系统提示注入画布约定（何时表达 + JSON schema）
├── client.js         Client 半边：单文件 lazy-CJS
│   ├── 右栏 tab        sidebarRightTabs.register + sidebar.right.pane.tab
│   ├── fence 折叠层    conversation.chat.markdown.fence（key = canvas）
│   └── rAF 引擎        目标参数 → 逐帧指数插值 → CSS 自定义属性 → 氛围光
├── cordis.patch.yml  bundle patch
├── locale/*.json     插件行标题/描述
└── docs/             产品需求、技术框架、表达协议
```

> 规划与取舍见：[docs/product.md](docs/product.md)、[docs/architecture.md](docs/architecture.md)、[docs/expression-protocol.md](docs/expression-protocol.md)。

数据流：

```
对话消息里的 canvas 块
  → useChat 选择器取最新一块 → JSON 校验/归一化
  → 目标参数（颜色 / 尺寸 / 透明度 / 模糊 / 形态）
  → rAF 每帧指数插值（τ 由 transition 决定）
  → 写入 CSS 自定义属性 → 氛围光连续演化
```

技术要点：

- **零依赖**：`react` 从宿主模块表 `require('react')` 取得，不打包任何第三方库；
- **主题安全**：UI 元素只用宿主 `--dsw-alias-*` token；氛围光本身属于 artwork，使用自有色板；
- **可访问性**：尊重 `prefers-reduced-motion`，开启后停止动画、直接到目标状态；
- **形态切换**：`pattern` 变化用双层交叉淡化，形状不插值但过渡连续。

## 开发

```bash
# 语法检查（无需安装依赖）
node --check client.js
node --input-type=module -e "await import('./index.js')"

# fence 提取器回归测试（防止行内 ```canvas 被误识别）
node scripts/check-fence-regex.mjs

# 本地安装后：改 client.js → 刷新页面（或等 HMR 轮询重建）
```

> 文档索引与维护规则见 [docs/README.md](docs/README.md)；产品需求、技术框架、表达协议分别在 `docs/product.md`、`docs/architecture.md`、`docs/expression-protocol.md`，自主迭代记录见 `docs/iterations.md`。

仓库结构：

```
.
├── index.js              Host 半边（系统提示）
├── client.js             Client 半边（氛围光全部渲染逻辑）
├── cordis.patch.yml
├── package.json
├── locale/{en,zh}.json
├── docs/
│   ├── DETAIL.md         插件管理器详情页
│   ├── demo.html         独立复刻页（浏览器直接打开即可交互预览）
│   └── demo.gif          README 演示动图（由 demo.html 渲染）
├── scripts/
│   └── check-fence-regex.mjs   fence 提取器回归测试
├── renderer/
│   └── core.mjs         与宿主无关的渲染核心（协议规范化/插值参数，MCP 渲染器共用）
├── resources/
│   └── ai-dream.html    MCP App 渲染器骨架（`?t=` 定格 / `#probe` 自检）
├── mcp/
│   ├── app-manifest.json 可移植工具契约（`express_emotion`）
│   └── server.mjs        stdio JSON-RPC MCP server
└── icon.svg
```

## 分发与生态

- DSH 的第三方插件通过 **Discover（插件市场）** 被发现：启用实验性插件市场 bundle 后，添加一个**索引 URL**（format 1 JSON）即可浏览与安装；
- 本仓库自带一个可直接添加的市场索引：`https://hanmozhang0909.github.io/ai-dream/index.json`（Discover → Add index source；已用官方校验器验证，安装规格为 commit 固定的 git 源）；
- 官方插件市场正在建设中（2026-11 官方披露），目前生态主要靠各索引与 npm/Git 安装；
- 本仓库建议在 GitHub 上打 `dsh-plugin`、`deepseek-harness` topics，方便按主题检索；
- 后续计划：发布 npm 包 `dsh-ai-dream`。

## 配置

在 profile 的 `cordis.patch.yml`（如 `~/.dsh/profiles/web/cordis.patch.yml`）里给插件行加配置：

```yaml
- id: ai-canvas
  name: dsh-ai-dream
  config:
    signatureEmotions: 8
    holdSeconds: 6
    decaySeconds: 3
    defaultIntensity: 0.6
    allowInlinePalette: true
    signatureEnabled: true
```

| 字段 | 默认 | 范围 | 含义 |
|---|---|---|---|
| `signatureEnabled` | true | 布尔 | 是否在会话开始时自动生成情绪签名 |
| `reuseSignature` | true | 布尔 | 新会话优先复用上次持久化的签名（省一次模型调用） |
| `replayEnabled` | true | 布尔 | 是否启用滚动回看（关闭后画布只跟随最新表达） |
| `calibrationEnabled` | true | 布尔 | 是否显示画布底部的校准按钮 |
| `signatureEmotions` | 8 | 4–12 | 签名里的情绪数量 |
| `holdSeconds` | 6 | 1–60 | 无新表达后保持当前状态的时间 |
| `decaySeconds` | 3 | 0.5–30 | 回落到基线的时长 |
| `defaultIntensity` | 0.6 | 0.2–1 | 未指定强度时的默认值 |
| `allowInlinePalette` | true | 布尔 | 是否允许 AI 在表达里直接写色板 |

配置在**该会话的下一条消息**时生效（Host 写入配置记录，前端再夹紧）。

### 模型侧校准（可选）

除了画布底部的三个按钮，还可以写一个本地校准文件，让 Host 把它注入系统提示词（影响模型自己的表达，而不只是画面）：

`~/.dsh/storages/dsh-ai-dream/calibration.json`

```json
{ "tone": "更克制，避免夸张", "note": "别用太重的颜色", "intensity": 0.5 }
```

- `tone` ≤ 200 字、`note` ≤ 120 字，控制字符会被清理；`intensity` 夹紧 0.2–1；
- 修改后在插件页禁用再启用一次（Host 在加载时读取），新会话/新请求的提示词里就会出现「## Calibration」段。

## 已知限制

- 画布状态来自当前已加载的对话节点，**不跨会话、不持久化**（情绪签名与记忆属于 v1.0）；
- 内置情绪只是 fallback 词表；AI 自定义色板受 hex 校验与数值夹紧保护，非法输入逐字段回退；
- 只渲染 `canvas` 语言的 fence；
- 画布数据解析失败时保留上一版成功结果，原文保留在对话中；
- 插件安装/替换 UI 代码后，偶尔需要重启 DSH 才能载入新 bundle。

## License

[MIT](LICENSE)
