// ============================================================
// routes/uploads.js —— 图片上传
// ------------------------------------------------------------
// 文件上传和"传一段 JSON"完全不是一回事，坑主要在这几处：
//   1. 类型可信吗？浏览器给的 mimetype 可以伪造，所以只信扩展名 + 白名单。
//   2. 大小有没有上限？没有的话别人传个 2GB 视频就把磁盘写满了。
//   3. 文件名会重名吗？用随机名，顺手避开中文/空格/路径符号。
//   4. 会不会被路径穿越？存进固定目录 + 随机名，用户控制不了路径。
// ============================================================

import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { requireAuth } from '../auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 上传目录：跟数据库放一起（默认 backend/uploads，部署时跟随 DATA_DIR）
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  join(process.env.DATA_DIR || join(__dirname, '..', '..'), 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_SIZE = 5 * 1024 * 1024; // 5MB，够放文章配图了
const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif']);

// 扩展名 → MIME。不能信客户端报的 mimetype（可以随便伪造），
// 一律以扩展名为准反查，返回给前端的 type 也用这个。
const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // 只保留扩展名，主名用 UUID：既不会重名，也躲开了中文文件名在 URL 里的编码麻烦
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) {
      return cb(new Error(`不支持的图片格式：${ext || '(无扩展名)'}`));
    }
    cb(null, true);
  }
});

const router = Router();

/**
 * 修复中文文件名乱码。
 * multer 解析 multipart 时按 latin1 解出 filename，浏览器实际发的是 UTF-8 字节，
 * 于是 "封面.png" 会变成 "å°é¢.png"。把字节还原再按 UTF-8 解一次即可。
 */
function decodeName(name) {
  try {
    return Buffer.from(String(name), 'latin1').toString('utf8');
  } catch {
    return String(name);
  }
}

// POST /api/uploads —— 上传一张图片，返回可直接放进 Markdown 的 URL
router.post('/', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    // multer 的错误要在这里自己接，交不到全局错误中间件
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: `图片不能超过 ${MAX_SIZE / 1024 / 1024}MB` });
      }
      return res.status(400).json({ error: err.message || '上传失败' });
    }
    if (!req.file) return res.status(400).json({ error: '没有收到文件，字段名应为 file' });

    const ext = extname(req.file.filename).toLowerCase();
    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      name: decodeName(req.file.originalname),
      size: req.file.size,
      type: MIME[ext] || req.file.mimetype
    });
  });
});

export default router;
