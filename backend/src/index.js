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

// TODO(Day2): 在这里加文章 CRUD 路由 —— GET /api/posts, GET /api/posts/:id,
//             POST /api/posts, PUT /api/posts/:id, DELETE /api/posts/:id

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
