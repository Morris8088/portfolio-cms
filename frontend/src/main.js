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
