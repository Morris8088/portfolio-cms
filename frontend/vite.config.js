// vite.config.js —— Vite 配置
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  // Demo 构建：npm run build:demo（等价于 vite build --mode demo --base=...）
  // 和正式构建的唯一区别是资源路径前缀——GitHub Pages 把仓库挂在 /仓库名/ 下面，
  // 如果 index.html 里写 /assets/index.js，浏览器会去域名根目录找，必然 404。
  const isDemo = mode === 'demo';

  return {
    plugins: [vue()],
    server: {
      host: true, // 监听所有网卡(含 127.0.0.1 与局域网)，避免只绑 IPv6 ::1 导致 127.0.0.1 连不上
      port: 5173,
      // 开发时代理：前端请求 /api/* 会被转发到后端 3001，避免跨域麻烦
      proxy: {
        '/api': 'http://localhost:3001',
        // 上传的图片也由后端发出来，开发模式同样要代理，否则 <img src="/uploads/..."> 会 404
        '/uploads': 'http://localhost:3001'
      }
    },
    // 默认值 '/'，只有 Demo 构建走子路径
    base: isDemo ? '/portfolio-cms/' : '/',
    define: {
      // 把这个标记编译成字面量 true/false。
      // Vite 本身就会暴露 import.meta.env.VITE_*，
      // 这里额外定义是为了让 `vite preview --mode demo` 也能生效。
      __DEMO__: JSON.stringify(isDemo)
    },
    // 生产构建
    build: {
      rollupOptions: {
        output: {
          // 分包：把不常变的第三方库单独打包。
          // 好处是改一行业务代码，浏览器不需要重新下载整个 Vue / Element Plus，
          // 而且这几个包可以并行下载。
          manualChunks: {
            vue: ['vue', 'vue-router', 'pinia'],
            'element-plus': ['element-plus'],
            markdown: ['marked', 'dompurify']
          }
        }
      },
      // Element Plus 整包引入大概 900KB，这里放宽告警阈值。
      // 想进一步压缩就改成按需引入（unplugin-vue-components），代价是多两个构建期依赖。
      chunkSizeWarningLimit: 1100
    },
    // Vitest 会读取这里的 test 配置（同一份配置文件，不用维护两套）
    test: {
      environment: 'node',
      include: ['test/**/*.test.js'],
      reporters: 'default'
    }
  };
});
