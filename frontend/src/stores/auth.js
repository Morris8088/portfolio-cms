// ============================================================
// stores/auth.js —— 登录状态（Pinia）
// ------------------------------------------------------------
// 为什么用 Pinia 而不是把状态塞在某个组件里？
//   导航栏要显示"后台/退出"，路由守卫要判断"能不能进"，
//   后台三个页面都要知道"我是谁" —— 一个全局 store 最省事。
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '../api';

export const useAuthStore = defineStore('auth', () => {
  // 初始值从 localStorage 里恢复，刷新页面不会掉登录
  const token = ref(api.getToken());
  const user = ref(api.getStoredUser());

  const isLoggedIn = computed(() => Boolean(token.value));
  const displayName = computed(() => user.value?.displayName || user.value?.username || '');

  /** 登录成功后同时更新内存状态和 localStorage */
  async function login(username, password) {
    const data = await api.login(username, password);
    token.value = data.token;
    user.value = data.user;
    api.setToken(data.token);
    api.setStoredUser(data.user);
    return data;
  }

  /** 用令牌换回最新用户信息（校验令牌是否还有效） */
  async function fetchMe() {
    if (!token.value) return null;
    try {
      const me = await api.getMe();
      user.value = me;
      api.setStoredUser(me);
      return me;
    } catch {
      // 令牌失效：清空登录态
      logout();
      return null;
    }
  }

  function logout() {
    token.value = '';
    user.value = null;
    api.setToken('');
    api.setStoredUser(null);
  }

  return { token, user, isLoggedIn, displayName, login, fetchMe, logout };
});
