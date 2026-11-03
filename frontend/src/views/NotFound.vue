<template>
  <div class="page container">
    <p class="code">404</p>
    <h1>这个地址没有内容</h1>
    <p class="hint">链接可能拼错了，也可能是我把它删了。</p>
    <div class="actions">
      <router-link to="/" class="btn primary">回首页</router-link>
      <router-link to="/projects" class="btn">看作品</router-link>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 96px 24px;
  text-align: center;
  max-width: 560px;
}

.code {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  color: var(--accent);
  margin: 0 0 14px;
}

h1 {
  font-family: var(--font-serif);
  font-size: 30px;
  font-weight: 600;
  margin: 0 0 12px;
}

.hint {
  color: var(--ink-soft);
  font-size: 14px;
  margin: 0 0 28px;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  padding: 9px 20px;
  border-radius: 9px;
  border: 1px solid var(--line-strong);
  font-size: 14px;
  color: var(--ink);
}

.btn.primary {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
</style>
