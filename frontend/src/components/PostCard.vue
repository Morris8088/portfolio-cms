<template>
  <!-- 整张卡片是 router-link：语义正确，也支持右键新窗口打开 -->
  <router-link :to="`/posts/${post.id}`" class="post-card">
    <!-- 没有封面图时，用标题生成稳定渐变 + 首字，比空白占位好看 -->
    <div class="thumb" :style="{ background: gradientFor(post.slug || post.id) }">
      <span>{{ initialOf(post.title) }}</span>
    </div>

    <div class="body">
      <h3 class="title">{{ post.title }}</h3>
      <p class="summary">{{ post.summary || '（暂无摘要）' }}</p>

      <div class="meta">
        <span class="date">{{ formatDate(post.created_at) }}</span>
        <span class="dot">·</span>
        <span>{{ readingTime(post.content) }} 分钟读完</span>
        <span class="dot">·</span>
        <span>{{ post.views }} 次阅读</span>

        <span class="tags">
          <span v-for="tag in parseTags(post.tags).slice(0, 2)" :key="tag" class="tag">
            {{ tag }}
          </span>
        </span>
      </div>
    </div>

    <!-- 草稿角标：只在后台列表里会看到（公开列表后端已过滤） -->
    <span v-if="post.status === 'draft'" class="draft">草稿</span>
  </router-link>
</template>

<script setup>
import { formatDate } from '../utils/date';
import { parseTags, readingTime, gradientFor, initialOf } from '../utils/format';

defineProps({
  post: { type: Object, required: true }
});
</script>

<style scoped>
.post-card {
  position: relative;
  display: flex;
  gap: 18px;
  padding: 18px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.2s ease, border-color 0.2s ease;
}

.post-card:hover {
  transform: translateY(-2px);
  border-color: var(--line-strong);
  box-shadow: var(--shadow);
}

.thumb {
  flex-shrink: 0;
  width: 92px;
  height: 92px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.thumb span {
  font-family: var(--font-serif);
  font-size: 34px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}

.body {
  min-width: 0; /* flex 子项必须设这个，否则文字不会省略 */
  flex: 1;
}

.title {
  margin: 2px 0 6px;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--ink);
  transition: color 0.18s ease;
}

.post-card:hover .title {
  color: var(--brand);
}

.summary {
  margin: 0 0 10px;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--ink-soft);
  /* 最多两行，多的用省略号 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--ink-faint);
}

.dot {
  opacity: 0.5;
}

.tags {
  display: inline-flex;
  gap: 6px;
  margin-left: 4px;
}

.tag {
  padding: 1px 7px;
  border-radius: 4px;
  background: var(--surface-sunk);
  color: var(--ink-soft);
  font-size: 11px;
}

.draft {
  position: absolute;
  top: 14px;
  right: 16px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fdf1e7;
  color: var(--accent);
  font-size: 11px;
  font-weight: 500;
}

@media (max-width: 560px) {
  .thumb {
    width: 62px;
    height: 62px;
  }
  .thumb span {
    font-size: 24px;
  }
  .summary {
    display: none;
  }
}
</style>
