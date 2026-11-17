# AI Dream — MCP App 移植说明

> 状态：规格与清单已就绪（v1.5），渲染器 HTML 待产出。目标：同一套表达协议与渲染引擎能跑在 ChatGPT / Claude 的沙箱 iframe 里。
>
> 权威协议见 [`expression-protocol.md`](expression-protocol.md)；本文件只描述**宿主移植**，不重复字段定义。

## 1. 为什么这样移植

DSH 是进程内代码级插件，能直接拿宿主 DOM 与常驻侧栏；ChatGPT / Claude 只允许 **MCP App**（远端 HTML 在沙箱 iframe 中运行，通过工具调用下发数据）。因此可复用的资产是：

- 表达协议（v2 的 mood 规格）；
- 渲染器的插值/绘制核心（不依赖宿主 DOM 的部分）。

不能复用的是"宿主进程内注册 slot / 系统提示注入"这一层。

## 2. 组件形态

```
MCP server（Host 侧）
├── tool: express_emotion   ← AI 输出情绪规格（mcp/app-manifest.json 定义，已由 check-mcp-manifest 校验）
├── resource: resources/ai-dream.html  ← 渲染器（沙箱 iframe，全屏/PiP/侧栏由宿主决定）
└── 可选：tool: define_emotions     ← AI 追加情绪定义（对应 DSH 的 define 块）
```

DSH 里的 `canvas` 围栏协议与 `express_emotion` 的入参是**同一份字段**；MCP 侧不再区分 mood/define/diagram，先只移植 mood（v1.5 范围）。

## 3. 宿主要求与限制

| 限制 | 应对 |
|---|---|
| 沙箱 iframe、无宿主 DOM | 渲染器自带容器与 CSS 变量，尺寸 100% 自适应 |
| CSP 常禁止内联脚本 | 渲染器产出为独立 HTML + 外链 JS（或宿主允许的内联白名单），构建时内联需确认 |
| 高度封顶 / 显示模式受限 | 以 `inline` 和 `pip` 为主要模式，`fullscreen` 为增强 |
| 无后台进程、生命周期短 | 状态只存在 iframe 内存；重进页面从最近一次表达重建 |
| 公开分发需审核 | 先以私有/开发者模式验证，再走目录审核 |

## 4. 数据流（与 DSH 的映射）

| DSH | MCP App |
|---|---|
| 系统提示注入 `canvas` 约定 | tool `express_emotion` 的 description + schema（模型可见） |
| 会话 projection `emotionSignature` | 每次工具调用内联 palette，或先调 `define_emotions` 再引用 name |
| 客户端 rAF 引擎 | `resources/ai-dream.html` 内同一套插值逻辑（复制核心，不共享构建） |
| 配置（衰减时长等） | 工具入参或 server 侧配置，先固定默认值 |

## 5. 渲染器要求（验收清单）

1. 输入：`express_emotion` 的 JSON；输出：全屏氛围光，无文字；
2. 连续性：参数变化用指数插值（与 DSH 侧一致的 τ 规则），不得整帧替换；
3. 安全边界：hex 校验、数值夹紧、未知枚举回退（同客户端 `normalize`）；
4. 无状态：不写 cookie/localStorage，不做网络请求；
5. `prefers-reduced-motion` 时停止动画；
6. 单元化：核心可被 `scripts/check-*` 以纯函数方式测试（规范化/插值参数）。

## 6. 下一步

1. 从 `client.js` 抽出 `normalizeEmotion` / 插值参数计算为独立纯函数文件（`renderer/core.mjs`），供 DSH 客户端与 MCP 渲染器共用（跨仓复制，零构建）；
2. 产出 `resources/ai-dream.html` + 用 headless Chrome 截图验证（`?t=` 定格，与 `docs/demo.html` 同法）；
3. 写 MCP server 骨架（stdio，`express_emotion` + resource）；
4. 在 ChatGPT 开发者模式/Claude 连接器里做一次真机验证（需要用户账号，记录为待办）。
