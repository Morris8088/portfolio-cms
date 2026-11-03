<template>
  <footer class="site-footer">
    <div class="container inner">
      <div class="left">
        <span class="mark">M</span>
        <div class="meta">
          <strong>Morris</strong>
          <span>用 Vue 3 + Express + SQLite 亲手写的作品集</span>
        </div>
      </div>
      <div class="right">
        <a href="https://github.com/Morris8088" target="_blank" rel="noopener">GitHub</a>
        <a href="mailto:1986595241@qq.com">邮箱</a>
        <router-link to="/admin/login">后台</router-link>
      </div>
    </div>
    <div class="container legal">
      © {{ year }} Morris · 本项目源码与文章均为原创练习作品
    </div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear();
</script>

<style scoped>
.site-footer {
  margin-top: 80px;
  padding: 40px 0 32px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mark {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--surface-sunk);
  color: var(--brand);
  font-family: var(--font-serif);
  font-weight: 600;
}

.meta {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}

.meta strong {
  font-size: 14px;
}

.meta span {
  font-size: 12.5px;
  color: var(--ink-faint);
}

.right {
  display: flex;
  gap: 20px;
  font-size: 13.5px;
}

.right a {
  color: var(--ink-soft);
  transition: color 0.18s ease;
}

.right a:hover {
  color: var(--brand);
}

.legal {
  margin-top: 22px;
  font-size: 12px;
  color: var(--ink-faint);
}
</style>
