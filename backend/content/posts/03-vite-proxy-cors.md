---
title: Vite 代理到底解决了什么问题
slug: vite-proxy-cors
tags: Vite,工程化,HTTP
status: published
date: 2026-10-20T14:40:00.000Z
views: 116
summary: 同源策略、CORS、代理转发，这三个词经常一起出现，但它们是三个不同层面的东西。用一个请求的完整旅程把它们串起来。
---

## 先说结论

浏览器里发起请求时，如果**协议、域名、端口**三者有一个不同，就是跨域。跨域请求默认拿不到响应。

我的项目：前端 `localhost:5173`，后端 `localhost:3001` —— 端口不同，跨域。

## 一个请求的旅程

**不配代理时：**

1. 页面在 5173，JS 里写 `fetch('http://localhost:3001/api/posts')`
2. 浏览器发现跨域，先发一个 `OPTIONS` 预检请求
3. 后端必须回 `Access-Control-Allow-Origin: http://localhost:5173`
4. 少了这个头，浏览器直接把响应扔掉，控制台报 CORS error

注意第 4 步：**请求其实到达了服务器**，是浏览器不让 JS 读结果。所以 CORS 是浏览器行为，不是服务器拒绝。

**配了代理之后：**

```js
// vite.config.js
server: {
  proxy: { '/api': 'http://localhost:3001' }
}
```

1. 页面在 5173，JS 里写 `fetch('/api/posts')` —— 相对路径，同源
2. Vite 开发服务器收到请求，**在服务端**转发给 3001
3. 结果原样返回给浏览器

浏览器全程只看到"我请求了 5173"，没有任何跨域。

## 为什么要用相对路径

```js
// 好
axios.create({ baseURL: '/api' })

// 不好
axios.create({ baseURL: 'http://localhost:3001/api' })
```

因为上线之后域名会变。写死地址的项目，每次部署都要改代码、重新构建。

## 生产环境呢

Vite 代理只在 `npm run dev` 时生效，打包后的静态文件没有这个能力。

我的做法是：**让 Express 同时托管前端 dist**。这样前后端同一个域名同一个端口，压根不存在跨域。部署也只需要启动一个 Node 进程。
