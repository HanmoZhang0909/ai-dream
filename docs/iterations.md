# 自主迭代记录（10 轮）

> 由 Agent 在用户授权（30 元额度）下自主执行的「需求 → 开发 → 测试 → 需求」循环。每轮一个最小可交付增量，遵守 `docs/README.md` 的 Definition of Done：文档同批、版本/CHANGELOG/tag/市场索引对齐、CI 全绿、自测不依赖用户手测。

## 轮次总览

| 轮 | 版本 | 增量 | 自测证据 |
|---|---|---|---|
| 1 | `v1.2.0` | 回看提示「第 N 轮 · 回到最新」+ 点击回底部 | 服务端 bundle 含新 UI；文档/CI 全绿 |
| 2 | `v1.3.0` | **跨会话签名复用**（持久化到 `~/.dsh/storages/dsh-ai-dream/signature.json`，新会话零模型调用） | 子会话投影缓存出现测试签名 `reuse-alpha/beta/gamma`；阶段探针 `appended`；持久化单测 |
| 3 | `v1.4.0` | 配置项 `replayEnabled` / `calibrationEnabled` | 子会话 `aiDreamConfig` 记录含新字段；客户端 bundle 门控存在 |
| 4 | `v1.5.0` | MCP App 移植规格 + 可移植工具契约 `mcp/app-manifest.json` | 新 CI 校验（字段/枚举/范围与协议 v2 一致） |
| 5 | `v1.6.0` | 可移植渲染核心 `renderer/core.mjs` | 新单测（调色板/夹紧/τ/渲染目标）全绿 |
| 6 | `v1.7.0` / `v1.7.1` | MCP 渲染器骨架 `resources/ai-dream.html` + 无头 Chrome 验证 | 本地截图 `docs/mcp-renderer.png` + probe 校验；浏览器步骤改为显式开关修复 CI |
| 7 | `v1.8.0` | MCP server 骨架（stdio JSON-RPC：工具/资源/初始化） | handler 单测（握手/夹紧/错误码/资源） |
| 8 | `v1.9.0` | 回看体验：迷你情绪时间轴（颜色点 + 点击跳回该轮） | bundle 含 `jumpToTurn`；文档/CI 全绿 |
| 9 | `v1.10.0` | **模型侧校准**：`calibration.json` 经 Host 注入系统提示 `## Calibration` | 下一轮注入提示逐字出现校准文案；清洗/截断/夹紧单测 |
| 10 | `v1.10.1` | 本文件 + 收尾整理 | 文档检查/CI |

## 关键工程经验（写进项目记忆）

1. **Host 侧写事件必须在 `session/event` 发布之外**（`setTimeout(0)`），否则 `appendPluginRecord` 被静默拒绝——配置记录与签名复用的两次坑都来自这里；
2. **链接插件不能裸包名 import DSH 包**：从 `process.argv[1]` 推安装根 + 绝对路径动态 import（可选 `dsh-home-paths` 取 `~/.dsh`）；
3. **子会话投影缓存是可靠的黑盒断言点**：`session_projcache/sessions/<id>.json` 可直接读出 `emotionSignature` / `aiDreamConfig` 的值；
4. **Windows 沙箱下管道捕获会被挡**：Chrome `--dump-dom` 用 `Start-Process -RedirectStandardOutput` 落文件，再用离线校验模式验证；
5. **浏览器验证不能放默认 CI**：环境依赖强，用 `AI_DREAM_BROWSER_CHECK=1` 显式开启。

## 后续回归修复（v1.11.0）

- 迷你时间轴 bug（用户反馈：圆点与按钮重叠、点击无反应）：根因是三组控件各自绝对定位且按钮行作为全宽命中层遮挡；改为单一底部栈 + 24×24 命中区 + 居中锚点 + 救回底部判定 + reduced-motion。
- 自测能力补齐：`buildTimelineDots`/`inReplayMode`/`sentinelSelector` 单测 + `client.js` 内联副本文本一致性断言 + DSH 政策要求的 UX 子智能体评审（本次评审提出 5 条问题，均已处理或记录）。
- 真实 GUI CDP 自测（v1.11.2）：断言跳转吸附、回到最新 pin 底、命中/不重叠，并抓出「长会话回看提示残留」等 bug。
- 自测驱动的可发现性改进（v1.12.0）：首次打开一次性引导（localStorage 记忆、仅实时态、5s 淡出/知道了）、校准按钮 title/aria/24px、圆点 ARIA 分组；`returning` 状态抑制回看胶囊；GUI 自测覆盖引导显示/关闭/记忆与全部交互。
- 自测驱动的校准反馈（v1.13.0）：按钮点击 1.6s 短提示（更亮/更淡/已到上限），语义纯函数进 core 并单测；「回到最新」改为连续两次到底才结束 pin；GUI 自测覆盖三种提示文案与消失。
- 空/等待态（v1.14.0）：无表达时显示"睡着的微光" + 呼吸虚线环 + 文案，隐藏控件；修复空态消耗首次引导；GUI 自测覆盖空态与引导记忆。
- 情绪签名查看器（v1.15.0）：右上角「情绪词表 · N」胶囊 + 锚定浮层列出 AI 自定义情绪；`signatureChips` 纯函数 + GUI 断言（label/chips/focus/Esc/✕）；「回到最新」pin 上限延长到 12s 以适配超长会话。
- 流式表达第一部分（v1.16.0）：未闭合 canvas 块按 partial mood 渐进预览并平滑过渡到完整模型；`extractPartialCanvas`/`parsePartialMood` 纯函数 + 单测 + 纹理断言；GUI 回归全绿。
- 键盘/读屏（v1.17.0）：圆点 toolbar + roving tabindex + 方向键/Home/End、Esc 退出回看（输入法/输入框/词表面板感知）、aria-live 播报、双色 focus 环、提示行 24px；「回到最新」改为底部保持 1.5s 才结束 pin；GUI 断言方向键/Home/End/Esc 与完整回看流。
- 天气形态（v1.18.0）：协议 v2.1 追加 `rain`/`fog`（向后兼容），词表用中文形态名标注；`formLabel`/`FORM_LABELS` 单测 + MCP manifest 枚举同步；GUI 用 `__AI_DREAM_FORCE_FORM` 渲染并截图，第一版过暗后补光核与 alpha 修正。
- README 截图（v1.19.0）：用 GUI 自测产生的真实界面图（实时/空态/雨/回看）缩小入库并写进中英 README；这些图以后每次 UI 大改需要重拍。
- 校准导出（v1.20.0）：校准行旁「同步给 AI」输出可复制的模型侧校准 JSON（`calibrationSnippet` 纯函数 + 单测），面板强调整份覆盖/需重载/全机生效；作为双向校准的第一步；GUI 断言面板内容/全选/关闭。
- 流式第二部分（v1.21.0）：partial 期间底部「画布生成中…（预览）」+ `aria-live`，250ms 防抖、8s 断流自动隐藏；按评审去掉"加速过渡"（会放大未完成字段的跳变）；`__AI_DREAM_FORCE_PARTIAL` 钩子 + GUI 断言（partial 标记/文案/截图）。

## 十二轮自主迭代总结（收尾，v1.21.2）

本次自主目标（循环目标 12 轮）已全部完成：从 `v1.12.0` 到 `v1.21.1` 共发布 10 个版本，每轮都走「需求 → 开发 → 测试 → 需求」，测试包含 **core 纯函数单测 + 真实 GUI CDP 自测 + 子智能体 UX 评审** 三层；最终一次全量 GUI 自测 15 项检查全绿、0 控制台错误。

| 版本 | 增量 | 关键验证 |
|---|---|---|
| v1.12.0 | 首次使用引导、校准按钮可访问性、`returning` 抑制回看胶囊 | GUI：引导显示/关闭/记忆 |
| v1.13.0 | 校准即时反馈（更亮/更淡/已到上限） | GUI：三种提示文案 |
| v1.14.0 | 空/等待态（睡着的微光 + 文案），修复空态消耗引导 | GUI：空态 + 引导未被消耗 |
| v1.15.0 | 情绪词表查看器（胶囊 + 锚定面板） | GUI：7 chips/焦点/Esc/✕ |
| v1.16.0 | 流式表达第一部分（未闭合块 partial 预览） | 单测：截断 JSON/闭合检测 |
| v1.17.0 | 键盘/读屏（toolbar + roving tabindex + Esc + aria-live） | GUI：方向键/Home/End/Esc |
| v1.18.0 | 天气形态 rain/fog（协议 v2.1 追加）+ 中文形态标注 | GUI：两种形态截图 |
| v1.19.0 | README 真实界面截图 | GUI 截图入库 |
| v1.20.0 | 校准导出「同步给 AI」 | GUI：JSON/警告/全选 |
| v1.21.0 | 流式第二部分：生成中提示 + 防抖/断流保护 | GUI：partial 标记/文案 |
| v1.21.1/2 | 发布链路验证、npm 包瘦身（4.15MB→92KB）、收尾 | Pages 索引/demo/npm pack |

**方法沉淀**：`renderer/core.mjs` 承载可移植语义与单测；client 内联副本有纹理断言；`ui-selftest.mjs` + `run-ui-selftest.ps1`（含重试/退出码表）驱动真实页面；UX 评审结论逐条落地。所有发布遵循 docs/README.md 的 DoD（文档同批、CHANGELOG、版本/tag/index 对齐、CI 全绿、push 重试）。

**剩余待办（不阻塞）**：MCP 真机验证（需用户 ChatGPT/Claude 账号）、npm 正式发布、GitHub Release 文案、社区宣传、流式字段稳定化（为预览提速做准备）、双向校准的自动写回（需 client→Host 通道）。

## 协议 v3 循环（进行中）

- 轮 1（v1.22.0）：v3 设计口径落地——开放词汇表（primitive/form/motion 任意名字、macro、keyframes、transform/mask/relations/grain/gloss/direction、seed/variation/afterglow/uneven/hold）、程序不崩硬边界（层数/粒子/元素上限、仅 transform/opacity、闪烁 ≤3Hz、reduced-motion、异常回落 L0）、能力协商与降级矩阵；机器契约 `docs/protocol-v3.schema.json` + 五份风格样例 + CI 校验 `check-protocol-v3.mjs`。
- 轮 2（v1.23.0）：规划器实现 `planExpressionV3` 及配套纯函数（能力协商/原语降级/参数夹紧/keyframes/关系/预算/闪烁上限），永不抛错、最差回落 L0；单测覆盖五份 fixtures + 弱渲染器 + 非法输入 + 预算超限。
- 轮 3（v1.24.0）：客户端 v3 静态分层渲染——`planV3Client`（与 core 同款回退链）+ `V3Scene`（paletteSlot/opacity/blend/blur/transform/mask/grain）；GUI 测试相位已写好（exit 20），但 **dsh web token 已轮换（页面 401）**，截图验证待用户提供新 URL；脚本新增 401 显式检测（exit 21，不再盲重试），包装脚本改为随机 CDP 端口 + 进程树清理。

## GUI 自测运行方法（本地，不随仓库发布）

真实界面用 `ui-selftest.mjs`（CDP 驱动已认证页面）验证，跑法：

```powershell
# 工作区根目录（D:\hanmo\github\dream）里的一键脚本，自带 Chrome 生命周期与失败重试
powershell -NoProfile -ExecutionPolicy Bypass -File .\run-ui-selftest.ps1 -Token '<dsh web 打印的 token>' -Retries 2
```

- 脚本会在临时 profile 里起无头 Chrome，跑完断言（引导/校准/同步/键盘/回看/空态/天气形态/截图）后关闭；失败自动重跑一次，降低懒加载时序带来的偶发抖动；
- 断言失败以非零退出码区分：3 画布缺失、4 圆点不足、5 命中失败、6 行重叠、9 回看未回到实时、10 引导缺失、11 引导关闭失败、12 校准按钮不可访问、13 校准提示异常、14 空态异常、15 签名面板异常、16 键盘/Esc 异常、17 天气形态异常、18 同步面板异常；
- 脚本与截图、报告都留在工作区，**不提交**（DSH 验证政策：不把浏览器驱动逻辑放进开源仓库）；仓库里只保留中性的 `data-ai-dream-*` 测试钩子。

## 发布链路验证（v1.21.1）

| 检查 | 结果 |
|---|---|
| GitHub Pages 市场索引 `https://hanmozhang0909.github.io/ai-dream/index.json` | 200，最新 4 个版本 `1.21.0, 1.20.1, 1.20.0, 1.19.0`，含 1.21.0 |
| 在线 demo `demo.html` | 200（8 KB） |
| `npm pack --dry-run` | 31 文件 / 解包 4342 KB / 压缩 4154 KB（主因 docs/demo.gif 2.5MB + 4 张截图 1.3MB） |
| 调整后 `files` 白名单（只发 md 文档 + index.json + demo.html + 运行/MCP 资产） | 插件 tarball 大幅缩小（不再携带 GIF/PNG），仓库内文档不受影响 |

- 结论：市场索引与 demo 正常；发布包体积问题通过 `files` 白名单修复。

## 剩余待办（需要用户或后续轮次）

- **MCP 真机验证**：需要用户的 ChatGPT 开发者模式 / Claude 连接器账号（已写好规格与 server 骨架）；
- **流式表达**：协议边生成边漂移（partial-json），当前为整块；
- **视觉形态扩展**：天气语义（晴/阴/雾/雨）/ 角色形象（远期）；
- **双向校准**：把日历校准写回签名/人格基线（当前只注入提示词）；
- **分发**：npm 发布 `dsh-ai-dream`（用户决定）、GitHub Release、社区索引提交、真实界面截图；
- **宣传**：demo GIF + 在线 demo + 插件市场曝光。
