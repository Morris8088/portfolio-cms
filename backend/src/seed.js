// ============================================================
// seed.js —— 首次启动灌入演示数据
// ------------------------------------------------------------
// 文章内容不写在代码里，而是放在 content/posts/*.md：
//   1. 写 Markdown 比在 JS 字符串里转义反引号舒服得多
//   2. 想加一篇文章 = 新建一个 .md 文件，不用碰代码
//   3. 内容与代码分离，这也是真实 CMS 的常见做法
//
// 每个表都先查数量，有数据就跳过 → 可反复执行。
// ============================================================

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import db from './db.js';
import { hashPassword } from './auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'content');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

/**
 * 解析 Markdown 文件头部的 front matter：
 * ---
 * title: xxx
 * tags: a,b
 * ---
 * 正文……
 */
function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) data[key] = value;
  }
  return { data, body: match[2].trim() };
}

function loadPosts() {
  const dir = join(CONTENT_DIR, 'posts');
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .sort() // 文件名前缀 01/02 决定插入顺序
      .map((file) => {
        const { data, body } = parseFrontMatter(readFileSync(join(dir, file), 'utf8'));
        return { ...data, content: body };
      })
      .filter((p) => p.title && p.content);
  } catch (e) {
    console.warn('[seed] 读取 content/posts 失败：', e.message);
    return [];
  }
}

function loadProjects() {
  try {
    return JSON.parse(readFileSync(join(CONTENT_DIR, 'projects.json'), 'utf8'));
  } catch (e) {
    console.warn('[seed] 读取 content/projects.json 失败：', e.message);
    return [];
  }
}

export function seed() {
  // ---------- 管理员账号 ----------
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount === 0) {
    db.prepare(
      'INSERT INTO users (username, password, display_name, created_at) VALUES (?, ?, ?, ?)'
    ).run(ADMIN_USER, hashPassword(ADMIN_PASS), '站点管理员', new Date().toISOString());
    console.log(`[seed] 已创建管理员 ${ADMIN_USER} / ${ADMIN_PASS}`);
  }

  // ---------- 文章 ----------
  const postCount = db.prepare('SELECT COUNT(*) AS n FROM posts').get().n;
  if (postCount === 0) {
    const posts = loadPosts();
    const insert = db.prepare(
      `INSERT INTO posts
         (title, slug, summary, content, cover, tags, status, views, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`
    );
    for (const p of posts) {
      const date = p.date || new Date().toISOString();
      insert.run(
        p.title,
        p.slug || `post-${Date.now()}`,
        p.summary || null,
        p.content,
        p.tags || null,
        p.status === 'published' ? 'published' : 'draft',
        Number.parseInt(p.views, 10) || 0,
        date,
        date
      );
    }
    console.log(`[seed] 已写入 ${posts.length} 篇示例文章`);
  }

  // ---------- 作品 ----------
  const projectCount = db.prepare('SELECT COUNT(*) AS n FROM projects').get().n;
  if (projectCount === 0) {
    const projects = loadProjects();
    const insert = db.prepare(
      `INSERT INTO projects
         (title, role, description, tech, link, repo, highlight, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const now = new Date().toISOString();
    for (const p of projects) {
      insert.run(
        p.title,
        p.role || null,
        p.description,
        p.tech || null,
        p.link || null,
        p.repo || null,
        p.highlight || null,
        p.sort_order || 0,
        now,
        now
      );
    }
    console.log(`[seed] 已写入 ${projects.length} 个示例作品`);
  }
}
