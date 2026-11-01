// router/index.js —— 前端路由
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';

// 路由表：path 对应 URL，component 对应要渲染的页面
const routes = [
  { path: '/', name: 'home', component: Home }
  // TODO(Day3): 加文章详情页 /posts/:id
  // TODO(Day4): 加后台 /admin
];

export default createRouter({
  history: createWebHistory(),
  routes
});
