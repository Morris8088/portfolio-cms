// router/index.js —— 前端路由表 + 登录守卫
import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router';
import { getToken, IS_DEMO } from '../api';

import Home from '../views/Home.vue';
import Projects from '../views/Projects.vue';
import PostDetail from '../views/PostDetail.vue';
import About from '../views/About.vue';
import NotFound from '../views/NotFound.vue';
import AdminLogin from '../views/admin/Login.vue';

// 后台页面用"懒加载"：只有真的访问 /admin 时才下载这部分代码。
// 好处是首页体积更小、打开更快。
const Dashboard = () => import('../views/admin/Dashboard.vue');
const PostEditor = () => import('../views/admin/PostEditor.vue');

const routes = [
  { path: '/', name: 'home', component: Home, meta: { title: '首页' } },
  { path: '/projects', name: 'projects', component: Projects, meta: { title: '作品' } },
  // 兜底：hash 路由下 #posts 会被规范化成 /posts；旧链接、外部分享的地址
  // 也可能带这一段。路由表里只有 /posts/:id（具体某篇文章），没有 /posts，
  // 所以这里统一送回首页的文章区，别让访客落进 404 页。
  { path: '/posts', redirect: { name: 'home', hash: '#posts' } },
  { path: '/posts/:id', name: 'post-detail', component: PostDetail },
  { path: '/about', name: 'about', component: About, meta: { title: '关于' } },

  {
    path: '/admin/login',
    name: 'admin-login',
    component: AdminLogin,
    meta: { title: '登录' }
  },
  {
    path: '/admin',
    name: 'admin-dashboard',
    component: Dashboard,
    meta: { requiresAuth: true, title: '后台' }
  },
  {
    path: '/admin/posts/new',
    name: 'admin-post-new',
    component: PostEditor,
    meta: { requiresAuth: true, title: '写文章' }
  },
  {
    path: '/admin/posts/:id/edit',
    name: 'admin-post-edit',
    component: PostEditor,
    meta: { requiresAuth: true, title: '编辑文章' }
  },

  // 兜底路由：放最后。所有没匹配上的地址都进 404 页
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound, meta: { title: '页面不存在' } }
];

const router = createRouter({
  // Demo 构建跑在 GitHub Pages 上，是纯静态托管：
  // 访问 /portfolio-cms/posts/3 时服务器会去找一个叫 posts/3 的文件，找不到就 404。
  // 静态托管没法像 Express 那样"所有路由都返回 index.html"，
  // 所以 Demo 用 hash 模式（地址里带 #），# 后面的部分浏览器不会发给服务器。
  history: IS_DEMO ? createWebHashHistory() : createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 浏览器前进/后退时回到原来的滚动位置
    if (savedPosition) return savedPosition;
    // 同一篇文章内切换锚点不滚动
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  }
});

// ============================================================
// 全局前置守卫：进入需要登录的页面前先拦一道
// ------------------------------------------------------------
// 注意：这只是"体验层"的拦截，真正的安全在后端 ——
// 接口有 requireAuth，就算有人手动改前端代码也写不了数据。
// ============================================================
router.beforeEach((to) => {
  const loggedIn = Boolean(getToken());

  if (to.meta.requiresAuth && !loggedIn) {
    return { name: 'admin-login', query: { redirect: to.fullPath } };
  }
  // 已登录还去登录页，直接送回后台
  if (to.name === 'admin-login' && loggedIn) {
    return { name: 'admin-dashboard' };
  }
  return true;
});

// 切换页面时更新浏览器标签标题
router.afterEach((to) => {
  const base = 'Morris · 作品集';
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base;
});

export default router;
