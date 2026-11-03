<template>
  <div class="admin container">
    <!-- 顶部 -->
    <div class="head">
      <div>
        <p class="eyebrow">Admin</p>
        <h1>内容管理</h1>
        <p class="who">
          已登录：{{ auth.displayName }}
        </p>
      </div>
      <div class="head-actions">
        <router-link to="/" class="ghost">查看站点</router-link>
        <router-link to="/admin/posts/new" class="primary">+ 写文章</router-link>
      </div>
    </div>

    <!-- 统计卡 -->
    <div class="stats">
      <div v-for="s in statCards" :key="s.label" class="stat">
        <span class="stat-label">{{ s.label }}</span>
        <strong class="stat-value">{{ s.value }}</strong>
        <span class="stat-note">{{ s.note }}</span>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="toolbar">
      <el-radio-group v-model="status" @change="reload">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="published">已发布</el-radio-button>
        <el-radio-button value="draft">草稿</el-radio-button>
      </el-radio-group>

      <el-input
        v-model="keyword"
        placeholder="搜索标题或标签"
        clearable
        class="search"
        @keyup.enter="reload"
        @clear="reload"
      />
      <el-button @click="reload">搜索</el-button>
    </div>

    <!-- 表格 -->
    <div class="table-wrap">
      <el-table
        v-loading="loading"
        :data="posts"
        style="width: 100%"
        :header-cell-style="{ background: '#f2efe9', color: '#545e68', fontWeight: '500' }"
        empty-text="没有文章，点右上角「写文章」开始"
      >
        <el-table-column label="标题" min-width="280">
          <template #default="{ row }">
            <div class="cell-title">
              <span class="t">{{ row.title }}</span>
              <span class="slug">/posts/{{ row.id }} · {{ row.slug }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="95">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small" effect="light">
              {{ row.status === 'published' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="标签" min-width="150">
          <template #default="{ row }">
            <span class="tag-list">
              <span v-for="t in parseTags(row.tags)" :key="t" class="tag">{{ t }}</span>
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="views" label="阅读" width="80" align="right" />

        <el-table-column label="更新时间" width="120">
          <template #default="{ row }">
            <span class="time">{{ formatDateShort(row.updated_at) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="190" align="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="edit(row)">编辑</el-button>
            <el-button link type="warning" @click="toggleStatus(row)">
              {{ row.status === 'published' ? '转草稿' : '发布' }}
            </el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pager">
      <span class="pager-info">共 {{ total }} 篇</span>
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        background
        hide-on-single-page
        @current-change="loadPosts"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getPosts, updatePost, deletePost, getStats } from '../../api';
import { useAuthStore } from '../../stores/auth';
import { parseTags, formatNumber } from '../../utils/format';
import { formatDateShort } from '../../utils/date';

const router = useRouter();
const auth = useAuthStore();

const posts = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 8;
const status = ref('');
const keyword = ref('');
const loading = ref(true);
const stats = ref({ posts: { total: 0, published: 0, draft: 0, views: 0 }, projects: 0 });

const statCards = computed(() => [
  { label: '文章总数', value: stats.value.posts.total, note: '含草稿' },
  { label: '已发布', value: stats.value.posts.published, note: '前台可见' },
  { label: '草稿', value: stats.value.posts.draft, note: '仅自己可见' },
  { label: '总阅读', value: formatNumber(stats.value.posts.views), note: '所有文章累计' }
]);

async function loadPosts() {
  loading.value = true;
  try {
    const data = await getPosts({
      status: status.value,
      q: keyword.value.trim(),
      page: page.value,
      pageSize,
      sort: 'newest'
    });
    posts.value = data.items;
    total.value = data.total;
  } catch (e) {
    ElMessage.error(e.message);
  } finally {
    loading.value = false;
  }
}

async function loadStats() {
  try {
    stats.value = await getStats();
  } catch {
    /* 统计失败不影响主表 */
  }
}

function reload() {
  page.value = 1;
  loadPosts();
}

function edit(row) {
  router.push(`/admin/posts/${row.id}/edit`);
}

async function toggleStatus(row) {
  const next = row.status === 'published' ? 'draft' : 'published';
  try {
    await updatePost(row.id, { status: next });
    ElMessage.success(next === 'published' ? '已发布' : '已转为草稿');
    // 本地直接改，省一次列表请求；真实项目里也可以重新拉列表保证一致
    row.status = next;
    loadStats();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(
      `确定删除《${row.title}》？删除后无法恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    );
  } catch {
    return; // 用户点了取消
  }

  try {
    await deletePost(row.id);
    ElMessage.success('已删除');
    // 删掉当前页最后一条时，页码要回退，否则会看到空列表
    if (posts.value.length === 1 && page.value > 1) page.value -= 1;
    loadPosts();
    loadStats();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

onMounted(() => {
  loadPosts();
  loadStats();
});
</script>

<style scoped>
.admin {
  padding-top: 48px;
  padding-bottom: 40px;
  max-width: 1040px;
}

.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}

.head h1 {
  font-family: var(--font-serif);
  font-size: 30px;
  font-weight: 600;
  margin: 12px 0 4px;
}

.who {
  margin: 0;
  font-size: 13px;
  color: var(--ink-faint);
}

.head-actions {
  display: flex;
  gap: 10px;
}

.ghost,
.primary {
  padding: 9px 18px;
  border-radius: 9px;
  font-size: 13.5px;
  border: 1px solid var(--line-strong);
  color: var(--ink-soft);
  background: var(--surface);
  transition: all 0.18s ease;
}

.ghost:hover {
  border-color: var(--brand);
  color: var(--brand);
}

.primary {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}

.primary:hover {
  background: var(--brand-deep);
}

/* ---------- 统计 ---------- */
.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 28px;
}

.stat {
  padding: 18px 20px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--ink-faint);
}

.stat-value {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--ink);
}

.stat-note {
  font-size: 11.5px;
  color: var(--ink-faint);
}

/* ---------- 工具栏 ---------- */
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.search {
  width: 240px;
  margin-left: auto;
}

/* ---------- 表格 ---------- */
.table-wrap {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  min-height: 160px;
}

.cell-title {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.cell-title .t {
  font-size: 14px;
  color: var(--ink);
  font-weight: 500;
}

.cell-title .slug {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-faint);
}

.tag-list {
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tag {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 4px;
  background: var(--surface-sunk);
  color: var(--ink-soft);
}

.time {
  font-size: 12.5px;
  color: var(--ink-faint);
}

/* ---------- 分页 ---------- */
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
}

.pager-info {
  font-size: 12.5px;
  color: var(--ink-faint);
}

@media (max-width: 800px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .head {
    flex-direction: column;
    align-items: flex-start;
  }
  .search {
    width: 100%;
    margin-left: 0;
  }
}
</style>
