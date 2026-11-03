// router/index.js —— 前端路由
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import PostDetail from '../views/PostDetail.vue';

// 路由表：path 对应 URL，component 对应要渲染的页面
const routes = [
  { path: '/', name: 'home', component: Home },
  // :id 是占位符，访问 /posts/2 时，2 会落进 route.params.id
  { path: '/posts/:id', name: 'post-detail', component: PostDetail }
  // TODO(Day4): 加后台 /admin
];

export default createRouter({
  history: createWebHistory(),
  routes,
  // 切换页面时自动滚回顶部（从列表底部点进详情，不然会停在中间）
  scrollBehavior() {
    return { top: 0 };
  }
});
