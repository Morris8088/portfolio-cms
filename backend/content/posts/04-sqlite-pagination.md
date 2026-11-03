---
title: SQLite 分页查询怎么写才不慢
slug: sqlite-pagination
tags: SQLite,性能,后端
status: published
date: 2026-10-16T08:30:00.000Z
views: 89
summary: LIMIT / OFFSET 看起来人畜无害，数据量一大就原形毕露。聊聊为什么深分页会慢，以及索引到底加在哪。
---

## 最朴素的写法

```sql
SELECT * FROM posts ORDER BY created_at DESC LIMIT 6 OFFSET 6000;
```

这行 SQL 在 1000 条数据时飞快，在 100 万条时会让你怀疑人生。

## 为什么慢

`OFFSET 6000` 不是"直接跳到第 6001 条"。数据库必须**先取出前 6006 行，再把前 6000 行扔掉**。

偏移量越大，扔掉的行越多，白干的活越多。

## 两个改进方向

### 1. 索引要建对

```sql
CREATE INDEX idx_posts_created ON posts(created_at DESC);
```

如果 `ORDER BY` 的列没索引，数据库还要额外做一次全表排序，那是真正的杀手。

### 2. 游标分页（cursor）

不用页码，改用"上一页最后一条的时间"：

```sql
SELECT * FROM posts
WHERE created_at < '2026-10-16T08:30:00Z'
ORDER BY created_at DESC
LIMIT 6;
```

不管翻到第几页，都只扫 6 行。缺点是不能跳页，适合信息流，不适合"跳到第 37 页"。

## 我这个项目的选择

后台管理用 `LIMIT/OFFSET`（文章总数有限，且需要页码跳转），前台信息流将来可以换游标。

## 顺便说 COUNT

列表接口通常要返回总数，那是一次额外的 `COUNT(*)`。它本身不便宜，所以：

- 别在列表接口里做多表 JOIN + COUNT
- 数据量大时用估算值，或者缓存 30 秒

**先量再优化。** 没有 `EXPLAIN QUERY PLAN` 支撑的"优化"都是猜。
