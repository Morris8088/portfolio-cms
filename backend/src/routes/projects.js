// ============================================================
// routes/projects.js —— 作品集接口
// 读：所有人可看；写：必须登录。
// ============================================================

import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const COLS =
  'id, title, role, description, tech, link, repo, highlight, sort_order, created_at, updated_at';

// GET /api/projects
router.get('/', (req, res) => {
  const rows = db
    .prepare(`SELECT ${COLS} FROM projects ORDER BY sort_order ASC, id ASC`)
    .all();
  res.json(rows);
});

// POST /api/projects
router.post('/', requireAuth, (req, res) => {
  const { title, description } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: '作品标题不能为空' });
  }
  if (!description || !String(description).trim()) {
    return res.status(400).json({ error: '作品描述不能为空' });
  }

  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO projects
         (title, role, description, tech, link, repo, highlight, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(title).trim(),
      req.body.role || null,
      String(description).trim(),
      req.body.tech || null,
      req.body.link || null,
      req.body.repo || null,
      req.body.highlight || null,
      Number.isInteger(req.body.sort_order) ? req.body.sort_order : 0,
      now,
      now
    );

  const created = db
    .prepare(`SELECT ${COLS} FROM projects WHERE id = ?`)
    .get(info.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/projects/:id
router.put('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const exists = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (!exists) return res.status(404).json({ error: '作品不存在' });

  const editable = ['title', 'role', 'description', 'tech', 'link', 'repo', 'highlight', 'sort_order'];
  const fields = [];
  const values = [];
  for (const key of editable) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }
  if (fields.length === 0) {
    return res.status(400).json({ error: '没有提供要更新的字段' });
  }

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare(`SELECT ${COLS} FROM projects WHERE id = ?`).get(id));
});

// DELETE /api/projects/:id
router.delete('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: '作品不存在' });
  res.json({ success: true });
});

export default router;
