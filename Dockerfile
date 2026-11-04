# ============================================================
# Dockerfile —— 单镜像同时跑前后端
# ------------------------------------------------------------
# 思路：多阶段构建
#   阶段 1 用 Node 把前端编译成静态文件（dist）
#   阶段 2 只留运行时需要的东西，镜像能小一大半
# 最终容器里只有一个 Node 进程：Express 既发 API，也发前端 dist。
# ============================================================

# ---------- 阶段 1：构建前端 ----------
FROM node:24-alpine AS frontend-build
WORKDIR /build/frontend

# 先只拷 package.json，让依赖层可以被缓存：
# 只要依赖没变，改业务代码重建时不会重装 node_modules
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---------- 阶段 2：运行时 ----------
FROM node:24-alpine AS runtime
WORKDIR /app

# node:sqlite 需要 Node 22.5+，node:24 自带，不用装任何原生模块
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/src ./src
COPY backend/content ./content

# 前端构建产物放到后端约定的位置：src 往上两级再进 frontend/dist
COPY --from=frontend-build /build/frontend/dist ./frontend/dist

# 数据目录：数据库和上传的图片都写这里。
# 平台挂持久卷时把卷挂到 /app/data 即可，代码不用改。
ENV DATA_DIR=/app/data
ENV NODE_ENV=production
RUN mkdir -p /app/data/uploads

EXPOSE 3001

# 健康检查让平台知道服务是不是真的活着，而不是"端口开了但数据库连不上"
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--experimental-sqlite", "src/index.js"]
