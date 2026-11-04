<template>
  <div class="page container">
    <p class="code">404</p>
    <h1>这个地址没有内容</h1>
    <p class="hint">链接可能拼错了，也可能是我把它删了。</p>

    <!-- Demo 部署在 GitHub Pages 上，用的是 hash 路由（地址里带 #）。
         如果访问的是 /portfolio-cms/projects 这种不带 # 的地址，
         静态服务器会直接 404，页面根本加载不出来。
         这里把正确地址显示出来，省得自己拼。 -->
    <p v-if="isDemo" class="demo-hint">
      这个站点的正确地址长这样：<code>{{ homeUrl }}</code>
      <br />
      地址里的 <code>#</code> 不能省——它是前端路由的一部分，不是页面锚点。
    </p>

    <div class="actions">
      <router-link to="/" class="btn primary">回首页</router-link>
      <router-link to="/projects" class="btn">看作品</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { IS_DEMO } from '../api';

const isDemo = IS_DEMO;
// 用真实站点地址拼出来，不用写死域名
const homeUrl = computed(() => `${window.location.origin}${import.meta.env.BASE_URL}#/`);
</script>

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

.demo-hint {
  margin: 0 0 28px;
  padding: 14px 16px;
  font-size: 13px;
  line-height: 1.9;
  color: var(--ink-soft);
  background: var(--brand-soft);
  border-radius: 9px;
  text-align: left;
  word-break: break-all;
}

.demo-hint code {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--brand-deep);
  background: rgba(255, 255, 255, 0.7);
  padding: 1px 5px;
  border-radius: 4px;
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
