<template>
  <div class="home">
    <!-- ============ 一、头图区 ============ -->
    <section class="hero container rise">
      <div class="hero-text">
        <p class="eyebrow">Portfolio &amp; Blog</p>
        <h1>
          把学到的东西，<br />
          写成<span class="em">能跑起来</span>的作品。
        </h1>
        <p class="lede">
          自学前端出身，正在补后端和测试。这里放着我的项目、
          踩过的坑，以及一些还没想明白的问题。写下来，是为了下次不再踩。
        </p>

        <div class="hero-actions">
          <router-link to="/projects" class="btn primary">看看作品</router-link>
          <!-- 这里不能写「href 指向 #posts 的普通 a 标签」。
               Demo 用的是 hash 路由，地址栏里 # 后面整段都会被 Vue Router
               当成"路由路径"：#posts 会被规范化成 #/posts，
               而路由表里只有 /posts/:id，没有 /posts —— 于是直接进 404 页。
               想滚到本页的文章区，就只动滚动条、别去碰地址栏。 -->
          <button type="button" class="btn" @click="scrollToPosts">读读文章</button>
        </div>

        <p class="stack">
          Vue 3 · Vite · Pinia · Express · SQLite · Vitest
        </p>
      </div>

      <!-- 侧边小卡：告诉访客"这个人在做什么"，比一堆图标有温度 -->
      <aside class="now">
        <span class="now-label">Now</span>
        <ul>
          <li>把 JS 和 Vue 的基础补齐</li>
          <li>让这个站从「能跑」到「能讲」</li>
          <li>给这个站补更多接口用例</li>
        </ul>
        <span class="now-foot">最近更新 {{ lastUpdated }}</span>
      </aside>
    </section>

    <!-- ============ 二、作品 ============ -->
    <section class="container block">
      <div class="section-head">
        <h2>作品</h2>
        <router-link to="/projects" class="more">全部作品 →</router-link>
      </div>

      <div v-if="projectsLoading" class="grid">
        <el-skeleton v-for="i in 3" :key="i" :rows="4" animated />
      </div>
      <div v-else class="grid" :class="{ single: projects.length === 1 }">
        <ProjectCard
          v-for="(p, i) in projects.slice(0, 3)"
          :key="p.id"
          :project="p"
          :index="i"
        />
      </div>
    </section>

    <!-- ============ 三、文章 ============ -->
    <section id="posts" class="container block">
      <div class="section-head">
        <h2>文章</h2>
        <span class="count">共 {{ total }} 篇</span>
      </div>

      <!-- 搜索 + 排序 -->
      <div class="toolbar">
        <el-input
          v-model="keyword"
          placeholder="搜索标题、正文或标签…"
          clearable
          class="search"
        >
          <template #prefix>
            <span class="search-icon">⌕</span>
          </template>
        </el-input>

        <el-select v-model="sort" class="sort">
          <el-option label="最新发布" value="newest" />
          <el-option label="阅读最多" value="popular" />
          <el-option label="最早发布" value="oldest" />
        </el-select>
      </div>

      <!-- 标签筛选：点一下筛选，再点一下取消 -->
      <div v-if="tags.length" class="tags">
        <button
          class="tag-btn"
          :class="{ active: !activeTag }"
          type="button"
          @click="selectTag('')"
        >
          全部
        </button>
        <button
          v-for="t in tags"
          :key="t.name"
          class="tag-btn"
          :class="{ active: activeTag === t.name }"
          type="button"
          @click="selectTag(t.name)"
        >
          {{ t.name }}<span class="tag-count">{{ t.count }}</span>
        </button>
      </div>

      <!-- 列表三态：加载 / 出错 / 空 -->
      <div v-if="loading" class="list">
        <el-skeleton v-for="i in 3" :key="i" :rows="2" animated />
      </div>

      <el-alert
        v-else-if="error"
        :title="error"
        type="error"
        show-icon
        :closable="false"
        :description="
          IS_DEMO
            ? '这是纯静态演示站，数据由浏览器本地模拟，刷新一次页面即可'
            : '确认后端是否在 3001 端口运行：cd backend && npm run dev'
        "
      />

      <div v-else-if="posts.length === 0" class="empty">
        <p>没有找到匹配的文章</p>
        <button v-if="keyword || activeTag" class="btn" type="button" @click="resetFilters">
          清空筛选条件
        </button>
      </div>

      <div v-else class="list">
        <PostCard v-for="p in posts" :key="p.id" :post="p" />
      </div>

      <!-- 分页：只有一页时不显示 -->
      <div v-if="totalPages > 1" class="pager">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          background
          hide-on-single-page
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import PostCard from '../components/PostCard.vue';
import ProjectCard from '../components/ProjectCard.vue';
import { getPosts, getTags, getProjects, IS_DEMO } from '../api';
import { formatDateShort } from '../utils/date';

// ---------- 状态 ----------
const posts = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 6;
const totalPages = ref(1);

const keyword = ref('');
const activeTag = ref('');
const sort = ref('newest');

const loading = ref(true);
const error = ref('');

const tags = ref([]);
const projects = ref([]);
const projectsLoading = ref(true);

const lastUpdated = computed(() => {
  if (!posts.value.length) return '—';
  return formatDateShort(posts.value[0].created_at);
});

// ---------- 页面内滚动 ----------
// 只滚到 #posts 区块，不改变 location.hash。
// 原因见模板里「读读文章」按钮上方的注释：hash 路由下改 hash = 换路由。
function scrollToPosts() {
  document.getElementById('posts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- 加载列表 ----------
async function loadPosts() {
  loading.value = true;
  error.value = '';
  try {
    const data = await getPosts({
      q: keyword.value.trim(),
      tag: activeTag.value,
      sort: sort.value,
      page: page.value,
      pageSize
    });
    posts.value = data.items;
    total.value = data.total;
    totalPages.value = data.totalPages;

    // 边界保护：删到只剩 1 页、或搜索后页码超界时，回退到第一页
    if (page.value > data.totalPages) {
      page.value = 1;
      await loadPosts();
    }
  } catch (e) {
    error.value = e.message;
    posts.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

// 搜索防抖：用户每敲一个字都请求一次太浪费，
// 停手 300ms 才真正发请求
let timer = null;
watch(keyword, () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    page.value = 1;
    loadPosts();
  }, 300);
});

// 换排序、换页码立即重新加载
watch([sort, page], () => loadPosts());

function selectTag(name) {
  activeTag.value = activeTag.value === name ? '' : name;
  page.value = 1;
  loadPosts();
}

function resetFilters() {
  keyword.value = '';
  activeTag.value = '';
  page.value = 1;
  loadPosts();
}

// ---------- 初始化 ----------
onMounted(async () => {
  loadPosts();

  // 标签和作品与列表互不影响，可以并行请求
  try {
    tags.value = await getTags();
  } catch {
    tags.value = []; // 标签加载失败不影响主流程，静默降级
  }

  try {
    projects.value = await getProjects();
  } catch {
    projects.value = [];
  } finally {
    projectsLoading.value = false;
  }
});
</script>

<style scoped>
/* ---------- 头图 ---------- */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 48px;
  align-items: center;
  padding-top: 72px;
  padding-bottom: 24px;
}

.hero h1 {
  font-family: var(--font-serif);
  font-size: 44px;
  font-weight: 600;
  line-height: 1.28;
  letter-spacing: -0.015em;
  margin: 16px 0 18px;
  color: var(--ink);
}

.hero h1 .em {
  position: relative;
  color: var(--brand);
  white-space: nowrap;
}

/* 手写感的下划线：一条低透明度的粗线压在文字下面 */
.hero h1 .em::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2px;
  height: 8px;
  background: rgba(31, 111, 92, 0.14);
  border-radius: 2px;
  z-index: -1;
}

.lede {
  max-width: 480px;
  margin: 0 0 28px;
  font-size: 15px;
  line-height: 1.85;
  color: var(--ink-soft);
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 26px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 22px;
  border-radius: 9px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  border-color: var(--brand);
  color: var(--brand);
}

.btn.primary {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
  box-shadow: 0 2px 10px rgba(31, 111, 92, 0.22);
}

.btn.primary:hover {
  background: var(--brand-deep);
  color: #fff;
  transform: translateY(-1px);
}

.stack {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

/* ---------- Now 卡 ---------- */
.now {
  padding: 22px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.now-label {
  display: inline-block;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 600;
  margin-bottom: 12px;
}

.now ul {
  margin: 0 0 16px;
  padding-left: 16px;
  font-size: 13.5px;
  line-height: 1.9;
  color: var(--ink-soft);
}

.now li::marker {
  color: var(--brand);
}

.now-foot {
  font-size: 11.5px;
  color: var(--ink-faint);
  padding-top: 12px;
  border-top: 1px dashed var(--line);
  display: block;
}

/* ---------- 区块 ---------- */
.block {
  padding-top: 56px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

/* 只有一个作品时收窄，避免一张卡拉满 1040px */
.grid.single {
  grid-template-columns: minmax(0, 1fr);
  max-width: 680px;
}

.count {
  font-size: 13px;
  color: var(--ink-faint);
}

/* ---------- 工具栏 ---------- */
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}

.search {
  flex: 1;
  max-width: 420px;
}

.search-icon {
  font-size: 16px;
  color: var(--ink-faint);
  line-height: 1;
}

.sort {
  width: 132px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 22px;
}

.tag-btn {
  font: inherit;
  font-size: 12.5px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-soft);
  cursor: pointer;
  transition: all 0.18s ease;
}

.tag-btn:hover {
  border-color: var(--brand);
  color: var(--brand);
}

.tag-btn.active {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}

.tag-count {
  margin-left: 5px;
  opacity: 0.6;
  font-size: 11px;
}

/* ---------- 列表 ---------- */
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 120px;
}

.empty {
  padding: 56px 0;
  text-align: center;
  color: var(--ink-faint);
}

.empty p {
  margin: 0 0 16px;
  font-size: 14px;
}

.pager {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

/* ---------- 响应式 ---------- */
@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 28px;
    padding-top: 48px;
  }
  .hero h1 {
    font-size: 34px;
  }
  .now {
    display: none;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .hero h1 {
    font-size: 27px;
  }
  .toolbar {
    flex-direction: column;
  }
  .search {
    max-width: none;
  }
  .sort {
    width: 100%;
  }
}
</style>
