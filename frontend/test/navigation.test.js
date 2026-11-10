// ============================================================
// test/navigation.test.js —— 站内跳转别把 "锚点" 写成 "路由"
// ------------------------------------------------------------
// 出过的事故：首页「读读文章」写的是 <a href="#posts">，
// 本意是滚到本页下方的文章列表。但 Demo 用 hash 路由，
// 地址栏 # 后面整段都会被 Vue Router 当作路由路径：
//   #posts  →  规范化成 #/posts  →  路由表只有 /posts/:id  →  404 页
//
// 于是访客点「读读文章」看到的是"这个地址没有内容"，
// 而后台列表里 5 篇文章明明都好好的 —— 看起来就像"只有作者自己看得见"。
//
// 这组用例是结构守卫：行为层面的验证交给 scripts/e2e-demo.mjs（真浏览器）。
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');

describe('首页「读读文章」入口', () => {
  const src = read('../src/views/Home.vue');

  it('不能再使用「href 指向 # 的普通 a 标签」', () => {
    // 只匹配真实的 <a> 标签，不去碰注释里的说明文字。
    expect(src, 'hash 路由下这会变成跳转到 /posts').not.toMatch(/<a\s[^>]*href=["']#/);
  });

  it('改成用 button + JS 滚动，地址栏保持不变', () => {
    expect(src).toMatch(/<button[^>]*@click="scrollToPosts"/);
    expect(src).toMatch(/function scrollToPosts\(\)/);
    expect(src).toMatch(/scrollIntoView\(/);
  });

  it('要滚过去的 #posts 区块确实存在', () => {
    expect(src).toMatch(/id="posts"/);
  });
});

describe('/posts 兜底路由（旧链接 / 别人分享的地址）', () => {
  const src = read('../src/router/index.js');

  it('必须有一条 /posts 的 redirect，不能让它掉进 404', () => {
    expect(src).toMatch(/path:\s*['"]\/posts['"]\s*,\s*redirect/);
  });

  it('重定向目标是首页的文章区，不是首页顶部', () => {
    expect(src).toMatch(/redirect:\s*\{\s*name:\s*['"]home['"],\s*hash:\s*['"]#posts['"]\s*\}/);
  });
});

describe('文章详情的「返回文章列表」', () => {
  const src = read('../src/views/PostDetail.vue');

  it('回到首页文章区，而不是又回到头图', () => {
    expect(src).toMatch(/hash:\s*['"]#posts['"]/);
  });
});
