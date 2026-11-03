---
title: 我如何用纯函数把测试覆盖率做到 90%
slug: pure-function-testing
tags: 测试,Vitest,工程化
status: published
date: 2026-10-12T19:15:00.000Z
views: 74
summary: 组件难测，是因为它同时干了太多事：取数据、算状态、渲染 DOM。把"算"的部分抽成纯函数，测试立刻变简单。
---

## 什么是纯函数

给定相同输入，永远返回相同输出，且不产生副作用。

```js
// 纯函数：只依赖参数
export function parseTags(tags) {
  return String(tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

// 不纯：依赖了外部变量，还改了它
let cache = [];
export function addTag(tag) {
  cache.push(tag);
  return cache;
}
```

## 为什么纯函数好测

不用起服务器、不用装浏览器、不用 mock 时间。一行断言就完事：

```js
expect(parseTags(' Vue3, Node ,,')).toEqual(['Vue3', 'Node']);
```

## 我的抽取策略

写组件时问自己三个问题：

1. 这段逻辑**离开页面**还有意义吗？（格式化日期、解析标签、算分页）
2. 它跟 DOM 有关系吗？
3. 我能不能用一句话描述它的输入输出？

答案依次是"是 / 否 / 能"，就抽出去。

## 覆盖率不是目标

90% 覆盖率不代表没 bug。它只说明"代码被执行过"，不说明"结果被验证过"。

真正有用的指标是：**边界情况有没有测**。

- 空字符串
- 只有逗号
- 超长文本
- `null` / `undefined`

所以我给每个工具函数都补了这四类用例。覆盖率是顺带的结果。
