# 表达示例

AI 每轮最多输出一个 `canvas` 块。下面是可直接复制的示例。

## 情绪的九种底色

```canvas
{"kind":"mood","mood":"neutral","intensity":0.3,"transition":{"style":"soft","speed":"slow"},"nebula":{"pattern":"cloud"},"orb":{"size":0.5,"pulse":"steady","tone":"neutral"}}
```

```canvas
{"kind":"mood","mood":"calm","intensity":0.5,"transition":{"style":"soft","speed":"slow"},"nebula":{"pattern":"cloud","density":0.6,"activity":0.4},"orb":{"size":0.55,"pulse":"breathe","tone":"cool"}}
```

```canvas
{"kind":"mood","mood":"curious","intensity":0.7,"transition":{"style":"dissolve","speed":"medium"},"nebula":{"pattern":"spiral","density":0.75,"activity":0.7},"orb":{"size":0.6,"pulse":"breathe","tone":"warm"}}
```

```canvas
{"kind":"mood","mood":"uneasy","intensity":0.7,"transition":{"style":"burst","speed":"fast"},"nebula":{"pattern":"streak","density":0.7,"activity":0.85},"orb":{"size":0.35,"pulse":"flicker","tone":"cool"}}
```

```canvas
{"kind":"mood","mood":"warm","intensity":0.65,"transition":{"style":"soft","speed":"medium"},"nebula":{"pattern":"ring","density":0.6,"activity":0.5},"orb":{"size":0.65,"pulse":"breathe","tone":"warm"}}
```

```canvas
{"kind":"mood","mood":"tired","intensity":0.4,"transition":{"style":"dissolve","speed":"slow"},"nebula":{"pattern":"cloud","density":0.45,"activity":0.3},"orb":{"size":0.4,"pulse":"steady","tone":"cool"}}
```

```canvas
{"kind":"mood","mood":"excited","intensity":0.9,"transition":{"style":"burst","speed":"fast"},"nebula":{"pattern":"spiral","density":0.9,"activity":0.95},"orb":{"size":0.8,"pulse":"breathe","tone":"warm"}}
```

```canvas
{"kind":"mood","mood":"focused","intensity":0.6,"transition":{"style":"soft","speed":"medium"},"nebula":{"pattern":"ring","density":0.6,"activity":0.45},"orb":{"size":0.6,"pulse":"steady","tone":"bright"}}
```

```canvas
{"kind":"mood","mood":"amused","intensity":0.45,"transition":{"style":"ripple","speed":"medium"},"nebula":{"pattern":"cloud","density":0.55,"activity":0.5},"orb":{"size":0.5,"pulse":"breathe","tone":"neutral"}}
```

## 转场对比

同一情绪强度，不同 `transition`：

- 细微变化：`{"style":"dissolve","speed":"slow"}` —— 慢而柔，适合"其实没什么，只是轻轻变了一点"
- 常规变化：`{"style":"soft","speed":"medium"}` —— 默认，平滑
- 强烈变化：`{"style":"burst","speed":"fast"}` —— 快 + 亮度闪，适合"心里被撞了一下"
- 告别/放下：`{"style":"ripple","speed":"medium"}` —— 从中心扩散一圈
- 立刻切换：`{"style":"snap","speed":"fast"}` —— 不插值，情绪急转

## 思维模式（次）

```canvas
{"kind":"diagram","title":"一个流程","nodes":[{"id":"a","label":"开始"},{"id":"b","label":"结束"}],"edges":[{"from":"a","to":"b"}]}
```

```canvas
{"kind":"cards","title":"三个要点","cards":[{"title":"第一","body":"一句话解释。"},{"title":"第二","body":"一句话解释。"}]}
```
