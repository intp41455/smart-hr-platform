FROM node:22-alpine AS builder

# 安装 better-sqlite3 原生编译依赖
RUN apk add --no-cache gcc g++ make python3

WORKDIR /app

# 先复制依赖定义文件（利用 Docker 缓存层加速重复构建）
COPY package.json ./

# 安装所有依赖（含原生模块编译）
RUN npm install --production=false && npm rebuild better-sqlite3

# 复制其余源码
COPY . .

# 构建前端生产包
RUN npm run build

# 清理开发依赖（减小镜像体积）
RUN npm prune --production


# ===== 生产运行镜像（更小、更安全）=====
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

# 从构建阶段复制必要文件
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/vite.config.ts ./vite.config.ts
COPY --from=builder /app/tailwind.config.js ./tailwindconfig.js
COPY --from=builder /app/index.html ./index.html

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "server/index.js"]
