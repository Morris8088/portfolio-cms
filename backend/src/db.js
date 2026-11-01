// db.js —— 数据库初始化
// 使用 Node 22 内置的 node:sqlite（无需安装原生模块，跨平台零编译）。
// 注意：node:sqlite 目前是实验特性，启动时需加 --experimental-sqlite 标志
//       （已在 package.json 的 start/dev 脚本里加好）。
// 数据库文件会生成在 backend/data.db（已被 .gitignore 忽略）。
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 数据库文件放在 backend/data.db（上层目录）
const db = new DatabaseSync(join(__dirname, '..', 'data.db'));

// WAL 模式：读写并发更友好（学习点：SQLite 的 journal 模式）
db.exec('PRAGMA journal_mode = WAL');

// 建表：posts 是博客文章表。IF NOT EXISTS 保证多次运行不会报错。
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    slug        TEXT    UNIQUE NOT NULL,
    summary     TEXT,
    content     TEXT    NOT NULL,
    cover       TEXT,
    tags        TEXT,
    status      TEXT    NOT NULL DEFAULT 'draft',  -- draft 草稿 / published 已发布
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
  );
`);

export default db;
