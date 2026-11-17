# AI Dream 开发文档

这里是项目的**契约层**：功能怎么定义、协议长什么样、为什么这样设计。代码是实现的真相，本目录是意图与约定的真相。

## 权威顺序（冲突时以先者为准）

1. `client.js` / `index.js` —— 实现真相；
2. `docs/expression-protocol.md` —— 对外表达协议契约；
3. `docs/architecture.md` —— 内部分层与宿主适配契约；
4. `docs/product.md` —— 需求、范围与路线图；
5. `README.md` / `README.en.md` —— 用户文档；
6. `docs/DETAIL.md` —— 插件管理器详情页；
7. `CHANGELOG.md` —— 版本历史。

## 文档清单

| 文档 | 作用 | 什么时候必须更新 |
|---|---|---|
| `expression-protocol.md` | 表达协议（字段、校验、降级、签名） | 任何协议字段/语义/降级顺序变化 |
| `architecture.md` | 分层、渲染引擎、Host 集成、platform 兼容 | 新增分层/宿主能力/状态机制变化 |
| `product.md` | 定位、需求、非目标、指标、路线图 | 需求增减、优先级、范围变化 |
| `DETAIL.md` | 插件管理器里展示的详情页 | 使用方式、格式示例变化 |
| `README.md` / `README.en.md` | 安装、快速上手、使用、FAQ | 安装方式、用户可见行为变化 |
| `CHANGELOG.md` | 版本历史 | 每次发版 |
| `docs/index.json` | 插件市场索引 | 每次发版（版本 + pinned commit） |
| `docs/demo.html` | 独立视觉复刻页 | 视觉参数/内置色板变化 |

## 改动同步清单

- **改协议**（字段、语义、降级顺序）：`expression-protocol.md` + `index.js` 提示词 + `README`（中英使用节）+ `DETAIL.md` + `examples/moods.md` + 版本号；
- **改渲染/宿主集成**：`architecture.md` + `README` 架构节 + `CHANGELOG`；
- **改需求/范围**：`product.md` + `architecture.md` 对应章节；
- **发版**：`package.json` version + `CHANGELOG` + git tag + `docs/index.json`（新版本 + pinned commit）+ 本文档「当前状态」；
- **本地独有文档**（设计调研等）不放进仓库：避免被 npm 打包或误提交（参考 `.gitignore`）。

## 每次功能更新的 Definition of Done

一个功能不算完成，除非四件事都做了：

1. **文案全量巡检**：逐篇过 `README` / `DETAIL` / `product` / `architecture` / `protocol` / `examples`，确认与实现一致；
2. **冲突检查**：同一概念只在一个权威文档定义，其他文档引用；两处描述不一致必须先合并再继续；
3. **历史遗留删除**：被替换的字段/方案/过时状态头直接删掉，不留"旧版兼容说明"（兼容只允许写在协议文档的版本节）；
4. **可复用性检查**：新能力先判断属于哪一层（协议/渲染/宿主/状态），写进 `architecture.md` 再写代码；能被别的宿主复用的逻辑不要绑死 DSH。

自动化：`node scripts/check-docs.mjs` 会检查版本一致性、遗留术语、相对链接、状态行；CI 已接入，不通过不允许合并。

## 发布检查清单

- [ ] `node --check client.js`
- [ ] `node --input-type=module -e "await import('./index.js')"`
- [ ] `node scripts/check-fence-regex.mjs`
- [ ] `node scripts/check-docs.mjs`
- [ ] `node scripts/check-examples.mjs`
- [ ] `node scripts/check-config.mjs`
- [ ] `node --input-type=module -e "await import('./index.js')"`
- [ ] 对照「改动同步清单」检查文档一致
- [ ] `package.json` version / `CHANGELOG` / tag 三者一致
- [ ] `docs/index.json` 新版本 pinned commit 已存在远端
- [ ] GitHub Release（可选）
- [ ] 页面演示：刷新后画布行为与文档一致

## 写作约定

- 未实现的能力必须标注「计划/草案」，不能当事实写；
- 文档开头保留状态行：`> 状态：已实现 / 草案 / 进行中（vX.Y）`；
- 协议字段以 `expression-protocol.md` 为准，其他文档只引用不重复定义；
- 示例块必须能被当前实现解析（v2 协议）。

## 当前状态

- **最近发布**：`1.4.0` —— 配置化增强（回看开关、校准按钮开关）；
- **下一步**：回看体验打磨 / MCP App 移植准备 / 模型侧校准通道。
