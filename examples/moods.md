# 表达示例（协议 v2）

AI 每轮最多输出一个 `canvas` 块。下面都可以直接复制。

## 自定义情绪（推荐）

```canvas
{"kind":"mood","schema":2,"name":"被看穿时的不安","intensity":0.7,"palette":{"base":"#0b0a12","core":"#e8d9ff","tone":"#9a7aa6","spectrum":["#c9a3e0","#6a4b8f"]},"motion":{"speed":0.6,"amplitude":0.5,"rhythm":"uneven"},"form":"streak","transition":{"style":"burst","speed":"fast"}}
```

```canvas
{"kind":"mood","schema":2,"name":"深夜的平静","intensity":0.5,"palette":{"base":"#04080d","core":"#dff3ff","tone":"#6fb7d9","spectrum":["#8fd7f2","#2f6f8f"]},"motion":{"speed":0.4,"amplitude":0.35,"rhythm":"breathing"},"form":"cloud","transition":{"style":"dissolve","speed":"slow"}}
```

```canvas
{"kind":"mood","schema":2,"name":"如释重负","intensity":0.6,"palette":{"base":"#071012","core":"#dff6f1","tone":"#7fd1c8","spectrum":["#9be3d0","#4a9e9a"]},"motion":{"speed":0.6,"amplitude":0.5,"rhythm":"breathing"},"form":"cloud","transition":{"style":"soft","speed":"medium"}}
```

```canvas
{"kind":"mood","schema":2,"name":"突然的兴奋","intensity":0.9,"palette":{"base":"#120518","core":"#ffe0f8","tone":"#ff4f86","spectrum":["#7d63ff","#66e0ff"]},"motion":{"speed":1.4,"amplitude":0.8,"rhythm":"uneven"},"form":"spiral","transition":{"style":"burst","speed":"fast"}}
```

## 复用内置词表

```canvas
{"kind":"mood","name":"温暖","intensity":0.65}
```

```canvas
{"kind":"mood","name":"疲惫","intensity":0.4,"transition":{"style":"dissolve","speed":"slow"}}
```

内置 fallback：`calm` / `curious` / `uneasy` / `warm` / `tired` / `excited` / `focused` / `amused` / `neutral`。

## 只覆盖部分字段

```canvas
{"kind":"mood","name":"好奇","intensity":0.75,"palette":{"core":"#ffe9a8"},"form":"spiral","transition":{"style":"dissolve","speed":"medium"}}
```

未给出的字段从内置词表/上次表达继承。

## 转场对比

- 细微变化：`{"style":"dissolve","speed":"slow"}` —— 慢而柔；
- 常规变化：`{"style":"soft","speed":"medium"}` —— 默认；
- 强烈变化：`{"style":"burst","speed":"fast"}` —— 快 + 亮度闪；
- 放下/告别：`{"style":"ripple","speed":"medium"}` —— 从中心扩散一圈；
- 急转：`{"style":"snap","speed":"fast"}` —— 不插值。

## 动态新增情绪（v0.5 计划中）

> 需要 `0.5.0` 及以后版本：AI 在对话里随时追加情绪定义，客户端合并进会话签名。

```canvas
{"kind":"define","emotions":[{"name":"被看穿","palette":{"base":"#0b0a12","core":"#e8d9ff","tone":"#9a7aa6"},"motion":{"speed":0.6,"amplitude":0.5,"rhythm":"uneven"},"form":"streak"}]}
```

## 思维模式（次）

```canvas
{"kind":"diagram","title":"一个流程","nodes":[{"id":"a","label":"开始"},{"id":"b","label":"结束"}],"edges":[{"from":"a","to":"b"}]}
```

```canvas
{"kind":"cards","title":"三个要点","cards":[{"title":"第一","body":"一句话解释。"},{"title":"第二","body":"一句话解释。"}]}
```
