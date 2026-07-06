# ==========================================
# Multi-stage Dockerfile for Admin (Next.js 15)
# 与 frontend/Dockerfile 同构，端口 3002
# ==========================================

# --- dependencies stage ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制 .npmrc (legacy-peer-deps=true) 必须在 npm install 之前
COPY .npmrc ./
COPY package*.json ./
RUN npm install

# --- development stage ---
FROM node:20-alpine AS development
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3002
CMD ["npm", "run", "dev"]

# --- builder stage ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- production stage ---
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder --chown=next:node /app/.next/standalone ./
COPY --from=builder --chown=next:node /app/.next/static ./.next/static

USER next
EXPOSE 3002

ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
