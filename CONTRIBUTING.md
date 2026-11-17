# Contributing

欢迎参与，但请先读 [`docs/README.md`](docs/README.md)：那里定义了文档的权威顺序、同步清单和一次功能更新的 Definition of Done。

## 硬规则

1. **文档与代码同一次提交**：行为/协议/安装方式变化必须同时更新对应文档，不接受"回头再补"。
2. **单一事实来源**：协议只在 `docs/expression-protocol.md` 定义，需求只在 `docs/product.md`，其他文档引用而不复制。
3. **删除胜过注释**：被替换的字段、旧方案、过时状态头直接删除；版本兼容说明只允许出现在协议文档的版本节里。
4. **每次功能更新都要巡检全部文案**，并检查是否和已有能力重复（可复用性）。

## 提交前

```bash
node --check client.js
node --input-type=module -e "await import('./index.js')"
node scripts/check-fence-regex.mjs
node scripts/check-docs.mjs
```

CI 会重复执行以上检查。提交信息使用 conventional commits（`feat:` / `fix:` / `docs:` / `chore:` / `refactor:`）。

## 本地文件

设计调研、临时脚本等本地资料不要提交进仓库（参考 `.gitignore`），避免被 npm 打包或误发布。
