<template>
  <header class="site-header">
    <div class="container inner">
      <!-- 左侧：标识 -->
      <router-link to="/" class="brand">
        <span class="mark">M</span>
        <span class="text">
          <strong>Morris</strong>
          <small>前端 / 测试开发</small>
        </span>
      </router-link>

      <!-- 中间：导航 -->
      <nav class="nav">
        <router-link to="/" class="link">首页</router-link>
        <router-link to="/projects" class="link">作品</router-link>
        <router-link to="/about" class="link">关于</router-link>
      </nav>

      <!-- 右侧：后台入口，登录后变成"后台 / 退出" -->
      <div class="actions">
        <template v-if="auth.isLoggedIn">
          <router-link to="/admin" class="link admin-link">后台</router-link>
          <button class="ghost" type="button" @click="handleLogout">退出</button>
        </template>
        <router-link v-else to="/admin/login" class="ghost">后台登录</router-link>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

function handleLogout() {
  auth.logout();
  // 退出后如果正停在后台页面，送回首页
  if (router.currentRoute.value.path.startsWith('/admin')) {
    router.push('/');
  }
}
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(247, 245, 241, 0.82);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--line);
}

.inner {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 28px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.mark {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--brand);
  color: #fff;
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.brand .text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand strong {
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.brand small {
  font-size: 11px;
  color: var(--ink-faint);
  letter-spacing: 0.04em;
}

.nav {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.link {
  padding: 6px 12px;
  border-radius: 7px;
  font-size: 14px;
  color: var(--ink-soft);
  transition: background 0.18s ease, color 0.18s ease;
}

.link:hover {
  background: var(--surface-sunk);
  color: var(--ink);
}

/* router-link 自动加的当前页类名 */
.link.router-link-exact-active {
  color: var(--brand);
  background: var(--brand-soft);
  font-weight: 500;
}

.actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-link {
  display: none;
}

.ghost {
  font: inherit;
  font-size: 13.5px;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid var(--line-strong);
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}

.ghost:hover {
  border-color: var(--brand);
  color: var(--brand);
  background: var(--brand-soft);
}

@media (min-width: 720px) {
  .admin-link {
    display: inline-flex;
    padding: 6px 12px;
    font-size: 14px;
  }
}

@media (max-width: 560px) {
  .brand .text small {
    display: none;
  }
  .inner {
    gap: 12px;
  }
  .nav {
    margin-left: 0;
  }
  .link {
    padding: 6px 8px;
    font-size: 13.5px;
  }
}
</style>
