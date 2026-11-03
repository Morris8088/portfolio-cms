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

// ---------- 生产环境：顺手托管前端打包产物 ----------
// 开发时前端跑在 5173，走后端用不到这段；
// 部署时只需要跑一个 Node 服务，前端 dist 由它一起发出去，省一台服务器。
const distDir = join(__dirname, '..', '..', 'frontend', 'dist');
if (existsSync(distDir)) {
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
