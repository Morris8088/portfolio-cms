// vite.config.js —— Vite 配置
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: true, // 监听所有网卡(含 127.0.0.1 与局域网)，避免只绑 IPv6 ::1 导致 127.0.0.1 连不上
    port: 5173,
    // 开发时代理：前端请求 /api/* 会被转发到后端 3001，避免跨域麻烦
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
