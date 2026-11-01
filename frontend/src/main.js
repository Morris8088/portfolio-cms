// main.js —— 前端应用入口
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';

// 创建应用 -> 装状态管理(Pinia) -> 装路由 -> 装 Element Plus 组件库 -> 挂载
createApp(App).use(createPinia()).use(router).use(ElementPlus).mount('#app');
