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

## 剩余待办（需要用户或后续轮次）

- **MCP 真机验证**：需要用户的 ChatGPT 开发者模式 / Claude 连接器账号（已写好规格与 server 骨架）；
- **流式表达**：协议边生成边漂移（partial-json），当前为整块；
- **视觉形态扩展**：天气语义（晴/阴/雾/雨）/ 角色形象（远期）；
- **双向校准**：把日历校准写回签名/人格基线（当前只注入提示词）；
- **分发**：npm 发布 `dsh-ai-dream`（用户决定）、GitHub Release、社区索引提交、真实界面截图；
- **宣传**：demo GIF + 在线 demo + 插件市场曝光。
