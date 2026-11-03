// ============================================================
// index.js —— 程序入口：初始化数据 + 启动服务
// ============================================================

import app from './app.js';
import { seed } from './seed.js';

const PORT = Number(process.env.PORT) || 3001;

// 首次运行自动灌入演示数据（已有数据则跳过，不会重复插入）
if (process.env.SEED !== '0') {
  seed();
}

app.listen(PORT, () => {
  console.log(`\n  API 已启动：http://localhost:${PORT}`);
  console.log(`  健康检查：   http://localhost:${PORT}/api/health`);
  console.log(`  后台账号：   admin / admin123\n`);
});
