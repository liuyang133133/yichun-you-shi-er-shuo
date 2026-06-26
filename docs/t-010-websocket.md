# T-010 WebSocket 网关设计文档

> 状态：✅ 已完成（2026-06-26）
> 工作分支：`feature/T-010-websocket`
> 涉及模块：`backend/src/modules/ws/` + `frontend/src/lib/{use-ws,use-realtime-notifications}.ts`

## 1. 目标

提供伊春有事儿说平台的 **实时通知通道**：

- **服务端**：Socket.IO Gateway，namespace `/ws`，JWT 鉴权，Redis Adapter 跨实例广播
- **客户端**：封装 `socket.io-client`，自动重连、30s 轮询兜底
- **集成点**：`NotificationService.emit()` 写库后立即通过 ws 推送到用户 room
- **Bell 升级**：收到 ws 推送时立即 +1，未连接时降级到 30s 轮询

**核心痛点（解决前）**：

- T-008 通知前端用 30s 轮询 → 通知延迟平均 15s + 服务器 2x 请求数
- 多实例部署时通知只能本地推 → A 实例写库的用户在 B 实例前端看不到实时
- 评论、审核、订单状态变化无实时反馈

## 2. 设计

### 2.1 服务端架构

```
┌──────────────┐  JWT    ┌─────────────────┐
│   Browser    │────────▶│ WsAuthGuard     │
│ (frontend)   │         │ 提取/验签/黑名单│
└──────────────┘         └─────────────────┘
       │                         │
       │ socket.io /ws           ▼
       │              ┌─────────────────────────┐
       │              │ NotificationGateway     │
       │              │ handleConnection        │
       │              │  → join 'user:<sub>'    │
       │              │  → emit 'connected'     │
       │              └─────────────────────────┘
       │                         │
       │              ┌─────────────────────────┐
       │              │ RedisIoAdapter          │
       │              │ 跨实例 pub/sub          │
       │              └─────────────────────────┘
       ▼                         ▲
┌──────────────┐                 │
│ Notification │  sendToUser()   │
│ Bell (hook)  │─────────────────┘
└──────────────┘
       ▲
       │ notification event
       │
┌──────────────────────────┐
│ NotificationService.emit │ ◀── 业务侧调用
│  → 写库 + ws.sendToUser │
└──────────────────────────┘
```

### 2.2 鉴权（WsAuthGuard）

**流程**：

1. 提取 token：优先 `handshake.auth.token`，回退 `Authorization: Bearer xxx`
2. `JwtService.verifyAsync()` 验签
3. 拒绝 `type=refresh` token
4. 黑名单检查（调用 `AuthService.isTokenBlacklisted`）
5. 通过后写入 `socket.data.user = { sub, phone, role, jti, type }`
6. 失败抛 `WsException`，socket.io 自动断开客户端

**为何不复用 HTTP JwtStrategy**：HTTP 通过 Passport 中间件提取，Socket.IO 通过 `handshake` 提取，无中间件上下文。

### 2.3 Redis Adapter

**作用**：让多实例后端通过 Redis pub/sub 跨进程推送。

**配置**：

- pub client：复用 `RedisService.getClient()`（避免额外连接）
- sub client：`pubClient.duplicate()`（Redis pub/sub 要求独立连接）
- 在 `main.ts` bootstrap 时 `await redisIoAdapter.init(app)` 然后 `app.useWebSocketAdapter(redisIoAdapter)`

### 2.4 客户端架构

| 组件 | 职责 |
|---|---|
| `lib/use-ws.ts` | socket.io-client 单例封装，token 变化时重连 |
| `lib/use-realtime-notifications.ts` | 包装 `useWs`，收到 `notification` 事件触发回调 |
| `components/layout/notification-bell.tsx` | 收到推送时 `setUnread(c+1)` + 立即 `refresh()` 兜底 |

**降级策略**：

- ws 连接中 → 实时推送（< 1s）
- ws 断开 → 30s 轮询（与 T-008 一致）
- 显示连接状态：Bell 右下次圆点（绿=ws，灰=轮询）

### 2.5 消息约定

**客户端 → 服务端**：

```ts
socket.emit('ping', { ts: 1234567890 });
```

**服务端 → 客户端**：

```ts
// 连接成功
socket.emit('connected', { userId: '100', ts: 1234567890 });

// 心跳回复
socket.on('pong', (data) => { console.log(data.ts, data.serverTs); });

// 业务通知
socket.on('notification', (msg) => {
  // msg = { event: 'notification', data: { id, title, body, payload, ... } }
});
```

## 3. 测试策略（TDD）

### 3.1 后端单测（Jest）

| 文件 | 用例 | 结果 |
|---|---|---|
| `ws-auth.guard.spec.ts` | 7 个：无 token / 签名错 / 黑名单 / refresh / 有效 / Bearer / 空 sub | 7/7 ✅ |
| `notification-ws.service.spec.ts` | 6 个：room 命名 / 容错 / 多用户 / payload 引用 | 6/6 ✅ |
| `notification.gateway.spec.ts` | 7 个：join / welcome / 未鉴权断开 / disconnect / ping-pong / emit / 容错 | 7/7 ✅ |
| **总计** | **20 用例** | **20/20 ✅** |

### 3.2 前端 E2E（占位）

`frontend/tests/e2e/websocket.spec.ts` 仅作启动约定文档 + 占位（真实 ws E2E 需要后端运行，本地 CI 不具备）。手动验证步骤见文件注释。

## 4. 端到端验证清单

```bash
# 1. 启动 Redis
docker compose up -d redis

# 2. 启动后端（必须看到 ✅ Redis Adapter 已初始化）
cd backend && npm run start:dev

# 3. 启动前端
cd frontend && npm run dev

# 4. 用两个浏览器 tab 登录同一用户
# 5. tab A 调用 POST /api/v1/notifications/test（手动 emit 接口，V1.1 加）
# 6. tab B 应该 1s 内红点 +1，Bell 右下显示绿点
# 7. 关闭后端，Bell 右下变灰，恢复轮询
# 8. 重启后端，socket.io 自动重连，绿点恢复
```

## 5. 后续（V1.1）

- [ ] Redis Stream / Bull Queue 替代同步 emit（高并发场景）
- [ ] 在线状态：`presence:user:<id>` Redis hash
- [ ] 设备离线推送：V1.1 接入 APNs / 小程序订阅消息
- [ ] 实时未读同步：ws 进入时立即推一次当前 unreadCount
- [ ] 群发（公告）：`server.to('announce').emit(...)` 公共 room
- [ ] ws 自动测试：playwright 启双 tab 验证实时推送

## 6. 验收对照 TODO.md

- [x] socket.io 服务端 + 客户端双向连通
- [x] JWT 鉴权 + 黑名单 + refresh token 拒绝
- [x] Redis Adapter 跨实例广播（pub + sub client）
- [x] NotificationService.emit 集成 ws 推送
- [x] NotificationBell 升级：ws 推送 +1，降级轮询
- [x] 单测 20/20 通过
- [x] TypeScript 0 错误（前后端）
- [x] 文档：CHANGELOG + README + 本设计 doc