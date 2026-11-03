// ============================================================
// routes/auth.js —— 登录相关接口
// ============================================================

import { Router } from 'express';
import db from '../db.js';
import { verifyPassword, signToken, requireAuth } from '../auth.js';

const router = Router();

// ---------- 简易登录限流 ----------
// 防止有人写脚本疯狂撞密码。生产环境应该用 redis，这里用内存 Map 演示思路。
const attempts = new Map(); // key: ip → { count, resetAt }
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;

function tooManyAttempts(ip) {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 0, resetAt: now + WINDOW_MS });
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const record = attempts.get(ip) || { count: 0, resetAt: Date.now() + WINDOW_MS };
  record.count += 1;
  attempts.set(ip, record);
}

// ============================================================
// POST /api/auth/login  { username, password } → { token, user }
// ============================================================
router.post('/login', (req, res) => {
  const ip = req.ip || 'unknown';
  if (tooManyAttempts(ip)) {
    return res.status(429).json({ error: '尝试次数过多，请 1 分钟后再试' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }

  const user = db
    .prepare('SELECT id, username, password, display_name FROM users WHERE username = ?')
    .get(String(username).trim());

  // 用户不存在 / 密码错误，返回同一句提示。
  // 不要区分"账号不存在"和"密码错误"，否则等于告诉攻击者账号是有效的。
  if (!user || !verifyPassword(String(password), user.password)) {
    recordFailure(ip);
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  attempts.delete(ip);
  const token = signToken({ sub: user.id, username: user.username });

  res.json({
    token,
    user: { id: user.id, username: user.username, displayName: user.display_name }
  });
});

// ============================================================
// GET /api/auth/me —— 用令牌换回自己的信息（前端刷新页面后校验登录态）
// ============================================================
router.get('/me', requireAuth, (req, res) => {
  const user = db
    .prepare('SELECT id, username, display_name FROM users WHERE id = ?')
    .get(req.user.sub);
  if (!user) return res.status(401).json({ error: '账号不存在' });
  res.json({ id: user.id, username: user.username, displayName: user.display_name });
});

export default router;
