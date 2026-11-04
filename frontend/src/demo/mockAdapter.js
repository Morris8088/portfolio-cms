// ============================================================
// demo/mockAdapter.js —— Demo 模式下的假后端
// ------------------------------------------------------------
// 这个文件只在 Demo 构建（npm run build:demo）时才会被 import，
// 正式构建和本地开发都不会打包它。
//
// 原理：axios 允许替换 adapter（真正干活的底层函数）。
//   真 adapter 用 XMLHttpRequest 发请求；
//   这里换成直接从内存里的 JSON 取数据、按同样的格式返回。
//
// 为什么这么做，而不是在每个页面里写 if (isDemo)？
//   页面代码里有 20 多处调用 getPosts / createPost……
//   如果每处都判断，Demo 和真实逻辑会混在一起，以后难以维护。
//   adapter 这一层是唯一的出入口，换在这一层，页面一行都不用改。
// ============================================================

import data from './data.json';

const STORAGE_KEY = 'portfolio_demo_posts';

// 用 localStorage 存一份，这样刷新页面后你新建的文章还在。
// 清空浏览器数据就会回到初始的 6 篇。
function loadPosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* 读不出来就用初始数据 */
  }
  return JSON.parse(JSON.stringify(data.posts));
}

function savePosts(posts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch {
    /* 隐私模式下存不了，就只在本次会话有效 */
  }
}

let posts = loadPosts();
let nextId = Math.max(0, ...posts.map((p) => p.id)) + 1;

// ---------- 与后端保持一致的摘要逻辑（从 posts.js 抄过来的思路）----------
function autoSummary(content, summary) {
  if (summary && String(summary).trim()) return String(summary).trim();
  const plain = String(content || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^[ \t]*[#>*+-]+[ \t]*/gm, '')
    .replace(/[*_~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 80 ? `${plain.slice(0, 80)}…` : plain;
}

function makeSlug(title, id) {
  const base = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `post-${id}`;
}

// ---------- 列表查询：搜索 / 标签 / 状态 / 排序 / 分页 ----------
function queryPosts(params) {
  const q = (params.q || '').trim().toLowerCase();
  const tag = (params.tag || '').trim();
  const status = (params.status || '').trim();
  const sort = params.sort || 'newest';
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Number(params.pageSize) || 10);

  let list = posts.slice();

  // 没传 status 时只返回已发布的（和真实后端一致）
  if (status) list = list.filter((p) => p.status === status);
  else list = list.filter((p) => p.status === 'published');

  if (q) {
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.summary || '').toLowerCase().includes(q) ||
        (p.content || '').toLowerCase().includes(q)
    );
  }
  if (tag) {
    list = list.filter((p) =>
      String(p.tags || '')
        .split(',')
        .map((t) => t.trim())
        .includes(tag)
    );
  }

  if (sort === 'views') list.sort((a, b) => b.views - a.views);
  else if (sort === 'oldest') list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const total = list.length;
  const start = (page - 1) * pageSize;
  const items = list.slice(start, start + pageSize).map((p) => ({
    // 列表接口不返回正文，省流量——真实后端也是这么做的
    ...p,
    content: undefined
  }));

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
}

// ---------- 路由表：路径正则 → 处理函数 ----------
const routes = [
  // GET /posts
  {
    method: 'get',
    test: /^\/posts\/?$/,
    handle: (ctx) => [200, queryPosts(ctx.params)]
  },
  // GET /posts/:id
  {
    method: 'get',
    test: /^\/posts\/(\d+)$/,
    handle: (ctx) => {
      const post = posts.find((p) => p.id === Number(ctx.match[1]));
      if (!post) return [404, { error: '文章不存在' }];
      // 与后端一致：已发布文章才计阅读量，并返回上一篇/下一篇
      if (post.status === 'published') post.views = (post.views || 0) + 1;
      const published = posts
        .filter((p) => p.status === 'published')
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const i = published.findIndex((p) => p.id === post.id);
      const brief = (p) => (p ? { id: p.id, title: p.title } : null);
      return [
        200,
        {
          ...post,
          neighbors: {
            prev: brief(published[i - 1]),
            next: brief(published[i + 1])
          }
        }
      ];
    }
  },
  // POST /posts
  {
    method: 'post',
    test: /^\/posts\/?$/,
    handle: (ctx) => {
      const body = ctx.body || {};
      if (!body.title || !body.content) return [400, { error: '标题和正文不能为空' }];
      const now = new Date().toISOString();
      const post = {
        id: nextId++,
        title: body.title,
        slug: body.slug || makeSlug(body.title, nextId),
        summary: autoSummary(body.content, body.summary),
        content: body.content,
        cover: body.cover || null,
        tags: body.tags || '',
        status: body.status === 'published' ? 'published' : 'draft',
        views: 0,
        created_at: now,
        updated_at: now
      };
      posts.unshift(post);
      savePosts(posts);
      return [201, post];
    }
  },
  // PUT /posts/:id
  {
    method: 'put',
    test: /^\/posts\/(\d+)$/,
    handle: (ctx) => {
      const id = Number(ctx.match[1]);
      const idx = posts.findIndex((p) => p.id === id);
      if (idx === -1) return [404, { error: '文章不存在' }];
      const body = ctx.body || {};
      posts[idx] = {
        ...posts[idx],
        ...body,
        summary: autoSummary(body.content ?? posts[idx].content, body.summary),
        updated_at: new Date().toISOString()
      };
      savePosts(posts);
      return [200, posts[idx]];
    }
  },
  // DELETE /posts/:id
  {
    method: 'delete',
    test: /^\/posts\/(\d+)$/,
    handle: (ctx) => {
      const id = Number(ctx.match[1]);
      const idx = posts.findIndex((p) => p.id === id);
      if (idx === -1) return [404, { error: '文章不存在' }];
      posts.splice(idx, 1);
      savePosts(posts);
      return [200, { ok: true }];
    }
  },
  // GET /tags
  {
    method: 'get',
    test: /^\/tags\/?$/,
    handle: () => {
      const counter = new Map();
      for (const p of posts) {
        if (p.status !== 'published') continue;
        for (const t of String(p.tags || '').split(',')) {
          const name = t.trim();
          if (name) counter.set(name, (counter.get(name) || 0) + 1);
        }
      }
      const list = [...counter.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      return [200, list];
    }
  },
  // GET /projects
  {
    method: 'get',
    test: /^\/projects\/?$/,
    handle: () => [200, data.projects]
  },
  // GET /stats
  {
    method: 'get',
    test: /^\/stats\/?$/,
    handle: () => {
      const published = posts.filter((p) => p.status === 'published');
      return [
        200,
        {
          posts: published.length,
          drafts: posts.length - published.length,
          views: published.reduce((sum, p) => sum + (p.views || 0), 0),
          projects: data.projects.length
        }
      ];
    }
  },
  // POST /auth/login —— Demo 模式接受任意账号密码，方便面试官直接点进后台
  {
    method: 'post',
    test: /^\/auth\/login\/?$/,
    handle: () => {
      const user = { username: 'demo', display_name: '演示账号' };
      // 令牌用不到，但前端会把它存进 localStorage，给个占位值即可
      return [200, { token: 'demo-token', user }];
    }
  },
  // GET /auth/me
  {
    method: 'get',
    test: /^\/auth\/me\/?$/,
    handle: () => [200, { username: 'demo', display_name: '演示账号' }]
  },
  // POST /uploads —— Demo 模式直接把本地文件转成 blob URL 显示
  {
    method: 'post',
    test: /^\/uploads\/?$/,
    handle: (ctx) => {
      const file = ctx.formData?.get?.('file');
      if (!file) return [400, { error: '没有收到文件，字段名应为 file' }];
      return [
        201,
        {
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          type: file.type
        }
      ];
    }
  }
];

// 统一 URL 形状：一律以单个 "/" 开头。
// axios 传进来的本来就是 "/posts"，所以这是幂等的；
// 万一某天调用方传了 "posts" 或 "//posts"，也在这里归一，
// 而不是在下面每个正则里写两套。约定只有一处，才不容易出岔子。
function normalizePath(url) {
  const path = String(url || '').split('?')[0].trim();
  return `/${path.replace(/^\/+/, '')}`;
}

function findRoute(method, url) {
  const path = normalizePath(url);
  const route = routes.find((r) => r.method === method && r.test.test(path));
  return route ? { route, path } : null;
}

/**
 * 这是注册给 axios 的 adapter。
 * axios 期望返回 { data, status, statusText, headers, config, request }。
 * 业务代码里写的是 .then(res => res.data)，所以这里返回的 data 就是接口响应体。
 */
export default function demoAdapter(config) {
  // 注意这里把原始 url 直接交给 findRoute，由它统一规范成 "/xxx"。
  // 之前这里多写了一个 replace(/^\/+/, '') 把斜杠删了，
  // 而路由正则要求带斜杠，结果全线失配——线上每个页面都在报
  // "演示数据读取失败"。回归测试见 test/demoAdapter.test.js。
  const url = config.url;
  const method = String(config.method || 'get').toLowerCase();

  // 小延迟，模拟真实网络，让 loading 状态能看一眼
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const found = findRoute(method, url);
      if (!found) {
        reject(new Error(`Demo 模式未实现该接口：${method.toUpperCase()} ${url}`));
        return;
      }
      const { route, path } = found;

      const ctx = {
        match: path.match(route.test),
        params: config.params || {},
        body: typeof config.data === 'string' ? safeParse(config.data) : config.data,
        formData: config.data instanceof FormData ? config.data : null
      };

      const [status, payload] = route.handle(ctx);
      const response = {
        data: payload,
        status,
        statusText: status < 300 ? 'OK' : 'Error',
        headers: {},
        config,
        request: {}
      };

      // 和后端保持一致：4xx 走 reject，页面上的错误提示才会生效
      if (status >= 400) {
        const err = new Error(payload.error || `请求失败（${status}）`);
        err.response = response;
        err.config = config;
        reject(err);
      } else {
        resolve(response);
      }
    }, 120);
  });
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
