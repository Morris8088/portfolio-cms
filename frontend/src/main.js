// main.js —— 前端应用入口
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

// 自定义样式必须在 Element Plus 之后引入，
// 否则我们覆盖的主题变量会被组件库的默认值盖回去
import './styles/main.css';

import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import { demoReady } from './api';

async function bootstrap() {
  // ---- Demo 构建的关键一步：先装好假后端，再挂载应用 ----
  //
  // 这里必须 await。如果只是"发起一个 import 就不管了"，
  // 下面的 app.mount() 会立刻执行，页面 onMounted 里发出的第一批请求
  // 就会跑到真实的 /api 上（静态站点上没有这些文件，一律 404），
  // 文章列表于是永远是空的。
  //
  // 顺序错了不会报错，只会"数据不见了"，所以把等待写在这里、写成显式的。
  try {
    await demoReady;
  } catch (e) {
    // 假后端的代码块没下载下来（网络问题）。
    // 这时照样把页面挂起来：站点还能浏览，页面会显示各自的错误提示。
    console.error('[demo] 演示数据模块加载失败：', e);
  }

  const app = createApp(App);
  const pinia = createPinia();

  app.use(pinia);
  app.use(router);
  app.use(ElementPlus);

  // 有令牌时校验一次：令牌过期会在拦截器里被清掉，
  // 避免"看起来还登录着，一操作就 401"
  const auth = useAuthStore(pinia);
  if (auth.isLoggedIn) {
    auth.fetchMe();
  }

  app.mount('#app');
}

bootstrap();
