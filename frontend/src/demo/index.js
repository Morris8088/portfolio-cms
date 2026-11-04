// ============================================================
// demo/index.js —— Demo 模式的安装入口
// ------------------------------------------------------------
// 只在 VITE_DEMO=true 时被 api/index.js 动态 import，
// 所以正式构建里根本不存在这段代码（Rollup 会把它摇掉）。
//
// 用法（在 api/index.js 里）：
//   if (import.meta.env.VITE_DEMO === 'true') {
//     await import('../demo').then((m) => m.installDemoMode(request));
//   }
//
// 注意 installDemoMode 只改 axios 实例的 adapter，
// 拦截器（带令牌、统一错误翻译）照样生效——
// 这正是我们希望的效果：Demo 的报错文案和线上完全一致。
// ============================================================

import demoAdapter from './mockAdapter';

export function installDemoMode(request) {
  request.defaults.adapter = demoAdapter;

  // 控制台留个记号，方便你在浏览器里一眼确认"这是 Demo 构建"
  console.info(
    '%c DEMO 模式 ',
    'background:#2f7d5d;color:#fff;border-radius:3px;padding:2px 6px',
    '接口由前端模拟，数据存在本机 localStorage，不会影响任何服务器。'
  );
}

export default installDemoMode;
