// ============================================================
// test/pure.test.js —— 纯函数单测（不启服务，测完毫秒级返回）
// ------------------------------------------------------------
// 接口测试（api.test.js）负责"链路通不通"，
// 这里负责"算法对不对"，两类分开跑，定位问题快得多。
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_FILE = ':memory:';

const { autoSummary } = await import('../src/routes/posts.js');

// ------------------------------------------------------------
// 摘要生成
// ------------------------------------------------------------

test('自动摘要：图片语法整块删除，不留文件名碎片', () => {
  // 这是引入图片上传后真实踩到的 bug：
  // 旧实现只去掉 []() 这类符号，图片会碎成 "!图/uploads/a.png"
  const md = '第一段文字\n\n![img](/uploads/a1b2c3.png)\n\n第二段文字';
  assert.equal(autoSummary(md, ''), '第一段文字 第二段文字');
});

test('自动摘要：链接保留可见文字，丢掉 URL', () => {
  assert.equal(autoSummary('看这个[项目源码](https://github.com/x/y)很不错', ''), '看这个项目源码很不错');
});

test('自动摘要：去掉围栏代码块', () => {
  const md = '说明如下：\n\n```js\nconsole.log(1)\n```\n\n结束';
  assert.equal(autoSummary(md, ''), '说明如下： 结束');
});

test('自动摘要：去掉行内代码的反引号', () => {
  assert.equal(autoSummary('用 `npm test` 跑测试', ''), '用 npm test 跑测试');
});

test('自动摘要：去掉标题井号与强调符号', () => {
  assert.equal(autoSummary('# 标题\n\n**加粗**和*斜体*', ''), '标题 加粗和斜体');
});

test('自动摘要：去掉列表与引用的前缀符号', () => {
  assert.equal(autoSummary('- 第一条\n- 第二条\n> 引用', ''), '第一条 第二条 引用');
});

test('自动摘要：手写的摘要优先，原样返回', () => {
  assert.equal(autoSummary('正文一大段', '  我自己写的摘要  '), '我自己写的摘要');
});

test('自动摘要：空正文返回空字符串', () => {
  assert.equal(autoSummary('', ''), '');
  assert.equal(autoSummary(null, ''), '');
});

test('自动摘要：超长正文截断到 80 字并加省略号', () => {
  const long = '字'.repeat(200);
  const out = autoSummary(long, '');
  assert.equal(out.length, 81);
  assert.ok(out.endsWith('…'));
});

test('自动摘要：只有图片的正文不会产出文件名', () => {
  assert.equal(autoSummary('![](/uploads/x.png)', ''), '');
});

test('自动摘要：折叠多余空白与换行', () => {
  assert.equal(autoSummary('第一行\n\n\n\n第二行', ''), '第一行 第二行');
});
