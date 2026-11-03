<template>
  <article class="project">
    <div class="top">
      <span class="index">{{ String(index + 1).padStart(2, '0') }}</span>
      <span v-if="project.role" class="role">{{ project.role }}</span>
    </div>

    <h3 class="title">{{ project.title }}</h3>
    <p class="desc">{{ project.description }}</p>

    <p v-if="project.highlight" class="highlight">
      <span class="hl-label">成果</span>{{ project.highlight }}
    </p>

    <div class="tech">
      <span v-for="t in parseTags(project.tech)" :key="t" class="chip">{{ t }}</span>
    </div>

    <div class="links">
      <a v-if="project.link" :href="project.link" target="_blank" rel="noopener" class="link">
        在线地址 →
      </a>
      <a v-if="project.repo" :href="project.repo" target="_blank" rel="noopener" class="link">
        源码 →
      </a>
      <span v-if="!project.link && !project.repo" class="link muted">整理中</span>
    </div>
  </article>
</template>

<script setup>
import { parseTags } from '../utils/format';

defineProps({
  project: { type: Object, required: true },
  index: { type: Number, default: 0 }
});
</script>

<style scoped>
.project {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s ease, border-color 0.25s ease;
}

.project:hover {
  transform: translateY(-3px);
  border-color: var(--line-strong);
  box-shadow: var(--shadow);
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.index {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-faint);
  letter-spacing: 0.08em;
}

.role {
  font-size: 11.5px;
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--brand-deep);
}

.title {
  margin: 0 0 10px;
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--ink);
}

.desc {
  margin: 0 0 16px;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--ink-soft);
  flex: 1;
}

.highlight {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--ink);
  padding: 9px 12px;
  background: var(--surface-sunk);
  border-radius: 8px;
  border-left: 2px solid var(--accent);
}

.hl-label {
  display: inline-block;
  margin-right: 8px;
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
  letter-spacing: 0.04em;
}

.tech {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 18px;
}

.chip {
  font-size: 11.5px;
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px solid var(--line);
  color: var(--ink-soft);
  font-family: var(--font-mono);
}

.links {
  display: flex;
  gap: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  font-size: 13px;
}

.link {
  color: var(--brand);
}

.link:hover {
  text-decoration: underline;
}

.link.muted {
  color: var(--ink-faint);
}
</style>
