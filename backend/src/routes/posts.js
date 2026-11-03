// ============================================================
// routes/posts.js —— 文章相关接口
// ------------------------------------------------------------
// Day 2 时所有代码都堆在 index.js，文件一长就难找。
// Day 5 起按"资源"拆文件：文章、作品、登录各一个路由文件。
// 这叫"关注点分离"，也是 Express 项目最常见的组织方式。
// ============================================================

import { Router } from 'express';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../auth.js';

const router = Router();

// 查询时统一返回的列（不写 SELECT *，避免以后加敏感字段被顺手带出去）
const POST_COLS =
  'id, title, slug, summary, content, cover, tags, status, views, created_at, updated_at';

// 列表页不需要全文，带上 content 会让响应变大好几倍
const LIST_COLS =
  'id, title, slug, summary, cover, tags, status, views, created_at, updated_at';

// ---------- 小工具 ----------

/** 把任意字符串变成 URL 友好的 slug */
function slugify(input) {
  const base = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-') // 非字母数字/中文/横线 → 横线
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  // 中文标题清理后可能为空，用时间戳兜底，保证 slug 非空且唯一
  return base || `post-${Date.now()}`;
}

/** 没写摘要时，自动截取正文前 80 字 */
function autoSummary(content, summary) {
  if (summary && String(summary).trim()) return String(summary).trim();
  const plain = String(content || '')
    .replace(/[#>*`_\-[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 80 ? `${plain.slice(0, 80)}…` : plain;
}

/** ?page=2&pageSize=6 → { page:2, pageSize:6, offset:6 }，全部做边界保护 */
function pagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(query.pageSize, 10) || 6));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

/** 标签在库里是 "Vue3,Node" 这种逗号串，这里匹配"完整的一个标签" */
const TAG_MATCH = `(',' || REPLACE(tags, ' ', '') || ',') LIKE '%,' || ? || ',%'`;

// ============================================================
// GET /api/posts —— 文章列表（搜索 + 标签 + 状态 + 分页 + 排序）
// ============================================================
router.get('/', optionalAuth, (req, res) => {
  const { q, tag, status, sort } = req.query;
  const { page, pageSize, offset } = pagination(req.query);

  const where = [];
  const params = [];

  // 未登录只能看已发布；登录后可以按 status 筛选（后台用）
  const wantedStatus = req.user ? status : 'published';
  if (wantedStatus) {
    where.push('status = ?');
    params.push(wantedStatus);
  }

  // 关键词：标题 / 摘要 / 正文 / 标签 任一命中
  if (q && String(q).trim()) {
    const like = `%${String(q).trim()}%`;
    where.push('(title LIKE ? OR summary LIKE ? OR content LIKE ? OR tags LIKE ?)');
    params.push(like, like, like, like);
  }

  if (tag && String(tag).trim()) {
    where.push(TAG_MATCH);
    params.push(String(tag).trim());
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // 排序白名单：绝不能把前端传来的字符串直接拼进 SQL（SQL 注入）
  const orderMap = {
    newest: 'created_at DESC',
    oldest: 'created_at ASC',
    popular: 'views DESC, created_at DESC',
    title: 'title ASC'
  };
  const orderSql = orderMap[sort] || orderMap.newest;

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM posts ${whereSql}`)
    .get(...params).n;

  const items = db
    .prepare(
      `SELECT ${LIST_COLS} FROM posts ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);

  res.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  });
});

// ============================================================
// GET /api/posts/:id —— 文章详情（顺带返回上一篇/下一篇）
// ============================================================
router.get('/:id', optionalAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'id 必须是整数' });

  const post = db.prepare(`SELECT ${POST_COLS} FROM posts WHERE id = ?`).get(id);
  if (!post) return res.status(404).json({ error: '文章不存在' });

  // 草稿只有登录后才能看，否则外部人猜到 id 就能读到没写完的内容
  if (post.status !== 'published' && !req.user) {
    return res.status(404).json({ error: '文章不存在' });
  }

  // 已发布的文章才计阅读量（自己后台预览不刷数据）
  if (post.status === 'published' && !req.user) {
    db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(id);
    post.views += 1;
  }

  const prev = db
    .prepare(
      `SELECT id, title FROM posts WHERE status = 'published' AND created_at < ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(post.created_at);
  const next = db
    .prepare(
      `SELECT id, title FROM posts WHERE status = 'published' AND created_at > ?
       ORDER BY created_at ASC LIMIT 1`
    )
    .get(post.created_at);

  res.json({ ...post, neighbors: { prev: prev || null, next: next || null } });
});

// ============================================================
// POST /api/posts —— 新建（需登录）
// ============================================================
router.post('/', requireAuth, (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: '标题不能为空' });
  }
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: '正文不能为空' });
  }

  const slug = slugify(req.body.slug || title);
  const summary = autoSummary(content, req.body.summary);
  const status = req.body.status === 'published' ? 'published' : 'draft';
  const now = new Date().toISOString();

  try {
    const info = db
      .prepare(
        `INSERT INTO posts
           (title, slug, summary, content, cover, tags, status, views, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .run(
        String(title).trim(),
        slug,
        summary,
        String(content),
        req.body.cover || null,
        req.body.tags || null,
        status,
        now,
        now
      );

    const created = db
      .prepare(`SELECT ${POST_COLS} FROM posts WHERE id = ?`)
      .get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'slug 已存在，换一个标题或手动改 slug' });
    }
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// PUT /api/posts/:id —— 更新（需登录，支持只传要改的字段）
// ============================================================
router.put('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const exists = db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
  if (!exists) return res.status(404).json({ error: '文章不存在' });

  const editable = ['title', 'slug', 'summary', 'content', 'cover', 'tags', 'status'];
  const fields = [];
  const values = [];

  for (const key of editable) {
    if (req.body[key] !== undefined) {
      let value = req.body[key];
      if (key === 'slug') value = slugify(value);
      if (key === 'status') value = value === 'published' ? 'published' : 'draft';
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: '没有提供要更新的字段' });
  }

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  try {
    db.prepare(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const updated = db.prepare(`SELECT ${POST_COLS} FROM posts WHERE id = ?`).get(id);
    res.json(updated);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'slug 已存在，换一个' });
    }
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// DELETE /api/posts/:id —— 删除（需登录）
// ============================================================
router.delete('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: '文章不存在' });
  res.json({ success: true, deleted: info.changes });
});

export default router;
