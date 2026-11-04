// ============================================================
// build-demo-data.mjs —— 把后端的内容文件打包成静态 JSON
// ------------------------------------------------------------
// 为什么需要这一步？
//   在线 Demo 部署在 GitHub Pages 上，那里只有静态文件，没有 Node 进程，
//   所以后端读不到 backend/content/posts/*.md。
//   这个脚本在构建时把这些 Markdown 读一遍，转成 src/demo/data.json 一起打包，
//   前端在 Demo 模式下直接从这个 JSON 里取数据。
//
// 什么时候跑？
//   npm run build:demo 会先执行它，再执行 vite build。
//   平时开发（npm run dev）和正式部署（Docker）都不会触发它，
//   所以这份 JSON 对真实后端没有任何影响。
// ============================================================

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', '..', 'backend', 'content');
const OUT_FILE = join(__dirname, '..', 'src', 'demo', 'data.json');

/**
 * 解析 Markdown 头部的 front matter：
 * ---
 * title: xxx
 * tags: a,b
 * ---
 * 正文……
 * 这份实现和 backend/src/seed.js 里保持一致，避免两边解析结果不同。
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
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort();

  return files
    .map((file, i) => {
      const { data, body } = parseFrontMatter(readFileSync(join(dir, file), 'utf8'));
      return {
        // Demo 里 id 用序号即可，真实后端的自增 id 从 1 开始，保持一致
        id: i + 1,
        title: data.title || '(无标题)',
        slug: data.slug || `post-${i + 1}`,
        summary: data.summary || '',
        content: body,
        cover: null,
        tags: data.tags || '',
        status: data.status === 'published' ? 'published' : 'draft',
        views: Number.parseInt(data.views, 10) || 0,
        created_at: data.date || new Date().toISOString(),
        updated_at: data.date || new Date().toISOString()
      };
    })
    .filter((p) => p.title && p.content);
}

function loadProjects() {
  const list = JSON.parse(readFileSync(join(CONTENT_DIR, 'projects.json'), 'utf8'));
  return list.map((p, i) => ({ id: i + 1, ...p }));
}

const posts = loadPosts();
const projects = loadProjects();

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, `${JSON.stringify({ posts, projects }, null, 2)}\n`, 'utf8');

const published = posts.filter((p) => p.status === 'published').length;
console.log(
  `[demo] 已生成 data.json：${published} 篇已发布 + ${posts.length - published} 篇草稿，${projects.length} 个作品`
);
