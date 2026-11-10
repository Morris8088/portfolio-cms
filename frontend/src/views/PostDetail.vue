<template>
  <div class="detail">
    <div class="container narrow">
      <!-- 顶部返回 -->
      <div class="bar">
        <router-link :to="{ path: '/', hash: '#posts' }" class="back">← 返回文章列表</router-link>
        <router-link v-if="auth.isLoggedIn && post" :to="`/admin/posts/${post.id}/edit`" class="edit">
          编辑这篇
        </router-link>
      </div>

      <!-- 加载态 -->
      <el-skeleton v-if="loading" :rows="10" animated class="skeleton" />

      <!-- 出错 / 不存在 -->
      <div v-else-if="error" class="notfound">
        <p class="code">404</p>
        <h2>{{ error }}</h2>
        <p class="hint">可能是链接拼错了，或者这篇文章已经被删除、还没发布。</p>
        <router-link to="/" class="btn">回到首页</router-link>
      </div>

      <!-- 正文 -->
      <article v-else-if="post" class="article">
        <div class="tags">
          <span v-for="t in tags" :key="t" class="tag">{{ t }}</span>
          <span v-if="post.status === 'draft'" class="draft">草稿 · 仅自己可见</span>
        </div>

        <h1 class="title">{{ post.title }}</h1>

        <div class="meta">
          <span>{{ formatDate(post.created_at) }}</span>
          <span class="dot">·</span>
          <span>{{ readingTime(post.content) }} 分钟读完</span>
          <span class="dot">·</span>
          <span>{{ post.views }} 次阅读</span>
        </div>

        <p v-if="post.summary" class="summary">{{ post.summary }}</p>

        <!-- v-html 渲染已消毒的 HTML，样式由全局 .prose 提供 -->
        <div class="prose" v-html="html"></div>

        <!-- 上一篇 / 下一篇 -->
        <nav v-if="hasNeighbors" class="neighbors">
          <router-link
            v-if="post.neighbors.prev"
            :to="`/posts/${post.neighbors.prev.id}`"
            class="neighbor"
          >
            <span class="dir">← 上一篇</span>
            <span class="n-title">{{ post.neighbors.prev.title }}</span>
          </router-link>
          <span v-else class="neighbor empty">已经是最早一篇</span>

          <router-link
            v-if="post.neighbors.next"
            :to="`/posts/${post.neighbors.next.id}`"
            class="neighbor right"
          >
            <span class="dir">下一篇 →</span>
            <span class="n-title">{{ post.neighbors.next.title }}</span>
          </router-link>
          <span v-else class="neighbor right empty">已经是最新一篇</span>
        </nav>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getPost } from '../api';
import { useAuthStore } from '../stores/auth';
import { formatDate } from '../utils/date';
import { parseTags, readingTime } from '../utils/format';
import { renderMarkdown } from '../utils/markdown';

const route = useRoute();
const auth = useAuthStore();

const post = ref(null);
const loading = ref(true);
const error = ref('');
const html = ref('');

const tags = computed(() => (post.value ? parseTags(post.value.tags) : []));
const hasNeighbors = computed(
  () => post.value?.neighbors?.prev || post.value?.neighbors?.next
);

async function load() {
  loading.value = true;
  error.value = '';
  post.value = null;
  html.value = '';

  try {
    const data = await getPost(route.params.id);
    post.value = data;
    html.value = renderMarkdown(data.content);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

// 从 /posts/3 直接跳到 /posts/5 时组件会被复用，onMounted 不会再跑，
// 所以要监听 id 变化
watch(() => route.params.id, load);
</script>

<style scoped>
.detail {
  padding: 36px 0 40px;
}

.narrow {
  max-width: 720px;
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 26px;
  font-size: 13.5px;
}

.back {
  color: var(--ink-soft);
  transition: color 0.18s ease;
}

.back:hover {
  color: var(--brand);
}

.edit {
  color: var(--brand);
}

.skeleton {
  padding: 8px 0;
}

/* ---------- 404 ---------- */
.notfound {
  padding: 60px 0;
  text-align: center;
}

.code {
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.16em;
  color: var(--accent);
  margin: 0 0 12px;
}

.notfound h2 {
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 12px;
}

.hint {
  color: var(--ink-soft);
  font-size: 14px;
  margin: 0 0 26px;
}

.notfound .btn {
  display: inline-flex;
  padding: 9px 20px;
  border-radius: 9px;
  background: var(--brand);
  color: #fff;
  font-size: 14px;
}

/* ---------- 文章 ---------- */
.tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.tag {
  font-size: 11.5px;
  padding: 2px 9px;
  border-radius: 5px;
  background: var(--brand-soft);
  color: var(--brand-deep);
}

.draft {
  font-size: 11.5px;
  padding: 2px 9px;
  border-radius: 5px;
  background: #fdf1e7;
  color: var(--accent);
}

.title {
  font-family: var(--font-serif);
  font-size: 34px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.015em;
  margin: 0 0 16px;
  color: var(--ink);
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: var(--ink-faint);
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 26px;
}

.dot {
  opacity: 0.5;
}

.summary {
  margin: 0 0 28px;
  padding: 16px 18px;
  font-size: 14.5px;
  line-height: 1.8;
  color: #3c4a46;
  background: var(--brand-soft);
  border-left: 3px solid var(--brand);
  border-radius: 0 8px 8px 0;
}

/* ---------- 上下篇 ---------- */
.neighbors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 56px;
  padding-top: 26px;
  border-top: 1px solid var(--line);
}

.neighbor {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  transition: all 0.2s ease;
}

.neighbor:hover {
  border-color: var(--brand);
  transform: translateY(-2px);
}

.neighbor.right {
  text-align: right;
}

.neighbor.empty {
  color: var(--ink-faint);
  font-size: 12.5px;
  justify-content: center;
  background: transparent;
  border-style: dashed;
}

.neighbor.empty:hover {
  transform: none;
  border-color: var(--line);
}

.dir {
  font-size: 11.5px;
  color: var(--brand);
}

.n-title {
  font-size: 13.5px;
  color: var(--ink);
  line-height: 1.5;
}

@media (max-width: 640px) {
  .title {
    font-size: 25px;
  }
  .neighbors {
    grid-template-columns: 1fr;
  }
  .neighbor.right {
    text-align: left;
  }
  .neighbor.empty {
    display: none;
  }
}
</style>
