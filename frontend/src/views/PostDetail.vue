<template>
  <div class="page">
    <!-- 返回按钮 -->
    <div class="bar">
      <el-button text @click="goHome">← 返回列表</el-button>
    </div>

    <!-- 加载中 -->
    <el-skeleton v-if="loading" :rows="8" animated />

    <!-- 出错（含 404 文章不存在） -->
    <el-alert
      v-else-if="error"
      :title="error"
      type="error"
      show-icon
      :closable="false"
    />

    <!-- 正文 -->
    <article v-else-if="post" class="article">
      <h1 class="title">{{ post.title }}</h1>

      <div class="meta">
        <el-tag size="small" :type="post.status === 'published' ? 'success' : 'info'">
          {{ post.status === 'published' ? '已发布' : '草稿' }}
        </el-tag>
        <span class="time">{{ formatDate(post.created_at) }}</span>
      </div>

      <p v-if="post.summary" class="summary">{{ post.summary }}</p>

      <!-- white-space: pre-wrap 会在样式里设置，用来保留正文里的换行 -->
      <div class="content">{{ post.content }}</div>
    </article>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getPost } from '../api';
import { formatDate } from '../utils/date';

// useRoute() 拿到"当前路由信息"，里面 params.id 就是地址 /posts/2 里的 2
const route = useRoute();
const router = useRouter();

const post = ref(null);
const loading = ref(true);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  post.value = null;
  try {
    // route.params.id 永远是字符串 '2'，后端会自己转数字，这里不用管
    post.value = await getPost(route.params.id);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function goHome() {
  router.push('/');
}

onMounted(load);

// 如果 url 从 /posts/1 直接跳到 /posts/2，组件会被复用而不会重新挂载，
// 这时 onMounted 不会再执行，所以要监听 id 变化手动重新加载
watch(() => route.params.id, load);
</script>

<style scoped>
.page {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 24px 96px;
}

.bar {
  margin-bottom: 8px;
}

.article .title {
  font-size: 28px;
  font-weight: 500;
  line-height: 1.4;
  margin: 8px 0 16px;
  color: var(--el-text-color-primary);
}

.article .meta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 24px;
}

.article .time {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.article .summary {
  font-size: 15px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border-left: 3px solid var(--el-color-primary-light-5);
  padding: 12px 16px;
  margin: 0 0 24px;
  border-radius: 0 6px 6px 0;
}

.article .content {
  font-size: 15px;
  line-height: 1.9;
  color: var(--el-text-color-primary);
  /* 保留正文里的换行和空格，否则多段文字会挤成一大坨 */
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
