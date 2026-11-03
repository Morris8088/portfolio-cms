<template>
  <div class="page container">
    <div class="head">
      <p class="eyebrow">Projects</p>
      <h1>做过的东西</h1>
      <p class="sub">
        从零搭起来的一个完整项目：前端界面、后端接口、数据库、登录鉴权、
        自动化测试都自己走了一遍。每条功能都是能点开、能看源码的状态。
      </p>
    </div>

    <div v-if="loading" class="grid">
      <el-skeleton v-for="i in 3" :key="i" :rows="5" animated />
    </div>

    <el-alert
      v-else-if="error"
      :title="error"
      type="error"
      show-icon
      :closable="false"
    />

    <div v-else class="grid" :class="{ single: projects.length === 1 }">
      <ProjectCard v-for="(p, i) in projects" :key="p.id" :project="p" :index="i" />
    </div>

    <div class="cta">
      <p>想聊项目细节，或者只是想说句「这里写得不对」？</p>
      <a class="mail" href="mailto:1986595241@qq.com">发邮件给我 →</a>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import ProjectCard from '../components/ProjectCard.vue';
import { getProjects } from '../api';

const projects = ref([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    projects.value = await getProjects();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page {
  padding-top: 56px;
  max-width: 1040px;
}

.head {
  max-width: 620px;
  margin-bottom: 36px;
}

.head h1 {
  font-family: var(--font-serif);
  font-size: 36px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 14px 0 14px;
}

.sub {
  margin: 0;
  font-size: 15px;
  line-height: 1.85;
  color: var(--ink-soft);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

/* 只有一个作品时不要拉满整行，收窄一点更像「一张卡」 */
.grid.single {
  grid-template-columns: minmax(0, 1fr);
  max-width: 680px;
  gap: 22px;
}

.cta {
  margin-top: 48px;
  padding: 28px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  text-align: center;
}

.cta p {
  margin: 0 0 10px;
  color: var(--ink-soft);
  font-size: 14px;
}

.mail {
  color: var(--brand);
  font-size: 15px;
  border-bottom: 1px solid rgba(31, 111, 92, 0.3);
  padding-bottom: 2px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .head h1 {
    font-size: 28px;
  }
}
</style>
