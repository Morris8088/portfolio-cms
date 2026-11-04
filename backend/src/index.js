// ============================================================
// index.js —— 程序入口：自检 + 初始化数据 + 启动服务
// ============================================================

import app from './app.js';
import { seed } from './seed.js';

const PORT = Number(process.env.PORT) || 3001;
const isProd = process.env.NODE_ENV === 'production';

// ---------- 生产环境自检 ----------
// 这两项在本地开发时无所谓，但一旦部署到公网就是安全事故：
//   1. ADMIN_PASS 没设 → seed 会用默认的 admin123，等于把后台交给全网
//   2. JWT_SECRET 没设 → 用代码里的默认密钥，任何人都能自己签发 token 冒充管理员
// 所以生产环境下缺了就直接退出，让平台把这次部署标记为失败 —— 宁可不上线，也别上线一个裸奔的站。
if (isProd) {
  const problems = [];
  if (!process.env.ADMIN_PASS) problems.push('ADMIN_PASS 未设置');
  else if (process.env.ADMIN_PASS === 'admin123') problems.push('ADMIN_PASS 不能是默认的 admin123');
  if (!process.env.JWT_SECRET) problems.push('JWT_SECRET 未设置');

  if (problems.length) {
    console.error('\n[启动自检失败] 生产环境缺少必要配置：');
    for (const p of problems) console.error(`  • ${p}`);
    console.error('  请在平台的环境变量里补上后重新部署。\n');
    process.exit(1);
  }
}

// 首次运行自动灌入演示数据（已有数据则跳过，不会重复插入）
// 免费托管层每次重启会丢库文件，正好靠这一步把演示数据补回来
if (process.env.SEED !== '0') {
  seed();
}

app.listen(PORT, () => {
  console.log(`\n  API 已启动：http://localhost:${PORT}`);
  console.log(`  健康检查：   http://localhost:${PORT}/api/health`);
  // 只在非生产环境打印账号：生产环境的日志可能是公开可查的
  if (!isProd) console.log('  后台账号：   admin / admin123');
  console.log(`  运行环境：   ${process.env.NODE_ENV || 'dev'}\n`);
});
