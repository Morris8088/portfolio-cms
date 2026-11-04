// ============================================================
// app.js —— 组装 Express 应用（不负责启动）
// ------------------------------------------------------------
// 为什么把"组装"和"启动"分开？
//   测试时需要 import 这个 app 并监听一个随机端口，
//   如果本文件里就 app.listen(3001)，测试一跑就把你的开发端口占了。
//   拆开后：index.js 负责 listen，测试负责自己 listen。
// ============================================================

import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import postsRouter from './routes/posts.js';
import projectsRouter from './routes/projects.js';
import authRouter from './routes/auth.js';
import statsRouter from './routes/stats.js';
import tagsRouter from './routes/tags.js';
import uploadsRouter, { UPLOAD_DIR } from './routes/uploads.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' })); // 限制请求体大小，防止有人塞 100MB 进来

// 健康检查：部署平台靠它判断服务活着没
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), env: process.env.NODE_ENV || 'dev' });
});

// ---------- 业务路由 ----------
app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/uploads', uploadsRouter);

// ---------- 上传的图片 ----------
// 文件名是随机 UUID，内容一旦写入就不再变，所以可以放心强缓存一年。
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    maxAge: '1y',
    immutable: true,
    fallthrough: true, // 找不到就交给后面的 404 兜底，别把 SPA 回退搞坏
    index: false
  })
);

// ---------- 生产环境：顺手托管前端打包产物 ----------
// 开发时前端跑在 5173，走后端用不到这段；
// 部署时只需要跑一个 Node 服务，前端 dist 由它一起发出去，省一台服务器。
//
// 为什么不用写死的相对层级？
//   本地结构是 backend/src/app.js  → dist 在 ../../frontend/dist
//   容器结构是 /app/src/app.js     → dist 在 ../frontend/dist
//   两处差一级，写死任何一个都会在另一个环境里 404。
//   所以按优先级探测，谁存在用谁。
const distCandidates = [
  join(__dirname, '..', 'frontend', 'dist'), // 容器：/app/src → /app/frontend/dist
  join(__dirname, '..', '..', 'frontend', 'dist'), // 本地：backend/src → frontend/dist
  process.env.DIST_DIR || '' // 兜底：允许用环境变量直接指定
].filter(Boolean);

const distDir = distCandidates.find((dir) => existsSync(dir));

if (distDir) {
  app.use(express.static(distDir));
  // SPA 回退：/posts/3 这种前端路由，服务器上并没有对应文件，
  // 一律返回 index.html 让前端路由自己解析
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    // 带扩展名的请求（.js / .css / .png）说明是在找静态文件，
    // 找不到就该老老实实返回 404，而不是回一个 index.html
    if (/\.[a-zA-Z0-9]+$/.test(req.path)) {
      return res.status(404).send('静态文件不存在');
    }
    res.sendFile(join(distDir, 'index.html'));
  });
}

// ---------- 兜底 404：请求了不存在的接口 ----------
app.use('/api', (req, res) => {
  res.status(404).json({ error: `接口不存在：${req.method} ${req.originalUrl}` });
});

// ---------- 统一错误处理 ----------
// 注意：必须写 4 个参数，Express 才会把它认作错误处理中间件。
// 少了 err 参数它就变成普通中间件，永远抓不到异常。
app.use((err, req, res, next) => {
  console.error('[server error]', err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '请求体不是合法 JSON' });
  }
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message });
});

export default app;
