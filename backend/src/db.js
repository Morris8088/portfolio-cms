// ============================================================
// db.js —— 数据库初始化（建表 + 迁移 + 导出连接）
// ------------------------------------------------------------
// 为什么单独一个文件？
//   Express 只负责"接请求、回响应"，不负责"数据长什么样"。
//   把建表语句集中在这里，任何路由文件 import 一下就能拿到同一个连接。
//
// 用 Node 内置的 node:sqlite（Node 22+ 自带，无需编译原生模块）。
// ============================================================

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 数据库文件默认放在 backend/data.db。
// 测试时用环境变量 DB_FILE=':memory:' 换成一个内存库，测完自动消失，不污染真实数据。
// 部署时有两种玩法：
//   - 平台挂了持久卷 → 设 DATA_DIR 指向卷目录，库和图片一起持久化
//   - 没挂卷（免费层常见） → 库跟着容器走，重启后数据回到初始演示数据，
//     这对"给人点开看看"的作品集来说反而是好事：永远是一个干净的演示现场
const DB_FILE = process.env.DB_FILE || join(process.env.DATA_DIR || join(__dirname, '..'), 'data.db');

// 云平台通常把数据卷挂在 /data 之类的目录，第一次启动时目录可能不存在
mkdirSync(dirname(DB_FILE), { recursive: true });

const db = new DatabaseSync(DB_FILE);

// WAL 模式：读写可以并发，不会写的时候把读全锁住。
// 注意 :memory: 内存库不支持 WAL，会返回 'memory'，属正常现象。
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ---------- 表 1：posts 文章 ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    slug        TEXT    UNIQUE NOT NULL,
    summary     TEXT,
    content     TEXT    NOT NULL,
    cover       TEXT,
    tags        TEXT,
    status      TEXT    NOT NULL DEFAULT 'draft',
    views       INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
  );
`);

// ---------- 表 2：projects 作品集 ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    role        TEXT,
    description TEXT    NOT NULL,
    tech        TEXT,
    link        TEXT,
    repo        TEXT,
    highlight   TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
  );
`);

// ---------- 表 3：users 管理员账号 ----------
// 只存密码的哈希，绝不存明文。password 形如 "盐:哈希"。
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    display_name TEXT,
    created_at  TEXT    NOT NULL
  );
`);

// ---------- 轻量迁移：老库补字段 ----------
// 建表用了 IF NOT EXISTS，所以 Day2 就存在的旧 data.db 不会重建，
// 新加的列得手动补上，否则 SELECT views 会报 "no such column"。
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = cols.some((c) => c.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[db] 已为 ${table} 补充字段 ${column}`);
  }
}

ensureColumn('posts', 'views', 'INTEGER NOT NULL DEFAULT 0');

// 常用查询条件建索引，数据量大了才知道它的好
db.exec('CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)');
db.exec('CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at)');

export default db;
