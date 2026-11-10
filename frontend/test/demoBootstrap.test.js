// ============================================================
// test/demoBootstrap.test.js —— Demo 模式的启动顺序
// ------------------------------------------------------------
// 曾经出过的事故（和 mockAdapter 的路径 bug 是两回事）：
//
//   api/index.js 里写的是 `import('../demo').then(m => m.installDemoMode(request))`
//   —— 发起加载就不管了。而 main.js 紧接着 app.mount()。
//   结果应用先挂载，页面 onMounted 里第一批请求（文章列表）
//   在 adapter 装上之前就发出去了，直接打到真实的 /api/posts。
//   GitHub Pages 上没有这个文件，返回 404，
//   于是首页永远是「共 0 篇 + 请求失败（404）」，点进文章也是 404。
//
// 这个错最难的地方是：它不抛异常、不报错，只是"数据不见了"。
// 而且晚几百毫秒发出的请求（作品、标签）反而是好的，
// 所以看起来像"某几个接口坏了"，很容易抓错方向。
//
// 这组测试盯两件事：
//   1) installDemoMode 真的把 adapter 装在实例上（装上之后能取到数据）
//   2) main.js 必须先 await demoReady，才允许 app.mount
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installDemoMode } from '../src/demo';

describe('installDemoMode', () => {
  it('把 adapter 挂到 axios 实例的 defaults 上', () => {
    const fakeInstance = { defaults: {} };
    installDemoMode(fakeInstance);
    expect(typeof fakeInstance.defaults.adapter).toBe('function');
  });

  it('装上之后请求能拿到文章，而不是走到网络上 404', async () => {
    const fakeInstance = { defaults: {} };
    installDemoMode(fakeInstance);

    const adapter = fakeInstance.defaults.adapter;
    const res = await adapter({
      method: 'get',
      url: '/posts',
      baseURL: '/api',
      params: { page: 1, pageSize: 6 },
      headers: {}
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
    expect(res.data.items.length).toBeGreaterThan(0);
  });
});

describe('启动顺序：Demo 必须先装假后端再挂载', () => {
  // 这是"结构守卫"而不是行为测试。
  // 这种顺序错误没法在单元测试里跑出来（要跑起整个 Vue 应用），
  // 但可以直接断言源码里两件事的先后 —— 一旦有人把它改回去，这里就红。
  const src = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');

  it('await demoReady 出现在 app.mount 之前', () => {
    // 逐行找"真正的语句"，不能直接用 indexOf 找子串：
    // 注释里也会出现 app.mount() 这几个字，那样比的是注释的位置，测了个寂寞。
    const lines = src.split('\n');
    const findLine = (re) => lines.findIndex((line) => re.test(line));

    const iAwait = findLine(/^\s*await demoReady/);
    const iMount = findLine(/^\s*app\.mount\(/);

    expect(iAwait, 'main.js 里必须存在 await demoReady 语句').toBeGreaterThan(-1);
    expect(iMount, 'main.js 里必须有 app.mount(...) 语句').toBeGreaterThan(-1);
    expect(iAwait).toBeLessThan(iMount);
  });

  it('不能再用"发起加载就不管"的写法', () => {
    expect(src).not.toMatch(/import\(['"]\.\/demo['"]\)\.then/);
  });
});
