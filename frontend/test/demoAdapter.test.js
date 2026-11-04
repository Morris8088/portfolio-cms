// ============================================================
// test/demoAdapter.test.js —— Demo 假后端的回归测试
// ------------------------------------------------------------
// 为什么专门补这一组？
// 因为曾经真的出过事：adapter 里顺手把 URL 开头的斜杠删掉了，
// 而路由正则写的是 /^\/posts\/?$/，结果每一条都匹配不上——
// 线上所有页面都在报"演示数据读取失败"。
//
// 当时没有测试能发现它，因为之前的"验证"只确认了代码被打包进去，
// 从来没有真的调用过 adapter。这组测试就是把 adapter 真的跑一遍。
// ============================================================

import { describe, it, expect } from 'vitest';
import demoAdapter from '../src/demo/mockAdapter';

// 直接调用 adapter，模拟 axios 传进来的 config
async function call(method, url, extra = {}) {
  const config = { method, url, baseURL: '/api', params: {}, headers: {}, ...extra };
  try {
    const res = await demoAdapter(config);
    return { ok: true, status: res.status, data: res.data };
  } catch (e) {
    return { ok: false, status: e.response?.status, error: e.message, data: e.response?.data };
  }
}

describe('demoAdapter 路由匹配', () => {
  // 这一条就是那个 bug 的守门员。
  // axios 传给 adapter 的 url 一定带前导斜杠（业务代码里写的是 '/posts'），
  // 如果 adapter 内部把斜杠删掉，而路由正则又要求带斜杠，就会全线失配。
  // 注意：这里必须断言"成功"，不能只断言"不报错"。
  it('带前导斜杠的路径能匹配上（曾经这里全挂）', async () => {
    const r = await call('get', '/projects');
    expect(r.ok, 'GET /projects 应该匹配到路由，而不是"未实现"').toBe(true);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.data)).toBe(true);
  });

  it('业务代码实际会发的路径全部可用（覆盖所有页面）', async () => {
    // 这几个就是页面里真实调用的地址，一个都不能挂
    const paths = ['/posts', '/projects', '/tags', '/stats'];
    for (const p of paths) {
      const r = await call('get', p);
      expect(r.ok, `${p} 应该返回数据，实际：${r.error || ''}`).toBe(true);
    }
  });

  it('不带前导斜杠的路径同样能匹配', async () => {
    const r = await call('get', 'projects');
    expect(r.ok).toBe(true);
    expect(r.status).toBe(200);
  });

  it('带查询串时不影响匹配', async () => {
    const r = await call('get', '/posts?page=1');
    expect(r.ok).toBe(true);
    expect(r.status).toBe(200);
  });

  it('结尾多一个斜杠也能匹配', async () => {
    const r = await call('get', '/tags/');
    expect(r.ok).toBe(true);
  });
});

describe('demoAdapter 接口行为', () => {
  it('GET /posts 只返回已发布文章，且列表不含正文', async () => {
    const r = await call('get', '/posts');
    expect(r.ok).toBe(true);
    const { items, total, pageSize } = r.data;
    expect(Array.isArray(items)).toBe(true);
    expect(total).toBeGreaterThan(0);
    // 未登录时不该出现草稿
    expect(items.every((p) => p.status === 'published')).toBe(true);
    // 列表接口省流量，不返回 content
    expect(items.every((p) => p.content === undefined)).toBe(true);
    expect(pageSize).toBeGreaterThan(0);
  });

  it('GET /posts/:id 返回详情 + 上一篇/下一篇', async () => {
    const list = (await call('get', '/posts')).data;
    const id = list.items[0].id;
    const r = await call('get', `/posts/${id}`);
    expect(r.ok).toBe(true);
    expect(r.data.id).toBe(id);
    expect(typeof r.data.content).toBe('string');
    // 详情页底部的导航依赖这个字段
    expect(r.data.neighbors).toBeDefined();
    expect(r.data.neighbors).toHaveProperty('prev');
    expect(r.data.neighbors).toHaveProperty('next');
  });

  it('GET /posts/:id 不存在的 id 返回 404', async () => {
    const r = await call('get', '/posts/999999');
    expect(r.ok).toBe(false);
    expect(r.status).toBe(404);
  });

  it('GET /projects 返回作品列表', async () => {
    const r = await call('get', '/projects');
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.length).toBeGreaterThan(0);
    expect(r.data[0]).toHaveProperty('title');
  });

  it('GET /tags 返回标签及计数', async () => {
    const r = await call('get', '/tags');
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
    if (r.data.length) {
      expect(r.data[0]).toHaveProperty('name');
      expect(r.data[0]).toHaveProperty('count');
    }
  });

  it('GET /stats 返回统计字段', async () => {
    const r = await call('get', '/stats');
    expect(r.ok).toBe(true);
    for (const k of ['posts', 'drafts', 'views', 'projects']) {
      expect(r.data).toHaveProperty(k);
    }
  });

  it('搜索参数生效', async () => {
    const all = (await call('get', '/posts')).data;
    const first = all.items[0];
    const word = first.title.slice(0, 4);
    const r = await call('get', '/posts', { params: { q: word } });
    expect(r.ok).toBe(true);
    expect(r.data.total).toBeGreaterThan(0);
  });

  it('POST /auth/login 在 Demo 里接受任意账号', async () => {
    const r = await call('post', '/auth/login', { data: { username: 'x', password: 'y' } });
    expect(r.ok).toBe(true);
    expect(r.data.token).toBeTruthy();
    expect(r.data.user).toBeDefined();
  });

  it('未实现的接口明确报错，而不是静默返回空', async () => {
    const r = await call('get', '/nope');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/未实现/);
  });
});
