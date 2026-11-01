<template>
  <div class="home">
    <h1>我的作品集</h1>
    <p>后端状态：{{ health }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const health = ref('检测中...');

// onMounted：组件挂载后自动执行（Vue 生命周期）
onMounted(async () => {
  try {
    // 通过 Vite 代理请求后端 /api/health
    const { data } = await axios.get('/api/health');
    health.value = data.ok ? '正常 ✅' : '异常';
  } catch (e) {
    health.value = '连不上后端（请先启动后端 3001）';
  }
});
</script>

<style scoped>
.home { max-width: 800px; margin: 80px auto; text-align: center; }
</style>
