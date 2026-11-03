---
title: （草稿）给博客加个 RSS 输出
slug: draft-rss-feed
tags: Node,待办
status: draft
date: 2026-10-30T21:00:00.000Z
views: 0
summary: 还没写完：用 /feed.xml 输出最近 20 篇文章，顺便研究一下 XML 转义。
---

思路：

1. 新增 `GET /feed.xml`
2. 查最近 20 篇已发布文章
3. 拼 RSS 2.0 的 XML

要小心的点：标题里的 `&`、`<` 必须转义，否则 XML 直接解析失败。

---

这篇故意留成草稿，用来验证两件事：

- 前台列表看不到它
- 后台列表能看到，并且可以一键发布
