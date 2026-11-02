// index.js —— Express 服务入口
import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();

// CORS：允许前端（5173）跨域访问后端（3001）
app.use(cors());
// 解析 JSON 请求体，之后 req.body 就是对象
app.use(express.json());

// 健康检查接口：用来验证后端是否启动成功
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/* ============================================================
 * Day 2：文章 CRUD
 * 表结构见 db.js 的 posts 表：
 *   id, title, slug, summary, content, cover, tags, status, created_at, updated_at
 * 注意：created_at / updated_at 是 NOT NULL 且没有默认值，
 *       所以新增/更新时必须在代码里手动填时间。
 * ============================================================ */

// 查询时统一返回的列，避免 SELECT *（生产好习惯）
const POST_COLS =
  'id, title, slug, summary, content, cover, tags, status, created_at, updated_at';

// —— 列表：GET /api/posts （可选 ?status=published 过滤）——
app.get('/api/posts', (req, res) => {
  const { status } = req.query; // 形如 /api/posts?status=published
  let rows;
  if (status) {
    const stmt = db.prepare(
      `SELECT ${POST_COLS} FROM posts WHERE status = ? ORDER BY created_at DESC`
    );
    rows = stmt.all(status);
  } else {
    const stmt = db.prepare(
      `SELECT ${POST_COLS} FROM posts ORDER BY created_at DESC`
    );
    rows = stmt.all();
  }
  res.json(rows);
});

// —— 单篇：GET /api/posts/:id ——
app.get('/api/posts/:id', (req, res) => {
  const stmt = db.prepare(`SELECT ${POST_COLS} FROM posts WHERE id = ?`);
  const row = stmt.get(Number(req.params.id)); // :id 是字符串，转成数字
  if (!row) return res.status(404).json({ error: '文章不存在' });
  res.json(row);
});

// —— 新增：POST /api/posts ——
app.post('/api/posts', (req, res) => {
  const { title, slug, content, summary, cover, tags, status } = req.body;
  // 必填校验：缺了就 400 打回去，不让脏数据进库
  if (!title || !slug || !content) {
    return res.status(400).json({ error: 'title、slug、content 为必填' });
  }
  const now = new Date().toISOString();
  try {
    const stmt = db.prepare(`
      INSERT INTO posts
        (title, slug, summary, content, cover, tags, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    // run() 返回 { changes, lastInsertRowid }，注意参数是按顺序对应 ? 占位
    const info = stmt.run(
      title,
      slug,
      summary ?? null, // ?? null：前端没传就用 NULL（可空字段）
      content,
      cover ?? null,
      tags ?? null,
      status ?? 'draft', // 没传状态默认存草稿
      now,
      now
    );
    // 把刚插入的行查出来回给前端（含自增 id 和时间）
    const created = db
      .prepare(`SELECT ${POST_COLS} FROM posts WHERE id = ?`)
      .get(info.lastInsertRowid);
    res.status(201).json(created); // 201 = 创建成功
  } catch (e) {
    // slug 有 UNIQUE 约束，重复会抛错，这里转成 409 冲突
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'slug 已存在，换一个' });
    }
    res.status(500).json({ error: e.message });
  }
});

// —— 更新：PUT /api/posts/:id ——
app.put('/api/posts/:id', (req, res) => {
  const id = Number(req.params.id);
  // 先确认文章在不在，不在就 404
  const exists = db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
  if (!exists) return res.status(404).json({ error: '文章不存在' });

  // 只更新前端传了的字段（动态拼 SQL，但列名是写死的，值用 ? 占位，安全）
  const { title, slug, summary, content, cover, tags, status } = req.body;
  const fields = [];
  const values = [];
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (slug !== undefined) { fields.push('slug = ?'); values.push(slug); }
  if (summary !== undefined) { fields.push('summary = ?'); values.push(summary); }
  if (content !== undefined) { fields.push('content = ?'); values.push(content); }
  if (cover !== undefined) { fields.push('cover = ?'); values.push(cover); }
  if (tags !== undefined) { fields.push('tags = ?'); values.push(tags); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }

  if (fields.length === 0) {
    return res.status(400).json({ error: '没有提供要更新的字段' });
  }
  fields.push('updated_at = ?'); // 更新时间永远刷新
  values.push(new Date().toISOString());
  values.push(id); // 最后一个是 WHERE id = ?

  const stmt = db.prepare(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  const updated = db.prepare(`SELECT ${POST_COLS} FROM posts WHERE id = ?`).get(id);
  res.json(updated);
});

// —— 删除：DELETE /api/posts/:id ——
app.delete('/api/posts/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: '文章不存在' });
  res.json({ success: true, deleted: info.changes });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
