// ============================================================
// test/api.test.js —— 接口自动化测试（Node 内置 test runner，零依赖）
// ------------------------------------------------------------
// 运行：npm test
// 原理：把 app 监听在随机端口上（listen(0) 让系统分配），
//       用 fetch 发真实 HTTP 请求，断言状态码和响应体。
// 数据库：用 :memory: 内存库，跑完自动消失，不会污染 data.db。
// ============================================================

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// 必须在 import app 之前设置环境变量（动态 import 保证顺序）
process.env.DB_FILE = ':memory:';
process.env.JWT_SECRET = 'unit-test-secret';
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASS = 'admin123';

const { default: app } = await import('../src/app.js');
const { seed } = await import('../src/seed.js');

seed();

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const BASE = `http://127.0.0.1:${server.address().port}`;

let token = '';
let createdId = 0;

/** 简化 fetch：自动带 JSON 头和令牌 */
async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

after(() => {
  server.close();
});

// ------------------------------------------------------------
// 一、健康检查
// ------------------------------------------------------------
test('GET /api/health 返回 200 且 ok=true', async () => {
  const { status, data } = await api('/api/health');
  assert.equal(status, 200);
  assert.equal(data.ok, true);
});

// ------------------------------------------------------------
// 二、登录鉴权
// ------------------------------------------------------------
test('登录：密码错误返回 401，且不区分账号不存在', async () => {
  const wrongPass = await api('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'wrong-password' }
  });
  const noUser = await api('/api/auth/login', {
    method: 'POST',
    body: { username: 'nobody', password: 'whatever' }
  });

  assert.equal(wrongPass.status, 401);
  assert.equal(noUser.status, 401);
  // 两种失败必须给出同一句提示，避免泄露账号是否存在
  assert.equal(wrongPass.data.error, noUser.data.error);
});

test('登录：缺少字段返回 400', async () => {
  const { status, data } = await api('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin' }
  });
  assert.equal(status, 400);
  assert.match(data.error, /用户名和密码/);
});

test('登录：正确凭据返回 token', async () => {
  const { status, data } = await api('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' }
  });
  assert.equal(status, 200);
  assert.ok(data.token, '应返回 token');
  assert.equal(data.user.username, 'admin');
  token = data.token;
});

test('GET /api/auth/me 用令牌换回用户信息', async () => {
  const { status, data } = await api('/api/auth/me', { auth: true });
  assert.equal(status, 200);
  assert.equal(data.username, 'admin');
});

test('伪造令牌一律 401', async () => {
  const res = await fetch(`${BASE}/api/auth/me`, {
    headers: { Authorization: 'Bearer abc.def.ghi' }
  });
  assert.equal(res.status, 401);
});

// ------------------------------------------------------------
// 三、写接口必须登录
// ------------------------------------------------------------
test('未登录不能新建文章', async () => {
  const { status } = await api('/api/posts', {
    method: 'POST',
    body: { title: '偷偷发一篇', content: '内容' }
  });
  assert.equal(status, 401);
});

test('未登录不能删除文章', async () => {
  const { status } = await api('/api/posts/1', { method: 'DELETE' });
  assert.equal(status, 401);
});

// ------------------------------------------------------------
// 四、文章的增删改查
// ------------------------------------------------------------
test('新建文章：自动生成 slug 与摘要', async () => {
  const longContent = '这是一段很长的正文内容。'.repeat(20);
  const { status, data } = await api('/api/posts', {
    method: 'POST',
    auth: true,
    body: { title: '自动化测试创建的标题', content: longContent, tags: '测试,自动化' }
  });

  assert.equal(status, 201);
  assert.ok(data.id > 0);
  assert.ok(data.slug.length > 0, 'slug 应自动生成');
  assert.ok(data.summary.length <= 81, '摘要应被截断到 80 字左右');
  assert.equal(data.status, 'draft', '不传状态默认草稿');
  assert.equal(data.views, 0);
  createdId = data.id;
});

test('新建文章：标题为空返回 400', async () => {
  const { status, data } = await api('/api/posts', {
    method: 'POST',
    auth: true,
    body: { title: '   ', content: '正文' }
  });
  assert.equal(status, 400);
  assert.match(data.error, /标题/);
});

test('新建文章：正文为空返回 400', async () => {
  const { status, data } = await api('/api/posts', {
    method: 'POST',
    auth: true,
    body: { title: '只有标题' }
  });
  assert.equal(status, 400);
  assert.match(data.error, /正文/);
});

test('新建文章：slug 重复返回 409', async () => {
  const first = await api('/api/posts', {
    method: 'POST',
    auth: true,
    body: { title: '重复 slug 测试', slug: 'dup-slug', content: '正文' }
  });
  assert.equal(first.status, 201);

  const second = await api('/api/posts', {
    method: 'POST',
    auth: true,
    body: { title: '再来一篇', slug: 'dup-slug', content: '正文' }
  });
  assert.equal(second.status, 409);
  assert.match(second.data.error, /已存在/);
});

test('更新文章：只传 status 时其他字段不受影响', async () => {
  const { status, data } = await api(`/api/posts/${createdId}`, {
    method: 'PUT',
    auth: true,
    body: { status: 'published' }
  });

  assert.equal(status, 200);
  assert.equal(data.status, 'published');
  assert.equal(data.title, '自动化测试创建的标题', '未传的标题应保持原值');
});

test('更新文章：不存在的 id 返回 404', async () => {
  const { status } = await api('/api/posts/999999', {
    method: 'PUT',
    auth: true,
    body: { title: 'x' }
  });
  assert.equal(status, 404);
});

test('更新文章：空 body 返回 400', async () => {
  const { status, data } = await api(`/api/posts/${createdId}`, {
    method: 'PUT',
    auth: true,
    body: {}
  });
  assert.equal(status, 400);
  assert.match(data.error, /没有提供/);
});

test('删除文章：删除成功后再查返回 404', async () => {
  const del = await api(`/api/posts/${createdId}`, { method: 'DELETE', auth: true });
  assert.equal(del.status, 200);
  assert.equal(del.data.success, true);

  const again = await api(`/api/posts/${createdId}`, { method: 'DELETE', auth: true });
  assert.equal(again.status, 404);
});

// ------------------------------------------------------------
// 五、列表：筛选 / 搜索 / 分页 / 排序
// ------------------------------------------------------------
test('列表：未登录取不到草稿', async () => {
  const { data } = await api('/api/posts?pageSize=50');
  assert.ok(data.items.length > 0);
  assert.ok(
    data.items.every((p) => p.status === 'published'),
    '公开列表只能出现已发布文章'
  );
});

test('列表：登录后可按 status 筛草稿', async () => {
  const { data } = await api('/api/posts?status=draft&pageSize=50', { auth: true });
  assert.ok(data.items.every((p) => p.status === 'draft'));
  assert.ok(data.total >= 1);
});

test('列表：分页返回正确的 total / totalPages', async () => {
  const page1 = await api('/api/posts?page=1&pageSize=2');
  assert.equal(page1.data.page, 1);
  assert.equal(page1.data.pageSize, 2);
  assert.equal(page1.data.items.length, 2);
  assert.equal(
    page1.data.totalPages,
    Math.max(1, Math.ceil(page1.data.total / 2))
  );

  const page2 = await api('/api/posts?page=2&pageSize=2');
  assert.notEqual(page1.data.items[0].id, page2.data.items[0].id, '第二页内容应不同');
});

test('列表：非法分页参数被夹到合法范围', async () => {
  const zero = await api('/api/posts?page=0&pageSize=0');
  assert.equal(zero.data.page, 1, 'page=0 应被纠正为 1');
  assert.equal(zero.data.pageSize, 6, 'pageSize=0 应回落到默认 6');

  const huge = await api('/api/posts?pageSize=9999');
  assert.equal(huge.data.pageSize, 50, 'pageSize 上限 50');
});

test('列表：关键词搜索命中标题', async () => {
  const { data } = await api('/api/posts?q=JWT');
  assert.ok(data.total >= 1);
  assert.ok(data.items.some((p) => p.title.includes('JWT')));
});

test('列表：关键词搜不到时返回空数组而不是报错', async () => {
  const { status, data } = await api('/api/posts?q=这个词肯定不存在xyz');
  assert.equal(status, 200);
  assert.equal(data.total, 0);
  assert.deepEqual(data.items, []);
});

test('列表：按标签筛选，且不会误匹配子串', async () => {
  const hit = await api('/api/posts?tag=Vue3');
  assert.ok(hit.data.total >= 1);
  assert.ok(hit.data.items.every((p) => p.tags.split(',').map((t) => t.trim()).includes('Vue3')));

  // 'Vue' 是 'Vue3' 的子串，但作为完整标签不存在
  const miss = await api('/api/posts?tag=Vue');
  assert.equal(miss.data.total, 0);
});

test('列表：sort=popular 按阅读量倒序', async () => {
  const { data } = await api('/api/posts?sort=popular&pageSize=10');
  const views = data.items.map((p) => p.views);
  const sorted = [...views].sort((a, b) => b - a);
  assert.deepEqual(views, sorted);
});

test('列表：sort 传了非法值也不会注入 SQL', async () => {
  const { status, data } = await api('/api/posts?sort=created_at;DROP TABLE posts');
  assert.equal(status, 200);
  // 表还在，说明非法值被白名单挡掉了
  assert.ok(Array.isArray(data.items));
});

// ------------------------------------------------------------
// 六、详情
// ------------------------------------------------------------
test('详情：读取已发布文章会累加阅读量', async () => {
  const list = await api('/api/posts?pageSize=1&sort=popular');
  const id = list.data.items[0].id;
  const before = list.data.items[0].views;

  const detail = await api(`/api/posts/${id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.data.views, before + 1);
});

test('详情：返回上一篇/下一篇字段', async () => {
  const { data } = await api('/api/posts?pageSize=50');
  const middle = data.items[Math.floor(data.items.length / 2)];
  const { status, data: detail } = await api(`/api/posts/${middle.id}`);
  assert.equal(status, 200);
  assert.ok('neighbors' in detail);
  assert.ok('prev' in detail.neighbors && 'next' in detail.neighbors);
});

test('详情：草稿对外不可见（404），登录后可见', async () => {
  const drafts = await api('/api/posts?status=draft&pageSize=1', { auth: true });
  const draftId = drafts.data.items[0].id;

  const anonymous = await api(`/api/posts/${draftId}`);
  assert.equal(anonymous.status, 404, '游客不应能看到草稿');

  const authed = await api(`/api/posts/${draftId}`, { auth: true });
  assert.equal(authed.status, 200);
});

test('详情：不存在的 id 返回 404', async () => {
  const { status, data } = await api('/api/posts/987654');
  assert.equal(status, 404);
  assert.match(data.error, /不存在/);
});

test('详情：id 非整数返回 400', async () => {
  const { status } = await api('/api/posts/abc');
  assert.equal(status, 400);
});

// ------------------------------------------------------------
// 七、标签聚合与作品集
// ------------------------------------------------------------
test('GET /api/tags 返回标签及文章数', async () => {
  const { status, data } = await api('/api/tags');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0);
  assert.ok(data[0].name && data[0].count > 0);
});

test('GET /api/projects 公开可读', async () => {
  const { status, data } = await api('/api/projects');
  assert.equal(status, 200);
  assert.ok(data.length >= 3);
  assert.ok(data[0].title);
});

test('作品集写接口需要登录', async () => {
  const anonymous = await api('/api/projects', {
    method: 'POST',
    body: { title: 'x', description: 'y' }
  });
  assert.equal(anonymous.status, 401);

  const authed = await api('/api/projects', {
    method: 'POST',
    auth: true,
    body: { title: '测试作品', description: '用于单测' }
  });
  assert.equal(authed.status, 201);

  const del = await api(`/api/projects/${authed.data.id}`, { method: 'DELETE', auth: true });
  assert.equal(del.status, 200);
});

// ------------------------------------------------------------
// 八、统计与兜底
// ------------------------------------------------------------
test('GET /api/stats 需要登录，返回各项计数', async () => {
  const anonymous = await api('/api/stats');
  assert.equal(anonymous.status, 401);

  const { status, data } = await api('/api/stats', { auth: true });
  assert.equal(status, 200);
  assert.ok(data.posts.total > 0);
  assert.ok(data.posts.published > 0);
  assert.equal(typeof data.posts.views, 'number');
});

test('未知接口返回 404 JSON', async () => {
  const { status, data } = await api('/api/not-exists');
  assert.equal(status, 404);
  assert.match(data.error, /接口不存在/);
});

test('请求体不是合法 JSON 时返回 400 而不是 500', async () => {
  const res = await fetch(`${BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: '{ 这不是 JSON'
  });
  assert.equal(res.status, 400);
});
