// ============================================================
// routes/stats.js —— 后台仪表盘统计数据
// ============================================================

import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const posts = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
         SUM(views) AS views
       FROM posts`
    )
    .get();

  const projects = db.prepare('SELECT COUNT(*) AS n FROM projects').get().n;

  res.json({
    posts: {
      total: posts.total || 0,
      published: posts.published || 0,
      draft: posts.draft || 0,
      views: posts.views || 0
    },
    projects
  });
});

export default router;
