// 本地端到端验收：起一个静态服务器模拟 GitHub Pages，用真实 Chrome 走一遍
// "打开首页 → 看见文章 → 点进文章 → 正文出来"。
// 这一步是必须的：单元测试能证明 adapter 逻辑对，但证明不了"请求发得够晚"。
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = resolve('./dist');
const PREFIX = '/portfolio-cms';
const PORT = 8791;
// 用系统里已装的 Chrome（不需要额外下浏览器）。换机器时用 CHROME_PATH 覆盖。
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CDP = 9353;

for (const k of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']) delete process.env[k];
process.env.NO_PROXY = '*';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2'
};

// 行为对齐 GitHub Pages：文件不存在 → 返回 404.html，状态码 404
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (!url.startsWith(PREFIX)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
    return;
  }
  let rel = url.slice(PREFIX.length) || '/';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = join(ROOT, rel);

  try {
    const st = await stat(file);
    if (st.isDirectory()) throw new Error('dir');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(await readFile(join(ROOT, '404.html')));
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-proxy-server', '--no-first-run',
  '--no-default-browser-check', `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${join(tmpdir(), 'wb-e2e-chrome-profile')}`, 'about:blank'
], { stdio: 'ignore' });

let ws, msgId = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++msgId; pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  return r.exceptionDetails ? 'EXC: ' + (r.exceptionDetails.exception?.description || '') : r.result.value;
};

async function connect() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const list = await fetch(`http://127.0.0.1:${CDP}/json/list`).then((r) => r.json());
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(300);
  }
  throw new Error('连不上 Chrome');
}

let failed = 0;
function check(name, ok, detail = '') {
  console.log(ok ? `  ✅ ${name}` : `  ❌ ${name} ${detail}`);
  if (!ok) failed += 1;
}

try {
  ws = new WebSocket(await connect());
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    }
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

  console.log('\n① 首页（全新加载，最考验启动顺序）');
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${PREFIX}/` });
  await sleep(3500);
  const cards = await evaluate("document.querySelectorAll('a.post-card').length");
  const text = String(await evaluate("document.querySelector('#app').innerText"));
  check('文章卡片已渲染', cards > 0, `实际 ${cards} 张`);
  check('没有「请求失败」提示', !text.includes('请求失败'));
  check('显示文章总数', /共 \d+ 篇/.test(text), (text.match(/共 \d+ 篇/) || ['无'])[0]);

  console.log('\n② 点第一张卡片进详情页');
  await evaluate("document.querySelector('a.post-card').click()");
  await sleep(2000);
  const href = await evaluate('location.href');
  const h1 = await evaluate("document.querySelector('h1')?.innerText || ''");
  const bodyLen = await evaluate("document.querySelector('.post-body, article, .prose')?.innerText?.length || 0");
  check('地址变成 #/posts/x', /#\/posts\/\d+/.test(href), href);
  check('标题渲染出来了', h1.length > 0, h1);
  check('正文有内容（不是 404 提示）', bodyLen > 200, `正文字数 ${bodyLen}`);

  console.log('\n③ 直接访问深链 #/posts/2（刷新级加载）');
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${PREFIX}/#/posts/2` });
  await sleep(3500);
  const h1b = await evaluate("document.querySelector('h1')?.innerText || ''");
  const textB = String(await evaluate("document.querySelector('#app').innerText")).slice(0, 120);
  check('深链能直接看到文章标题', h1b.length > 0, h1b || textB.replace(/\n/g, ' | '));
  check('深链没掉进 404 页', !textB.includes('这个地址没有内容') && !textB.includes('请求失败'));

  console.log('\n④ 不带 # 的地址（404.html 兜底）');
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${PREFIX}/posts/3` });
  await sleep(3500);
  const hrefC = await evaluate('location.href');
  const h1c = await evaluate("document.querySelector('h1')?.innerText || ''");
  check('自动纠正到 hash 形式', hrefC.includes('#/posts/3'), hrefC);
  check('纠正后文章正常显示', h1c.length > 0, h1c);

  console.log(failed === 0 ? '\n全部通过 ✅' : `\n有 ${failed} 项失败 ❌`);
} catch (e) {
  console.log('ERR', e.message);
  failed += 1;
} finally {
  try { chrome.kill(); } catch {}
  server.close();
  process.exit(failed === 0 ? 0 : 1);
}
