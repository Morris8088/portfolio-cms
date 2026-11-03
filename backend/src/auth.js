// ============================================================
// auth.js —— 登录鉴权的三件事：密码哈希、令牌签发/校验、路由守卫
// ------------------------------------------------------------
// 不用第三方库（jsonwebtoken / bcrypt），全部用 Node 内置 crypto 手写。
// 目的：让你看清"鉴权"到底在干什么，而不是背一个 API。
//
// 三个概念：
//   1. 密码哈希：注册时把密码变成一串不可逆的乱码存库；登录时用同样算法
//      算一遍再比对，谁也不知道原密码。
//   2. 令牌(token)：登录成功后发一张"通行证"，之后每次请求带上它，
//      后端不用查库就知道你是谁。这里用 HMAC-SHA256 签名，防篡改。
//   3. 中间件(middleware)：请求进入业务代码之前的一道关卡。
// ============================================================

import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac
} from 'node:crypto';

// 生产环境必须通过环境变量 JWT_SECRET 覆盖它
const SECRET = process.env.JWT_SECRET || 'portfolio-cms-dev-secret-change-me';
const TOKEN_TTL = 60 * 60 * 8; // 令牌有效期：8 小时

// ---------- 一、密码哈希 ----------

/**
 * 把明文密码变成 "盐:哈希"
 * 盐(salt)的作用：同样的密码，不同用户算出来的哈希也不同，
 * 防止有人拿"彩虹表"反查。
 */
export function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex');
  // scrypt 是专门为"慢"设计的哈希算法，暴力破解成本极高
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * 校验密码。返回 true / false
 */
export function verifyPassword(plain, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(plain, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  // timingSafeEqual：比较耗时与内容无关，防止"计时攻击"猜出正确前缀
  return timingSafeEqual(candidate, expected);
}

// ---------- 二、令牌签发与校验 ----------

const b64url = (input) => Buffer.from(input).toString('base64url');

/**
 * 签发令牌。结构：header.payload.signature
 * 这就是 JWT 的本质，三行代码就能写出来。
 */
export function signToken(payload, ttl = TOKEN_TTL) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + ttl }));
  const signature = createHmac('sha256', SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

/**
 * 校验令牌。合法返回 payload，非法/过期返回 null
 */
export function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = createHmac('sha256', SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // 长度不等时 timingSafeEqual 会直接抛错，所以先比长度
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------- 三、中间件 ----------

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

/** 必须登录：没令牌或令牌无效 → 401 */
export function requireAuth(req, res, next) {
  const payload = verifyToken(readToken(req));
  if (!payload) {
    return res.status(401).json({ error: '未登录或登录已过期，请重新登录' });
  }
  req.user = payload;
  next();
}

/** 可选登录：有合法令牌就记下用户，没有也放行（用于公开接口判断能否看草稿） */
export function optionalAuth(req, res, next) {
  const payload = verifyToken(readToken(req));
  if (payload) req.user = payload;
  next();
}
