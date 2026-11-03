// ============================================================
// api/index.js —— 所有后端请求的唯一出口
// ------------------------------------------------------------
// 约定：页面只 import 函数名，不关心接口地址、不关心怎么带令牌。
// 哪天接口从 /api 换成 /v2/api，只改这一个文件。
// ============================================================

import axios from 'axios';

const TOKEN_KEY = 'portfolio_token';
const USER_KEY = 'portfolio_user';

// ---------- 令牌的读写集中在这里，避免各页面各写一套 key ----------
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return ''; // 隐私模式下 localStorage 可能被禁用
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 忽略：存不了就退化成"本次会话有效" */
  }
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* 同上 */
  }
}

// ---------- axios 实例 ----------
const request = axios.create({
  baseURL: '/api',
  timeout: 10000
});

// 请求拦截器：每次请求自动带上令牌。
// 这里直接读 localStorage 而不是 import store，
// 因为 store 里也会 import 这个文件 → 循环依赖。
request.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：把各种失败统一翻译成一句人话
request.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.error || `请求失败（${status}）`;
      // 令牌过期/伪造：顺手清掉本地登录态，让前端回到未登录状态
      if (status === 401) {
        setToken('');
        setStoredUser(null);
      }
      return Promise.reject(new Error(message));
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时，后端可能没启动'));
    }
    return Promise.reject(new Error('连不上后端，请确认 3001 端口已启动'));
  }
);

// ============================================================
// 文章
// ============================================================
/**
 * 文章列表
 * @param {object} params { q, tag, status, page, pageSize, sort }
 * @returns {{items:Array,total:number,page:number,pageSize:number,totalPages:number}}
 */
export function getPosts(params = {}) {
  // 去掉空值，避免发出 ?q=&tag= 这种没意义的参数
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  return request.get('/posts', { params: clean }).then((res) => res.data);
}

export function getPost(id) {
  return request.get(`/posts/${id}`).then((res) => res.data);
}

export function createPost(data) {
  return request.post('/posts', data).then((res) => res.data);
}

export function updatePost(id, data) {
  return request.put(`/posts/${id}`, data).then((res) => res.data);
}

export function deletePost(id) {
  return request.delete(`/posts/${id}`).then((res) => res.data);
}

// ============================================================
// 标签 / 作品 / 统计
// ============================================================
export function getTags() {
  return request.get('/tags').then((res) => res.data);
}

export function getProjects() {
  return request.get('/projects').then((res) => res.data);
}

export function getStats() {
  return request.get('/stats').then((res) => res.data);
}

// ============================================================
// 登录
// ============================================================
export function login(username, password) {
  return request.post('/auth/login', { username, password }).then((res) => res.data);
}

export function getMe() {
  return request.get('/auth/me').then((res) => res.data);
}
