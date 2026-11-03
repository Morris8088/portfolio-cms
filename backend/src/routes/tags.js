// ============================================================
// routes/tags.js —— 标签聚合
// tags 在 posts 表里是逗号串，这里拆开统计每个标签的文章数，
// 前端拿去做筛选栏。
// ============================================================

import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const rows = db
    .prepare(`SELECT tags FROM posts WHERE status = 'published' AND tags IS NOT NULL`)
    .all();

  const counter = new Map();
  for (const row of rows) {
    for (const raw of String(row.tags).split(',')) {
      const name = raw.trim();
      if (!name) continue;
      counter.set(name, (counter.get(name) || 0) + 1);
    }
  }

  const tags = [...counter.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  res.json(tags);
});

export default router;
