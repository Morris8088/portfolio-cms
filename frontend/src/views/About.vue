<template>
  <div class="page container">
    <div class="head">
      <p class="eyebrow">About</p>
      <h1>关于我</h1>
    </div>

    <div class="layout">
      <div class="main">
        <p class="lead">
          自学前端，从「能做出页面」到「能说清为什么这么做」，
          现在正把后端和测试这一块补齐。
        </p>

        <h2>为什么做这个站</h2>
        <p>
          投简历时最尴尬的情况是：作品只能截图，问一句「这里为什么这么写」就答不上来。
          所以我把学习和踩坑的过程都写进这个站——代码在 GitHub，文章在这里，
          两者能对上，才好聊。
        </p>

        <h2>技能</h2>
        <div class="skills">
          <div v-for="group in skillGroups" :key="group.name" class="skill-group">
            <h3>{{ group.name }}</h3>
            <div class="chips">
              <span v-for="item in group.items" :key="item" class="chip">{{ item }}</span>
            </div>
          </div>
        </div>

        <h2>目前在补</h2>
        <ul class="todo">
          <li>JavaScript 语言本身：作用域、闭包、原型链</li>
          <li>Vue 3 响应式原理：为什么改了数据视图就变了</li>
          <li>后端：错误处理、事务、索引与查询优化</li>
          <li>测试：接口用例设计、E2E 稳定性</li>
        </ul>
      </div>

      <aside class="side">
        <div class="card">
          <h3>联系方式</h3>
          <a href="mailto:1986595241@qq.com">1986595241@qq.com</a>
          <a href="https://github.com/Morris8088" target="_blank" rel="noopener">
            github.com/Morris8088
          </a>
        </div>

        <div class="card">
          <h3>这个站的构成</h3>
          <ul class="facts">
            <li><span>前端</span>Vue 3 + Vite</li>
            <li><span>后端</span>Express + SQLite</li>
            <li><span>鉴权</span>手写 HMAC 令牌</li>
            <li><span>测试</span>36 条接口 + 26 条单测</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
const skillGroups = [
  { name: '前端', items: ['Vue 3', 'Vite', 'Pinia', 'Vue Router', 'Element Plus', 'Axios', 'CSS'] },
  { name: '后端', items: ['Node.js', 'Express', 'SQLite', 'RESTful', '鉴权'] },
  { name: '测试', items: ['Vitest', 'pytest', 'Playwright', 'GitHub Actions'] },
  { name: '工具', items: ['Git', 'GitHub', 'VS Code', 'Postman / REST Client'] }
];
</script>

<style scoped>
.page {
  padding-top: 56px;
  max-width: 1040px;
}

.head h1 {
  font-family: var(--font-serif);
  font-size: 36px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 14px 0 0;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 56px;
  margin-top: 28px;
}

.lead {
  font-family: var(--font-serif);
  font-size: 21px;
  line-height: 1.7;
  color: var(--ink);
  margin: 0 0 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--line);
}

.main h2 {
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 600;
  margin: 32px 0 12px;
}

.main p {
  margin: 0 0 14px;
  font-size: 14.5px;
  line-height: 1.9;
  color: var(--ink-soft);
}

.skill-group {
  margin-bottom: 16px;
}

.skill-group h3 {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--ink-faint);
  text-transform: uppercase;
  margin: 0 0 8px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--ink-soft);
  font-family: var(--font-mono);
}

.todo {
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
  line-height: 2;
  color: var(--ink-soft);
}

.todo li::marker {
  color: var(--brand);
}

.side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  padding: 20px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.card h3 {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.card a {
  display: block;
  font-size: 13.5px;
  color: var(--brand);
  margin-bottom: 8px;
  word-break: break-all;
}

.facts {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
}

.facts li {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px dashed var(--line);
  color: var(--ink);
}

.facts li:last-child {
  border-bottom: none;
}

.facts span {
  color: var(--ink-faint);
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .head h1 {
    font-size: 28px;
  }
}
</style>
