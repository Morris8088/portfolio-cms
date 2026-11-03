// ============================================================
// api/index.js —— 所有后端请求的唯一出口
// ------------------------------------------------------------
// 为什么要单独建这个文件？
//   如果把 axios.get('/api/posts') 分散写在每个页面里，将来接口地址变了
//   或者要统一加登录令牌，你得改十几个文件，还容易漏。
//   所以约定：所有请求都在这里定义，页面只 import 函数名，不关心地址。
// ============================================================

import axios from 'axios';

// —— 造一个"专属实例" ——
// axios.create 返回一个新的 axios 对象，它自带公共配置
const request = axios.create({
  // baseURL 是所有请求的公共前缀。
  // 填 '/api' 后，下面写 request.get('/posts') 实际请求的就是 /api/posts
  // 这个 /api 会被 vite.config.js 里的 proxy 转发到 http://localhost:3001
  baseURL: '/api',
  // 超过 8 秒没响应就判定失败，防止页面一直转圈圈
  timeout: 8000
});

// —— 响应拦截器：统一处理错误 ——
// 后端出错时返回的是 { error: '文章不存在' } 这种形状。
// 如果不处理，页面拿到的是一个看不懂的 AxiosError 对象。
// 这里统一把它翻译成一个只有一句话的 Error，页面直接显示 e.message 就行。
request.interceptors.response.use(
  // 第一个函数：请求成功（HTTP 2xx）时执行，原样放行
  (response) => response,
  // 第二个函数：请求失败（4xx / 5xx / 网络断了）时执行
  (error) => {
    // 有 response 说明服务器答了，只是状态码不是 2xx
    if (error.response) {
      const msg = error.response.data?.error || `请求失败（${error.response.status}）`;
      return Promise.reject(new Error(msg));
    }
    // 没有 response：要么超时，要么根本没连上
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时，后端可能没启动'));
    }
    return Promise.reject(new Error('连不上后端，请确认 3001 端口已启动'));
  }
);

// ============================================================
// 下面每个函数都只做一件事：发请求，然后把"有用的数据"返回
// 注意 .then((res) => res.data)：axios 返回的 res 是个大对象，
// 真正的业务数据在 res.data 里，这里剥掉外壳，页面直接拿到数组/对象
// ============================================================

/**
 * 查文章列表
 * @param {string} [status] 可选，'published' 只看已发布，'draft' 只看草稿，不传则全部
 */
export function getPosts(status) {
  // status 有值时才带上 params，axios 会自动拼成 ?status=published
  const config = status ? { params: { status } } : {};
  return request.get('/posts', config).then((res) => res.data);
}

/**
 * 查单篇文章
 * @param {number|string} id 文章 id
 */
export function getPost(id) {
  return request.get(`/posts/${id}`).then((res) => res.data);
}

/**
 * 新建文章（Day 4 后台会用到）
 * @param {object} data { title, slug, content, ... }
 */
export function createPost(data) {
  return request.post('/posts', data).then((res) => res.data);
}

/**
 * 修改文章（Day 4 后台会用到）
 * @param {number|string} id
 * @param {object} data 只传要改的字段即可
 */
export function updatePost(id, data) {
  return request.put(`/posts/${id}`, data).then((res) => res.data);
}

/**
 * 删除文章（Day 4 后台会用到）
 * @param {number|string} id
 */
export function deletePost(id) {
  return request.delete(`/posts/${id}`).then((res) => res.data);
}
