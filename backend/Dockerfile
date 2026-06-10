# ==========================================
# Multi-stage Dockerfile for NestJS backend
# ==========================================

# --- development stage ---
FROM node:20-alpine AS development
WORKDIR /app

# 安装依赖（libc6-compat 是 Prisma 在 alpine 上的必需）
RUN apk add --no-cache openssl libc6-compat

# 先复制 package.json 安装依赖（利用 Docker 缓存）
COPY package*.json ./
RUN npm install

# 复制源码
COPY . .

# 暴露端口
EXPOSE 3001

# 默认开发模式（docker-compose 中可覆盖）
CMD ["npm", "run", "start:dev"]

# --- builder stage ---
FROM development AS builder
RUN npm run build

# --- production stage ---
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/main"]
