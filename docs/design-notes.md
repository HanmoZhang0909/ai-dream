# AI 实时画布：开源方案调研 + 落地设计

> 日期：2026-11-16 调研范围：AI 边聊边画 / 生成式画布 / DSH 插件可复用积木
> 结论已对关键仓库用 GitHub API / npm registry 实测核实，未核实的单独标注。

---

## 0. 共识版设计 v0.1（讨论定稿）

| 维度 | 决定 |
|---|---|
| 形态 | DSH 客户端插件，右侧栏 tab「画布」；页内面板（可分屏/浮动/全屏），非独立 OS 窗口 |
| 语境 | 当前会话对话历史（`useChat`） |
| 决策 | 同一个助手在回复里输出 ```canvas JSON（含 skip 字段），AI 自己决定画不画、画哪种 |
| 渲染 | 2 个渲染器：SVG 图解 + 卡片·图表；禁 iframe，React/SVG + 宿主主题 token |
| 更新 | 每轮结束用 `turnTail` 触发，整帧替换（调研后改为「全场景 + 客户端 diff 动画」，见 §5） |
| 载体实现 | 纯客户端插件、零构建（package.json / cordis.patch.yml / index.js / client.js），装进 profile=web |
| Demo 验收 | 连续聊 10 分钟，至少一次"它画出了我没想到的角度" |
| 明确不做 | 独立 OS 窗口；Host 侧独立导演调用；自由 HTML iframe 渲染器；跨会话持久化 |

---

## 1. 一句话结论

**没有可以直接拿来当"DSH 插件"用的开源整机方案**；但 DSH 生态里已经有现成的右侧栏画布插件骨架（`@haitang-hub/dsh-infinite-canvas`），前端最小积木是 **dagre + zod + 自写 React SVG**，demo 预计 0.5–1 天可跑通。

---

## 2. 整机方案对照（2026-11-16 实测）

| 项目 | 链接 | 许可 | 活跃度 | 它实际做什么 | 三硬标准* | 对我们的价值 |
|---|---|---|---|---|---|---|
| **OpenCanvas** | [GitHub](https://github.com/ashark-ai-05/opencanvas) | MIT | 15★，2026-11-15 仍有推送 | Electron + tldraw 无限画布，LLM 通过工具摆 typed widgets（图表/看板/代码/计时器），任意模型含本地 Ollama | **a 高 / b 高 / c 高** | 概念最贴，但桌面壳 + tldraw 商业授权 |
| **Dim0** | [GitHub](https://github.com/vcmf/dim0) | MIT | 209★，26 fork，活跃 | 协作式 AI 无限画布：笔记 / mini-app / agent 都在一块板上 | a 中高 / b 高 / c 高 | 思路可参考，产品太大而全 |
| **next-ai-draw-io** | [GitHub](https://github.com/DayuanJiang/next-ai-draw-io) | Apache-2.0 | **37,003★**，每日更新 | 聊天生成 / 增量改 draw.io 图，Web + 桌面 + MCP server；仓库 tag 含 `dsh-plugin`、`deepseek-harness` | a 低 / b 高 / c 中 | 工业级工程质量参考；范式是"点名画图" |
| **@haitang-hub/dsh-infinite-canvas** | [GitHub](https://github.com/Haitang-Hub/dsh-infinite-canvas) · [npm](https://www.npmjs.com/package/@haitang-hub/dsh-infinite-canvas) | MIT | **1★，今天刚发 0.2.30** | DSH 右侧栏"无限画布"插件：`sidebarRightTabs.register()` + 桥进程 + `canvas_*` MCP 工具，模型自己操作画布节点生成图片/视频/音频 | a 高 / b 高 / c 中 | **载体接线可直接抄**（右侧栏 tab + MCP 桥 + 工具注册） |
| **CopilotKit/excalidraw-studio** | [GitHub](https://github.com/CopilotKit/excalidraw-studio) | MIT | 60★，2026-05 后停更 | 对话里"逐元素流式"画 Excalidraw，可展开全屏持久工作区 | a 中 / b 高 / c 中 | 流式落笔效果与接线范式参考 |
| **OpenUI** | [GitHub](https://github.com/thesysdev/openui) | MIT | **15,279★**，活跃 | 生成式 UI 开放标准/DSL，流式生成结构化 UI | a 高 / b 高 / c 高（但产物在气泡内） | schema / 组件白名单设计参考，无画布 |
| **Tambo** | [GitHub](https://github.com/tambo-ai/tambo) | MIT | ~9.5k★（未逐项核实） | Zod schema 注册组件，Agent 自己挑组件渲染 | 组件级 | 组件白名单思路参考 |
| **E2B Fragments** | [GitHub](https://github.com/e2b-dev/fragments) | Apache-2.0 | — | Claude Artifacts 开源版 | — | 依赖 iframe 沙箱，与禁 iframe 冲突 |
| **tldraw make-real / draw-a-ui** | [make-real](https://github.com/tldraw/make-real) · [draw-a-ui](https://github.com/SawyerHood/draw-a-ui) | tldraw SDK 非 OSI / MIT | — | 手绘线框 → 生成可运行 HTML | a 低 | 方向参考，不采用 |
| 闭源参考 | ChatGPT Intelligent UI（2026-10）、Cursor Canvas、Claude Artifacts、Napkin、Eraser DiagramGPT、豆包「创作画布」、扣子画布 | 闭源 | — | — | — | 证明方向成立，仅参考 |

\* 三硬标准：a) AI **自主决定**画什么（非用户点名）；b) **实时/随对话更新**；c) 基于**对话语境**。

**判定：** 没有一个项目同时满足"三条硬标准 + 能嵌进 DSH 右侧栏 + 无授权/iframe 障碍"。最接近的是 OpenCanvas（概念）和 dsh-infinite-canvas（载体）。

---

## 3. 市场覆盖判断（决定要不要做）

- **形态已被验证**：tldraw for ChatGPT/Codex、豆包「创作画布」、扣子画布，都是"聊天旁常驻画布"。
- **"AI 自主决定"已被验证一半**：ChatGPT Intelligent UI 让模型自己决定用图/表/表单；Claude 用阈值（>15 行）决定是否开产物区；Eraser 在用户不指定图型时由 AI 自动选图型；UIST'23 Graphologue 早已研究"LLM 把回答转成可交互图解"。
- **仍空白的点**：把自主判断用于**解释当前对话**，并在**常驻画布上持续演进**（而非一次性产物或内联回答）。且 **DSH 内没有这类产品**。
- **含义**：方向成立、窗口很窄，差异化只剩"该不该画的判断质量 + 视觉质量"——而这恰好是开源界没做好的部分。

---

## 4. 积木清单与 DSH 硬约束

### 4.1 DSH 客户端插件的真实约束（重要）

客户端产物是**单个** `exports["./client"]` 文件，工厂 `factory(require)` 的 `require` 只解析宿主冻结的模块表：

`react`、`react/jsx-runtime`、`react-dom`、`react-dom/client`、`@deepseek-ai/cordis`、**`zod`**、`@tanstack/react-virtual` + 4 个 `dsh-client-*` 内部包。

第三方库只有两条路：**(a) 把 UMD/IIFE 产物整段内联进 client.js**；**(b) 另做一个只导出 `./client` 的"依赖桥"插件用 `external` 引用**（需实测加载顺序）。→ 选型第一原则：**有单文件 UMD、体积小、无 CSS 依赖**。

### 4.2 推荐组合

| 类别 | 选择 | 许可 | 体积 | 理由 |
|---|---|---|---|---|
| schema 校验 | **zod** | MIT | 零额外（基线内） | 校验模型输出的画布 JSON，防脏数据 |
| 图布局 | **@dagrejs/dagre** | MIT | 16KB gz | 纯函数，节点/边 → 坐标；与渲染解耦 |
| 流式解析 | **partial-json** | MIT | 1.6KB | 可选，让画布随 token 逐节点显形 |
| 图解/卡片 | **自写 React SVG** | — | 几百行 | 真正的大头，引库反而更难控 |
| 图表 | 自绘 SVG 柱/线（demo）→ ECharts（可选） | Apache-2.0 | 368KB gz | demo 先不引 ECharts |

### 4.3 明确不用

- **tldraw**：非 OSI 商业 License（生产需 license key）+ 15.6MB；
- **Excalidraw**：MIT 但 46.8MB 且为完整编辑器付全价；
- **React Flow**：ESM-only + CSS + zustand/d3，零构建最痛；
- **mermaid / elkjs**：依赖树巨大（elkjs EPL-2.0、447KB）；
- **CopilotKit / assistant-ui**：自带聊天壳，与 DSH 现有聊天冲突；
- **CopilotKit excalidraw-studio / E2B Fragments**：iframe 沙箱，与禁 iframe 冲突。

### 4.4 架构一句话

> 模型输出 `{ kind: 'diagram' | 'card' | 'chart', ... }` → zod 校验 → dagre 算坐标 → React 画 SVG。

---

## 5. 需要修正的 v0.1 设计点

1. **整帧替换 → 全场景 JSON + 客户端 diff 动画**：模型仍每轮给完整场景（简单、可靠），插件对比上一帧做增量动画，避免视觉跳变，且不引入 Host 侧 MCP。
2. **卡片/图表渲染器先自绘 SVG**：demo 不引 ECharts，控制体积与复杂度。
3. **新增 zod 校验**：基线自带，零成本，必须加。
4. **"自由 HTML"渲染器维持砍掉**：官方禁 iframe，已确认。
5. **可选增强**：partial-json 让画布"逐节点显形"，更接近"实时"体感。

---

## 6. 两条实施路径

**路径 A（推荐，0.5–1 天）：纯客户端插件**
右侧栏 tab → 读 `useChat` 找最新 ```canvas fence → zod 校验 → dagre 布局 → React SVG 渲染 → 与上一帧 diff 动画。零 Host 代码、零构建、`client.js` 改动可热替换。

**路径 B（1–2 天+）：Host + MCP 工具画布**
照抄 `@haitang-hub/dsh-infinite-canvas` 的架构：Host 半边托管桥进程、`dsh-mcp-client` 注册 `canvas_*` 工具、模型直接调工具做**真增量**。更贴近业界做法（tldraw-for-ChatGPT 也是 MCP 工具），但要处理桥进程、MCP 注册、重启加载。

**建议**：A 先验证"AI 自主出图有没有价值"；验证通过再把 canvas 数据层升级为 B 的工具/op 模型。

---

## 7. 风险与已知坑

- **判断质量**："该不该画"的提示词与视觉质量才是真正难点，开源界没有好答案。
- **画布状态**：存在插件内存里，HMR/刷新会丢（demo 可接受）。
- **回复污染**：```canvas fence 会出现在聊天正文，需要 `conversation.chat.markdown.fence` 渲染器隐藏或折叠。
- **安装/生效**：插件安装后可能需要重启 DSH Web 才载入新 JS（以 HMR 实测为准）。
- **体积**：若后续要内联 ECharts（368KB gz），单文件 client.js 的加载与 HMR 表现需实测。

---

## 8. 参考链接

- https://github.com/ashark-ai-05/opencanvas
- https://github.com/vcmf/dim0
- https://github.com/DayuanJiang/next-ai-draw-io
- https://github.com/Haitang-Hub/dsh-infinite-canvas
- https://www.npmjs.com/package/@haitang-hub/dsh-infinite-canvas
- https://github.com/CopilotKit/excalidraw-studio
- https://github.com/thesysdev/openui
- https://github.com/tambo-ai/tambo
- https://github.com/e2b-dev/fragments
- https://github.com/tldraw/make-real
- https://github.com/SawyerHood/draw-a-ui
