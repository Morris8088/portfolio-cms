<template>
  <div class="page">
    <!-- 顶部标题区 -->
    <header class="hero">
      <h1>我的作品集</h1>
      <p class="sub">Vue 3 + Express + SQLite 亲手搭的全栈站点</p>
    </header>

    <!-- 筛选栏：切换 全部 / 已发布 / 草稿 -->
    <div class="toolbar">
      <el-radio-group v-model="filter" @change="load">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="published">已发布</el-radio-button>
        <el-radio-button value="draft">草稿</el-radio-button>
      </el-radio-group>
      <span class="count" v-if="!loading && !error">共 {{ posts.length }} 篇</span>
    </div>

    <!-- 加载中：骨架屏占位，避免白屏 -->
    <el-skeleton v-if="loading" :rows="4" animated />

    <!-- 出错：把后端或网络的问题显示出来，而不是白屏 -->
    <el-alert
      v-else-if="error"
      :title="error"
      type="error"
      show-icon
      :closable="false"
    />

    <!-- 空数据 -->
    <el-empty v-else-if="posts.length === 0" description="还没有文章，去后端造几条试试" />

    <!-- 文章列表 -->
    <div v-else class="list">
      <el-card
        v-for="p in posts"
        :key="p.id"
        class="card"
        shadow="hover"
        @click="goDetail(p.id)"
      >
        <h2 class="title">{{ p.title }}</h2>
        <p class="summary">{{ p.summary || '（暂无摘要）' }}</p>
        <div class="meta">
          <el-tag size="small" :type="p.status === 'published' ? 'success' : 'info'">
            {{ p.status === 'published' ? '已发布' : '草稿' }}
          </el-tag>
          <span class="time">{{ formatDate(p.created_at) }}</span>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
// ============================================================
// script setup：Vue 3 的写法，这里定义的东西模板里能直接用
// ============================================================
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getPosts } from '../api';
import { formatDate } from '../utils/date';

const router = useRouter();

// ref() 造"会变的数据"。值存在 .value 里；
// 但模板里写 {{ posts }} 时不用 .value，Vue 会自动拆
const posts = ref([]);      // 文章数组
const loading = ref(true);  // 是否正在加载
const error = ref('');      // 错误信息，空字符串表示没错误
const filter = ref('');     // 当前筛选：'' 全部 / 'published' / 'draft'

// 加载数据：筛选切换、页面首次进入都调这个函数
async function load() {
  loading.value = true;
  error.value = '';
  try {
    // getPosts 是我们自己封装的函数，直接返回文章数组
    posts.value = await getPosts(filter.value);
  } catch (e) {
    error.value = e.message; // 拦截器已经把错误翻译成人话了
    posts.value = [];
  } finally {
    // 不管成功失败都要关掉 loading，否则骨架屏一直转
    loading.value = false;
  }
}

// 点击卡片跳到详情页
function goDetail(id) {
  router.push(`/posts/${id}`);
}

// 组件挂载完成后自动执行一次
onMounted(load);
</script>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

.hero {
  text-align: center;
  margin-bottom: 32px;
}

.hero h1 {
  font-size: 30px;
  font-weight: 500;
  margin: 0 0 8px;
  color: var(--el-text-color-primary);
}

.hero .sub {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
}

.card .title {
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 8px;
  color: var(--el-text-color-primary);
}

.card .summary {
  font-size: 14px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
  margin: 0 0 14px;
}

.card .meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card .time {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
