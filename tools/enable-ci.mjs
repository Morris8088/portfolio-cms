/**
 * 把 tools/ci.yml 正式启用为 .github/workflows/ci.yml
 *
 * 背景：GitHub 有个硬规则——Personal Access Token 必须带 workflow 权限
 * 才能创建或修改 .github/workflows/ 下的文件，只勾 repo 会被拒：
 *   refusing to allow a Personal Access Token to create or update workflow
 *   '.github/workflows/ci.yml' without 'workflow' scope
 *
 * 所以 CI 配置先以 tools/ci.yml 的形式放在仓库里。等 token 补上 workflow 权限后，
 * 在仓库根目录执行：
 *   node tools/enable-ci.mjs <你的token>
 * 它会把这个文件搬到 .github/workflows/ci.yml 并推送，Actions 立刻开始跑。
 * 跑完记得把 README 第 3-4 行的注释去掉、删掉第 5 行的静态 tests 徽章。
 *
 * 更省事的替代方案（不需要新 token）：打开
 *   https://github.com/Morris8088/portfolio-cms/blob/main/tools/ci.yml
 * 复制内容，在网页上新建文件 .github/workflows/ci.yml 粘贴提交。
 * 网页操作走的是你的登录会话，不受 PAT 权限限制。
 */
import { readFileSync } from 'node:fs';

const token = process.argv[2];
if (!token) {
  console.error('用法: node tools/enable-ci.mjs <github-token>');
  process.exit(1);
}

const API = 'https://api.github.com/repos/Morris8088/portfolio-cms';
const baseHeaders = {
  Authorization: `token ${token}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
  'User-Agent': 'portfolio-cms-enable-ci',
};

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...baseHeaders, ...(init.headers || {}) },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const hint =
      res.status === 404
        ? '（404 通常是 token 没有 workflow 权限，GitHub 用 404 表示「你没资格碰这个路径」）'
        : '';
    throw new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${JSON.stringify(data)} ${hint}`);
  }
  return data;
}

const main = await api('/git/ref/heads/main');
const parentSha = main.object.sha;
const parent = await api(`/git/commits/${parentSha}`);

const content = readFileSync(new URL('./ci.yml', import.meta.url), 'utf8');
const blob = await api('/git/blobs', {
  method: 'POST',
  body: JSON.stringify({ content, encoding: 'utf-8' }),
});

// 同一棵树里「加 .github/workflows/ci.yml」+「删 tools/ci.yml」一起提交
const tree = await api('/git/trees', {
  method: 'POST',
  body: JSON.stringify({
    base_tree: parent.tree.sha,
    tree: [
      { path: '.github/workflows/ci.yml', mode: '100644', type: 'blob', sha: blob.sha },
      { path: 'tools/ci.yml', mode: '100644', type: 'blob', sha: null },
    ],
  }),
});

const commit = await api('/git/commits', {
  method: 'POST',
  body: JSON.stringify({
    message: '启用 CI：.github/workflows/ci.yml\n\n后端接口测试 + 前端单测与构建，push/PR 触发',
    tree: tree.sha,
    parents: [parentSha],
  }),
});

await api('/git/refs/heads/main', {
  method: 'PATCH',
  body: JSON.stringify({ sha: commit.sha }),
});

console.log('✅ 已启用 CI');
console.log(`提交：https://github.com/Morris8088/portfolio-cms/commit/${commit.sha}`);
console.log('运行记录：https://github.com/Morris8088/portfolio-cms/actions');
console.log('下一步：README 第 3-4 行取消注释启用徽章，并删掉第 5 行的静态 tests 徽章。');
