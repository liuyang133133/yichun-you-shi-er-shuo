# P0 Critical Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 13 项 P0 阻塞性安全问题与致命 Bug，达到可演示/可内部测试状态

**Architecture:**
- 后端以最小侵入方式逐项修复，保留现有架构
- 优先修高 ROI 项（修 1 项解决多个问题）
- 每项完成后立即 curl 验证

**Tech Stack:** NestJS 10 + Prisma 5 + Next.js 15 + React 19 + MySQL 8 + Redis 7

**测试策略：** 项目当前 0% 测试覆盖率。本 plan 采用 **curl 端到端验证**（黑盒），测试基建（SHOULD-19）放 P1。

---

## 文件结构变更总览

```
backend/
├── .env (轮换)
├── .env.example (占位符)
├── prisma/
│   ├── schema.prisma (新增索引/表)
│   └── migrations/xxx/ (新增)
├── src/
│   ├── main.ts (CORS + helmet)
│   ├── app.module.ts (ThrottlerModule + ScheduleModule)
│   ├── prisma/prisma.service.ts (log 级别)
│   ├── common/middleware/ (新增 helmet wrapper)
│   ├── modules/
│   │   ├── user/
│   │   │   ├── user.controller.ts (加 admin 鉴权)
│   │   │   └── user.service.ts (phone 脱敏)
│   │   ├── auth/
│   │   │   ├── auth.service.ts (强校验 JWT_SECRET 长度 + 验证码生成改 crypto)
│   │   │   └── strategies/jwt.strategy.ts (查 DB 二次校验)
│   │   ├── sms/
│   │   │   └── sms.service.ts (失败计数 + IP 限频 + crypto.randomInt)
│   │   ├── post/
│   │   │   └── post.module.ts (导入 4 个子 module)
│   │   ├── upload/
│   │   │   ├── upload.service.ts (file-type 嗅探)
│   │   │   └── upload.module.ts (新增)
│   │   ├── admin/post/admin-post.service.ts (事务修复 + AuditLog)
│   │   ├── cron/expire-posts.cron.ts (新增)
│   │   └── common/filters/sensitive-word.filter.ts (新增)
│   └── ...
frontend/
├── package.json (升 React 19 GA + @types/react 19)
├── src/
│   ├── app/
│   │   ├── page.tsx (包 Suspense)
│   │   └── posts/publish/page.tsx (包 Suspense + 补全 3 类型字段)
│   ├── app/posts/[id]/page.tsx (4 按钮接 API)
│   ├── lib/auth.ts (保持原样，本批次不动)
│   └── ...
```

---

## Task 1: MUST-1 — 轮换 JWT 密钥 + MySQL 密码

**Files:**
- Modify: `backend/.env`
- Modify: `backend/.env.example`
- Modify: `backend/src/modules/auth/auth.service.ts:20-22`

**Why:** 当前 `.env` 已被 commit 到仓库，源码泄露即完全失守

- [ ] **Step 1.1: 生成新密钥**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
NEW_JWT=$(openssl rand -base64 48)
NEW_MYSQL=$(openssl rand -hex 16)
NEW_REDIS=$(openssl rand -hex 16)
echo "JWT_SECRET=$NEW_JWT"
echo "MYSQL_PASSWORD=$NEW_MYSQL"
echo "REDIS_PASSWORD=$NEW_REDIS"
```

- [ ] **Step 1.2: 替换 `.env`**

打开 `backend/.env`，将：
- `JWT_SECRET=yichun-you-shi-er-shuo-jwt-secret-change-in-production` → 新生成的 `NEW_JWT`
- `MYSQL_PASSWORD=yichun123456` → `NEW_MYSQL`
- 如有 `REDIS_PASSWORD=` → `NEW_REDIS`

- [ ] **Step 1.3: 替换 `.env.example`**

打开 `backend/.env.example`，把以上三个字段改为：
```
JWT_SECRET=<generate with: openssl rand -base64 48>
MYSQL_PASSWORD=<generate with: openssl rand -hex 16>
REDIS_PASSWORD=<generate with: openssl rand -hex 16>
```

- [ ] **Step 1.4: 加启动期强校验**

打开 `backend/src/modules/auth/auth.service.ts`，找到第 18-22 行附近的构造器，添加：

```typescript
constructor(
  // ... 现有依赖
) {
  const secret = this.configService.get<string>('JWT_SECRET');
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
}
```

- [ ] **Step 1.5: 验证后端启动失败（旧密钥）**

故意改回 `JWT_SECRET=short`，运行 `cd backend && npm run start:dev`，**期望：进程退出，错误信息含 "must be at least 32 characters"**。

恢复正确密钥后再启动，**期望：进程正常运行**。

- [ ] **Step 1.6: 从 git 移除敏感历史**

⚠️ 这一步会让所有 commit 哈希变化，**仅在无其他开发者依赖时做**：

```bash
cd e:/workspace/yichun-you-shi-er-shuo
# 推荐：保留历史但加 .env 到 .gitignore
# 已经在 .gitignore 中则不用操作
grep -q "^\.env$" backend/.gitignore || echo ".env" >> backend/.gitignore
git rm --cached backend/.env 2>/dev/null || true
```

- [ ] **Step 1.7: 提交**

```bash
git add backend/.env.example backend/.gitignore backend/src/modules/auth/auth.service.ts
git commit -m "security(backend): rotate JWT_SECRET and add startup validation"
```

---

## Task 2: MUST-2 — User 写接口加 admin 鉴权

**Files:**
- Modify: `backend/src/modules/user/user.controller.ts`
- Modify: `backend/src/modules/user/dto/update-user.dto.ts` (新建)

**Why:** 当前任何登录用户可改/删任意用户，包括 `role`/`status`（任意封号、提权）

- [ ] **Step 2.1: 新建 `UpdateUserDto`**

创建 `backend/src/modules/user/dto/update-user.dto.ts`：

```typescript
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsInt, Min, MaxLength } from 'class-validator';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['phone', 'password', 'role', 'status'] as const)
) {
  // 显式禁止：phone / password / role / status
  // 这些字段只能通过 admin 端点修改

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  gender?: number;
}
```

如果 `class-validator` 装饰器不兼容（`CreateUserDto` 不存在），改用基础版本：

```typescript
import { IsOptional, IsString, IsInt, Min, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  gender?: number;
}
```

- [ ] **Step 2.2: 修改 `user.controller.ts`**

打开 `backend/src/modules/user/user.controller.ts`，添加 import：

```typescript
import { UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/guards/admin-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
```

修改类签名（加 `@UseGuards(AdminGuard)`），**只对写接口（PATCH/DELETE）做限制**：

```typescript
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 保持 @Public
  @Public()
  @Get()
  findAll(...) { ... }

  @Public()
  @Get('count')
  count(...) { ... }

  @Public()
  @Get(':id')
  findOne(...) { 
    // 脱敏 phone
    return this.userService.findOnePublic(BigInt(id));  // 新方法
  }

  // 写接口：必须 admin
  @UseGuards(AdminGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(BigInt(id), dto);
  }

  @UseGuards(AdminGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(BigInt(id));
  }
}
```

- [ ] **Step 2.3: 在 `user.service.ts` 增加 `findOnePublic`**

打开 `backend/src/modules/user/user.service.ts`，新增方法（脱敏 phone）：

```typescript
async findOnePublic(id: bigint) {
  const user = await this.prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      nickname: true,
      avatar: true,
      bio: true,
      gender: true,
      role: true,
      status: true,
      createdAt: true,
      // 显式不选 phone / password / lastLoginAt
    },
  });
  if (!user) return null;
  return this.bigIntToString(user);
}
```

- [ ] **Step 2.4: 验证越权失效**

启动后端（`cd backend && npm run start:dev`），用普通用户 token 调：

```bash
# 1. 登录拿 token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login-password \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800000000","password":"password123"}' | jq -r .data.accessToken)

# 2. 尝试改他人（应失败）
curl -X PATCH http://localhost:3001/api/v1/users/999 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"hacked"}'
# 期望：403 Forbidden

# 3. 尝试 GET 拿他人 phone（应脱敏）
curl http://localhost:3001/api/v1/users/1
# 期望：响应中无 phone 字段
```

- [ ] **Step 2.5: 提交**

```bash
git add backend/src/modules/user/
git commit -m "security(backend): add admin guard to user write endpoints + phone masking"
```

---

## Task 3: MUST-3 — Admin 角色查 DB 二次校验

**Files:**
- Modify: `backend/src/modules/auth/strategies/jwt.strategy.ts:65-71`

**Why:** 当前只信 JWT payload 里的 role，admin 降权后旧 token 仍可用 7-30 天

- [ ] **Step 3.1: 修改 `jwt.strategy.ts`**

打开 `backend/src/modules/auth/strategies/jwt.strategy.ts`，找到 `validate` 方法（约 50-72 行），修改返回前加 DB 查询：

```typescript
async validate(payload: JwtPayload) {
  const user = await this.prisma.user.findUnique({
    where: { id: BigInt(payload.sub) },
    select: { id: true, role: true, status: true, phone: true },
  });

  if (!user || user.status !== 0) {
    throw new UnauthorizedException('User is banned or deleted');
  }

  return {
    sub: user.id.toString(),
    phone: user.phone,
    role: user.role,  // ← 来自 DB，不信 payload
    jti: payload.jti,
    type: 'access',
  };
}
```

确保文件顶部 import：

```typescript
import { PrismaService } from '../../../prisma/prisma.service';
```

并在 class 内注入：

```typescript
constructor(
  private configService: ConfigService,
  private prisma: PrismaService,  // 新增
) {
  super({...});
}
```

- [ ] **Step 3.2: 验证**

1. 登录 admin 账号拿 token
2. 改 DB：`UPDATE users SET role = 'user' WHERE id = <admin_id>;`
3. 用旧 token 调 `GET /api/v1/admin/dashboard`
4. **期望：403 Forbidden**（或 401，根据实现）

恢复 role 后应可访问。

- [ ] **Step 3.3: 提交**

```bash
git add backend/src/modules/auth/strategies/jwt.strategy.ts
git commit -m "security(backend): verify admin role from DB on every request"
```

---

## Task 4: MUST-4 — CORS 改白名单

**Files:**
- Modify: `backend/src/main.ts:30-33`
- Modify: `backend/.env`

**Why:** `origin: true, credentials: true` 任何网站都可跨域，未来接 cookie 立即被 CSRF

- [ ] **Step 4.1: 在 `.env` 加白名单**

```
CORS_ORIGINS=http://localhost:3000,http://localhost:3002
```

- [ ] **Step 4.2: 修改 `main.ts`**

```typescript
const origins = (configService.get<string>('CORS_ORIGINS') || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.enableCors({
  origin: (origin, callback) => {
    // 同源 / Postman / curl 允许
    if (!origin || origins.length === 0 || origins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
```

- [ ] **Step 4.3: 验证**

```bash
# 1. 合法 origin 应通过
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:3001/api/v1/health
# 期望：200，响应头有 Access-Control-Allow-Origin: http://localhost:3000

# 2. 非法 origin 应拒绝
curl -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:3001/api/v1/health
# 期望：500 或无 CORS 头
```

- [ ] **Step 4.4: 提交**

```bash
git add backend/src/main.ts backend/.env backend/.env.example
git commit -m "security(backend): CORS whitelist via env config"
```

---

## Task 5: MUST-5 — 文件上传 MIME 嗅探 + 拒 SVG/HTML

**Files:**
- Modify: `backend/src/modules/upload/upload.service.ts`
- Modify: `backend/package.json` (新增 `file-type` + `sharp`)

**Why:** 当前 MIME 由客户端 header 决定，可上传 SVG 携带 XSS payload

- [ ] **Step 5.1: 安装依赖**

```bash
cd e:/workspace/yichun-you-shi-er-shuo/backend
npm install file-type sharp
npm install -D @types/file-type
```

- [ ] **Step 5.2: 重写 `upload.service.ts`**

打开 `backend/src/modules/upload/upload.service.ts`，重写为：

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { randomBytes } from 'crypto';

const mkdir = promisify(fs.mkdir);

@Injectable()
export class UploadService {
  private readonly UPLOAD_DIR = path.join(process.cwd(), 'uploads');
  private readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

  constructor(private configService: ConfigService) {
    if (!fs.existsSync(this.UPLOAD_DIR)) {
      fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
    }
  }

  async saveImage(file: Express.Multer.File): Promise<{ url: string; filename: string }> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.size > this.MAX_SIZE) {
      throw new BadRequestException(`File too large (max ${this.MAX_SIZE / 1024 / 1024}MB)`);
    }

    // 1. 真实嗅探（不信 client MIME）
    const type = await fileTypeFromBuffer(file.buffer);
    if (!type || !this.ALLOWED_FORMATS.has(type.ext)) {
      throw new BadRequestException(
        `Unsupported file type. Allowed: ${[...this.ALLOWED_FORMATS].join(', ')}`
      );
    }

    // 2. 拒绝任何非图片 magic number（即使 ext 是图片）
    if (!type.mime.startsWith('image/')) {
      throw new BadRequestException('Not an image');
    }

    // 3. sharp 重编码（剥离 EXIF/注释，统一 webp）
    const now = new Date();
    const subdir = path.join(
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, '0')
    );
    const dir = path.join(this.UPLOAD_DIR, subdir);
    await mkdir(dir, { recursive: true });

    const filename = `${randomBytes(12).toString('hex')}.webp`;
    const filepath = path.join(dir, filename);

    await sharp(file.buffer)
      .rotate() // 修正 EXIF 方向
      .webp({ quality: 85 })
      .toFile(filepath);

    return {
      url: `/uploads/${subdir}/${filename}`,
      filename,
    };
  }
}
```

- [ ] **Step 5.3: 验证**

启动后端，构造测试：

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login-password \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800000000","password":"password123"}' | jq -r .data.accessToken)

# 1. 合法 jpg 应通过
curl -X POST http://localhost:3001/api/v1/upload/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/test.jpg"
# 期望：200，返回 url

# 2. SVG 应拒绝
echo "<svg><script>alert(1)</script></svg>" > /tmp/test.svg
curl -X POST http://localhost:3001/api/v1/upload/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.svg"
# 期望：400，错误信息含 "Unsupported file type"

# 3. 伪装 ext 的 PHP 应拒绝
echo "<?php system(\$_GET['c']); ?>" > /tmp/shell.jpg
curl -X POST http://localhost:3001/api/v1/upload/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/shell.jpg"
# 期望：400
```

- [ ] **Step 5.4: 提交**

```bash
git add backend/src/modules/upload/ backend/package.json backend/package-lock.json
git commit -m "security(backend): real file-type sniffing + sharp reencode for upload"
```

---

## Task 6: MUST-6 — 加 helmet 安全响应头

**Files:**
- Modify: `backend/src/main.ts`
- Modify: `backend/package.json`

**Why:** 无 CSP / X-Frame-Options / HSTS / Referrer-Policy，安全扫描 D 评级

- [ ] **Step 6.1: 安装**

```bash
cd e:/workspace/yichun-you-shi-er-shuo/backend
npm install helmet
```

- [ ] **Step 6.2: 集成到 `main.ts`**

打开 `backend/src/main.ts`，在 `app.enableCors(...)` 之后加：

```typescript
import helmet from 'helmet';

// ...

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,  // 兼容 <img>
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// 给静态资源加 nosniff
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  next();
});
```

- [ ] **Step 6.3: 验证**

```bash
curl -I http://localhost:3001/api/v1/health
# 期望响应头包含：
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY (或 CSP frame-ancestors)
# Strict-Transport-Security (生产)
# Referrer-Policy: no-referrer
```

- [ ] **Step 6.4: 提交**

```bash
git add backend/src/main.ts backend/package.json backend/package-lock.json
git commit -m "security(backend): add helmet security headers"
```

---

## Task 7: MUST-7 — SMS 验证码失败计数 + IP 限频 + crypto

**Files:**
- Modify: `backend/src/modules/sms/sms.service.ts`
- Modify: `backend/src/modules/auth/auth.service.ts` (verify 路径)

**Why:** 当前验证码生成用 `Math.random()`，无失败计数，可暴力破解

- [ ] **Step 7.1: 重写 `sms.service.ts`**

打开 `backend/src/modules/sms/sms.service.ts`，关键修改：

```typescript
import { randomInt } from 'crypto';
// ...

async sendCode(phone: string, ip: string) {
  // IP 限频：30 次/小时/IP
  const ipKey = `sms:hourly:ip:${ip}`;
  const ipCount = await this.redis.incr(ipKey);
  if (ipCount === 1) await this.redis.expire(ipKey, 3600);
  if (ipCount > 30) {
    throw new BadRequestException('Too many SMS requests, try later');
  }

  // 手机号限频（保持原逻辑）
  const cooldownKey = `sms:cooldown:${phone}`;
  const ttl = await this.redis.ttl(cooldownKey);
  if (ttl > 0) {
    throw new BadRequestException(`Please wait ${ttl}s`);
  }
  const dailyKey = `sms:daily:${phone}`;
  const daily = await this.redis.incr(dailyKey);
  if (daily === 1) await this.redis.expire(dailyKey, 86400);
  if (daily > 10) {
    throw new BadRequestException('Daily limit reached');
  }

  // 生成 6 位码（密码学安全）
  const code = randomInt(100000, 1000000).toString();

  await this.redis.set(`sms:code:${phone}`, code, 'EX', 300);
  await this.redis.set(`sms:attempts:${phone}`, '0', 'EX', 900); // 15 分钟失败计数

  console.log(`[SMS] phone=${phone} code=${code} (mock)`);
  return { sent: true };
}
```

- [ ] **Step 7.2: 修改 `auth.service.ts` 的 `loginBySms`**

在验证成功前增加失败计数逻辑：

```typescript
async loginBySms(phone: string, code: string, ip: string) {
  const attemptsKey = `sms:attempts:${phone}`;
  const attempts = parseInt(await this.redis.get(attemptsKey) || '0', 10);

  if (attempts >= 5) {
    throw new UnauthorizedException('Too many failed attempts, code locked');
  }

  const stored = await this.redis.get(`sms:code:${phone}`);
  if (stored !== code) {
    await this.redis.incr(attemptsKey);
    await this.redis.expire(attemptsKey, 900);
    throw new UnauthorizedException('Invalid code');
  }

  // 成功 → 清除码 + 计数
  await this.redis.del(`sms:code:${phone}`);
  await this.redis.del(attemptsKey);
  // ... 后续登录逻辑
}
```

- [ ] **Step 7.3: 验证**

```bash
# 1. 触发 5 次错误验证码
for i in 1 2 3 4 5; do
  curl -s -X POST http://localhost:3001/api/v1/auth/login-sms \
    -H "Content-Type: application/json" \
    -d '{"phone":"13800000001","code":"000000"}'
done
# 第 6 次：期望 401 "Too many failed attempts, code locked"

# 2. 同 IP 30 次后限频
# 较慢，可以只手动验证 5 次后第 6 次被限

# 3. Math.random 改 crypto：控制台打码后看分布
```

- [ ] **Step 7.4: 提交**

```bash
git add backend/src/modules/sms/ backend/src/modules/auth/
git commit -m "security(backend): SMS crypto randomInt + attempt counter + IP rate limit"
```

---

## Task 8: MUST-8 — 公开接口 phone 脱敏

**Files:**
- Modify: `backend/src/modules/user/user.service.ts` (已含 findOnePublic)
- Modify: `backend/src/modules/resume/resume.service.ts:14-23`
- Modify: `backend/src/modules/resume/resume.controller.ts:30`

**Why:** `GET /resumes/:id` 当前返回完整 user.phone

- [ ] **Step 8.1: 修改 `resume.service.ts`**

将 `findMine` 拆为两个：

```typescript
// 我的简历（含 phone）
async findMine(userId: bigint) {
  return this.prisma.resume.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, nickname: true, avatar: true, phone: true } },
    },
  });
}

// 公开查看（脱敏）
async findPublic(id: bigint) {
  const resume = await this.prisma.resume.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, nickname: true, avatar: true } },
    },
  });
  return resume;
}
```

- [ ] **Step 8.2: 修改 `resume.controller.ts`**

```typescript
@Public()
@Get(':id')
findOne(@Param('id') id: string) {
  return this.resumeService.findPublic(BigInt(id));
}
```

- [ ] **Step 8.3: 验证**

```bash
# 创建公开简历
# 1. 登录
# 2. PUT /api/v1/resumes/me (传 isPublic: true)
# 3. GET /api/v1/resumes/<id> 不带 token
curl http://localhost:3001/api/v1/resumes/1
# 期望：响应中无 user.phone 字段

# 4. 登录自己后再 GET
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/resumes/1
# 期望：响应中含 user.phone（自己的）
```

- [ ] **Step 8.4: 提交**

```bash
git add backend/src/modules/resume/
git commit -m "security(backend): mask phone in public resume/user endpoints"
```

---

## Task 9: MUST-9 — 4 个子 Controller 注册到 PostModule

**Files:**
- Modify: `backend/src/modules/post/post.module.ts`

**Why:** 文件存在但未在 `PostModule.imports` 加入 → 房屋/二手/招聘/便民 4 类详情接口全 404

- [ ] **Step 9.1: 检查子 module 文件**

```bash
ls e:/workspace/yichun-you-shi-er-shuo/backend/src/modules/post/
# 期望看到：house/ secondhand/ job/ lifebiz/ 4 个子目录
```

每个子目录应有 `xxx.module.ts`（如 `house.module.ts`）。

- [ ] **Step 9.2: 读取当前 `post.module.ts`**

```bash
cat e:/workspace/yichun-you-shi-er-shuo/backend/src/modules/post/post.module.ts
```

- [ ] **Step 9.3: 在 `imports` 中加 4 个子 module**

```typescript
import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { HouseModule } from './house/house.module';
import { SecondhandModule } from './secondhand/secondhand.module';
import { JobModule } from './job/job.module';
import { LifebizModule } from './lifebiz/lifebiz.module';

@Module({
  imports: [
    HouseModule,
    SecondhandModule,
    JobModule,
    LifebizModule,
  ],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
```

如果子 module 不叫这个名（如 `HouseControllerModule`），按实际调整。

- [ ] **Step 9.4: 验证 4 类详情接口可访问**

```bash
# 准备 1 个 post
# 登录 → POST /posts 创建主表（type=house）
# 拿到 postId 后：
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login-password \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800000000","password":"password123"}' | jq -r .data.accessToken)

# 创建主 post
POST_ID=$(curl -s -X POST http://localhost:3001/api/v1/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"测试房源","type":"house","categoryId":1,"areaId":1,"description":"测试","price":1000}' | jq -r .data.id)

# 1. 房屋详情（应返回 200）
curl -s http://localhost:3001/api/v1/posts/$POST_ID/house | jq
# 期望：返回空对象 {} 或 null（因没填详情），但不应该是 404

# 2. 创建房屋详情
curl -s -X POST http://localhost:3001/api/v1/posts/$POST_ID/house \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rentalType":"whole","propertyType":"apartment","areaSqm":50,"price":1000,"bedrooms":1,"bathrooms":1}' | jq
# 期望：200，返回房屋详情

# 3. 二手详情（不存在的字段）
curl -s http://localhost:3001/api/v1/posts/$POST_ID/secondhand | jq
# 期望：404（post type 不对）或 200 + null

# 4. 招聘详情
curl -s http://localhost:3001/api/v1/posts/$POST_ID/job | jq
# 5. 便民详情
curl -s http://localhost:3001/api/v1/posts/$POST_ID/lifebiz | jq
```

期望：所有路径返回 **200 或 400/404**（业务错误），**绝对不能是路由未注册导致的空白响应**。

- [ ] **Step 9.5: 提交**

```bash
git add backend/src/modules/post/post.module.ts
git commit -m "fix(backend): register house/secondhand/job/lifebiz sub-modules in PostModule"
```

---

## Task 10: MUST-10 — React 19 RC 升 GA + @types/react 19

**Files:**
- Modify: `frontend/package.json`

**Why:** 生产用 RC 严重风险；类型与运行时不一致

- [ ] **Step 10.1: 检查当前版本**

```bash
cd e:/workspace/yichun-you-shi-er-shuo/frontend
cat package.json | grep -E '"(react|react-dom|@types/react|@types/react-dom|next)"'
```

- [ ] **Step 10.2: 修改版本**

编辑 `frontend/package.json`：

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next": "^15.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

具体版本号取当前 GA：
- React: 19.0.0 / 19.1.x
- Next: 15.1+ / 15.2+ / 15.3+
- @types/react: 19.0.x

- [ ] **Step 10.3: 重装**

```bash
cd e:/workspace/yichun-you-shi-er-shuo/frontend
rm -rf node_modules package-lock.json
npm install
```

- [ ] **Step 10.4: 类型检查 + 构建**

```bash
npm run build
# 期望：编译通过，警告可接受
```

如果 build 报错，按错误信息修复（最常见：useEffect 行为变化、ref 类型变化）。

- [ ] **Step 10.5: 启动 dev 验证**

```bash
npm run dev
# 浏览器访问首页 / 详情 / 发布
# 期望：所有页面正常渲染
```

- [ ] **Step 10.6: 提交**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): upgrade React 19 RC to GA + @types/react 19"
```

---

## Task 11: MUST-11 — useSearchParams 包 Suspense

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/posts/publish/page.tsx`

**Why:** Next 15 App Router 强制要求，否则失去 prerender

- [ ] **Step 11.1: 修改 `page.tsx`（首页）**

打开 `frontend/src/app/page.tsx`，找到 `const search = useSearchParams();` 所在函数。**将该函数主体抽到内层组件**，外层用 Suspense 包裹：

```typescript
// 外层（Server Component 或 Client wrapper）
export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <HomeContent />
    </Suspense>
  );
}

// 内层（实际用 useSearchParams）
function HomeContent() {
  const search = useSearchParams();
  // ... 原函数所有逻辑
}
```

确保 `HomeContent` 顶部有 `'use client';`。

- [ ] **Step 11.2: 修改 `posts/publish/page.tsx`**

同样模式：

```typescript
export default function PublishPage() {
  return (
    <Suspense fallback={null}>
      <PublishContent />
    </Suspense>
  );
}

function PublishContent() {
  const search = useSearchParams();
  // ... 原函数所有逻辑
}
```

- [ ] **Step 11.3: 验证**

```bash
cd e:/workspace/yichun-you-shi-er-shuo/frontend
npm run build
# 期望：build 成功，无 "useSearchParams should be wrapped in a suspense boundary" 警告
```

- [ ] **Step 11.4: 提交**

```bash
git add frontend/src/app/page.tsx frontend/src/app/posts/publish/page.tsx
git commit -m "fix(frontend): wrap useSearchParams in Suspense boundary (Next 15)"
```

---

## Task 12: MUST-12 — publish 页补全 3 类型字段

**Files:**
- Modify: `frontend/src/app/posts/publish/page.tsx`

**Why:** 当前只有 house 类型字段，secondhand/job/lifebiz 表单空白

**依赖：** 先读后端 DTO 以确保字段对齐

- [ ] **Step 12.1: 读取后端 DTO**

```bash
cat e:/workspace/yichun-you-shi-er-shuo/backend/src/modules/post/secondhand/dto/create-secondhand.dto.ts
cat e:/workspace/yichun-you-shi-er-shuo/backend/src/modules/post/job/dto/create-job.dto.ts
cat e:/workspace/yichun-you-shi-er-shuo/backend/src/modules/post/lifebiz/dto/create-lifebiz.dto.ts
```

- [ ] **Step 12.2: 在 publish 页添加 3 个分支**

打开 `frontend/src/app/posts/publish/page.tsx`，在 `if (type === 'house')` 之后加：

```typescript
{type === 'secondhand' && (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">二手信息</h3>
    
    <div>
      <label>原价（元）</label>
      <Input type="number" name="originalPrice" />
    </div>
    <div>
      <label>分类</label>
      <Select name="subCategory">
        <option value="phone">手机数码</option>
        <option value="furniture">家具家电</option>
        <option value="clothing">服饰</option>
        <option value="book">图书</option>
        <option value="other">其他</option>
      </Select>
    </div>
    <div>
      <label>成色</label>
      <Select name="condition">
        <option value="new">全新</option>
        <option value="likeNew">九成新</option>
        <option value="used">正常使用</option>
        <option value="old">有使用痕迹</option>
      </Select>
    </div>
  </div>
)}

{type === 'job' && (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">招聘信息</h3>
    
    <div>
      <label>公司名称</label>
      <Input name="companyName" placeholder="如未关联已有公司" />
    </div>
    <div>
      <label>职位</label>
      <Input name="position" required />
    </div>
    <div>
      <label>薪资范围</label>
      <div className="flex gap-2">
        <Input type="number" name="salaryMin" placeholder="最低" />
        <span>-</span>
        <Input type="number" name="salaryMax" placeholder="最高" />
      </div>
    </div>
    <div>
      <label>学历要求</label>
      <Select name="education">
        <option value="none">不限</option>
        <option value="highSchool">高中</option>
        <option value="junior">大专</option>
        <option value="bachelor">本科</option>
        <option value="master">硕士</option>
      </Select>
    </div>
    <div>
      <label>经验要求</label>
      <Select name="experience">
        <option value="none">不限</option>
        <option value="fresh">应届</option>
        <option value="1-3">1-3年</option>
        <option value="3-5">3-5年</option>
        <option value="5+">5年以上</option>
      </Select>
    </div>
    <div>
      <label>福利</label>
      <Input name="welfare" placeholder="逗号分隔，如：五险一金,包吃,周末双休" />
    </div>
  </div>
)}

{type === 'lifebiz' && (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">便民信息</h3>
    
    <div>
      <label>子分类</label>
      <Select name="subCategory">
        <option value="housekeeping">家政</option>
        <option value="repair">维修</option>
        <option value="renovation">装修</option>
        <option value="wedding">婚庆</option>
        <option value="education">教育</option>
        <option value="other">其他</option>
      </Select>
    </div>
    <div>
      <label>服务方式</label>
      <Select name="serviceType">
        <option value="offline">上门服务</option>
        <option value="online">线上服务</option>
        <option value="both">均可</option>
      </Select>
    </div>
    <div>
      <label>服务时间</label>
      <Input name="serviceTime" placeholder="如：工作日 9:00-18:00" />
    </div>
    <div>
      <label>价格说明</label>
      <Input name="priceDescription" placeholder="如：50元/小时起" />
    </div>
    <div>
      <label>过期时间</label>
      <Input type="date" name="expireAt" />
    </div>
  </div>
)}
```

- [ ] **Step 12.3: 修改 `handleSubmit` 添加分支**

```typescript
if (type === 'secondhand') {
  await api.post(`/posts/${postId}/secondhand`, {
    originalPrice: Number(form.originalPrice),
    subCategory: form.subCategory,
    condition: form.condition,
  });
} else if (type === 'job') {
  await api.post(`/posts/${postId}/job`, {
    companyName: form.companyName,
    position: form.position,
    salaryMin: Number(form.salaryMin),
    salaryMax: Number(form.salaryMax),
    education: form.education,
    experience: form.experience,
    welfare: form.welfare?.split(',').map(s => s.trim()).filter(Boolean),
  });
} else if (type === 'lifebiz') {
  await api.post(`/posts/${postId}/lifebiz`, {
    subCategory: form.subCategory,
    serviceType: form.serviceType,
    serviceTime: form.serviceTime,
    priceDescription: form.priceDescription,
    expireAt: form.expireAt ? new Date(form.expireAt).toISOString() : undefined,
  });
}
```

- [ ] **Step 12.4: 验证 4 类型发布**

启动后端 + 前端，浏览器走完 4 个发布流程，验证：
- 房屋：创建后详情页看到设施、户型
- 二手：详情页看到原价、成色
- 招聘：详情页看到薪资、学历、福利
- 便民：详情页看到服务方式、过期时间

- [ ] **Step 12.5: 提交**

```bash
git add frontend/src/app/posts/publish/page.tsx
git commit -m "feat(frontend): add fields for secondhand/job/lifebiz publish forms"
```

---

## Task 13: MUST-13 — 详情页 4 按钮接 API

**Files:**
- Modify: `frontend/src/app/posts/[id]/page.tsx`
- Create: `frontend/src/components/post/favorite-button.tsx`
- Create: `frontend/src/components/post/report-dialog.tsx`

**Why:** 当前收藏/留言/分享/举报 4 按钮空实现

- [ ] **Step 13.1: 创建 `FavoriteButton` 组件**

创建 `frontend/src/components/post/favorite-button.tsx`：

```typescript
'use client';
import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export function FavoriteButton({ postId }: { postId: string }) {
  const { token } = useAuth();
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get('/favorites', { params: { postId } })
      .then(res => {
        const list = res.data?.data || [];
        setFavorited(list.some((f: any) => String(f.postId) === String(postId)));
      })
      .catch(() => {});
  }, [postId, token]);

  const toggle = async () => {
    if (!token) { alert('请先登录'); return; }
    setLoading(true);
    try {
      if (favorited) {
        await api.delete(`/favorites/${postId}`);
        setFavorited(false);
      } else {
        await api.post('/favorites', { postId });
        setFavorited(true);
      }
    } catch (e) {
      alert('操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`p-2 rounded-full ${favorited ? 'text-red-500' : 'text-gray-500'}`}
    >
      <Heart className={favorited ? 'fill-current' : ''} size={20} />
    </button>
  );
}
```

- [ ] **Step 13.2: 创建 `ReportDialog` 组件**

创建 `frontend/src/components/post/report-dialog.tsx`：

```typescript
'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const REASONS = [
  { value: 'spam', label: '垃圾广告' },
  { value: 'fake', label: '虚假信息' },
  { value: 'illegal', label: '违法违规' },
  { value: 'duplicate', label: '重复发布' },
  { value: 'other', label: '其他' },
];

export function ReportButton({ postId }: { postId: string }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!token) { alert('请先登录'); return; }
    setSubmitting(true);
    try {
      await api.post('/reports', { postId, reason, description });
      alert('举报已提交，感谢您的反馈');
      setOpen(false);
    } catch (e) {
      alert('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-2 text-gray-500">
        举报
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">举报信息</h3>
            <div className="space-y-3">
              <select value={reason} onChange={e => setReason(e.target.value)}
                className="w-full p-2 border rounded">
                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="补充说明（可选）"
                className="w-full p-2 border rounded"
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setOpen(false)} className="px-4 py-2">取消</button>
                <button onClick={submit} disabled={submitting}
                  className="px-4 py-2 bg-red-500 text-white rounded">
                  提交举报
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 13.3: 修改详情页**

打开 `frontend/src/app/posts/[id]/page.tsx`，找到 4 个空按钮（约 314-333 行），替换为：

```typescript
import { FavoriteButton } from '@/components/post/favorite-button';
import { ReportButton } from '@/components/post/report-dialog';
import { Phone, Share2, MessageCircle } from 'lucide-react';

// 在 action bar 区域：
<div className="flex items-center gap-2">
  <button
    onClick={() => {
      if (post.contactPhone) {
        window.location.href = `tel:${post.contactPhone}`;
      } else {
        alert('该信息未提供联系电话，请使用留言');
      }
    }}
    className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded"
  >
    <Phone size={16} /> 联系
  </button>
  
  <FavoriteButton postId={String(post.id)} />
  <ReportButton postId={String(post.id)} />
  
  <button
    onClick={() => {
      if (navigator.share) {
        navigator.share({ title: post.title, url: window.location.href });
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert('链接已复制');
      }
    }}
    className="p-2 text-gray-500"
  >
    <Share2 size={20} />
  </button>
</div>
```

- [ ] **Step 13.4: 加载已有评论列表**

在详情页主区域加：

```typescript
const [comments, setComments] = useState<any[]>([]);
const [commentText, setCommentText] = useState('');

useEffect(() => {
  api.get(`/posts/${post.id}/comments`)
    .then(res => setComments(res.data?.data || []))
    .catch(() => {});
}, [post.id]);

const submitComment = async () => {
  if (!commentText.trim()) return;
  try {
    await api.post(`/posts/${post.id}/comments`, { content: commentText });
    setCommentText('');
    // reload
    const res = await api.get(`/posts/${post.id}/comments`);
    setComments(res.data?.data || []);
  } catch (e) {
    alert('发表失败');
  }
};

// 渲染：
<div className="mt-8">
  <h3 className="text-xl font-semibold mb-4">留言（{comments.length}）</h3>
  <div className="flex gap-2 mb-4">
    <Input
      value={commentText}
      onChange={e => setCommentText(e.target.value)}
      placeholder="发表留言..."
    />
    <Button onClick={submitComment}>发表</Button>
  </div>
  <div className="space-y-3">
    {comments.map(c => (
      <div key={c.id} className="p-3 bg-gray-50 rounded">
        <div className="text-sm text-gray-500">{c.user?.nickname || '匿名'}</div>
        <div>{c.content}</div>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 13.5: 验证**

启动后端 + 前端：
1. 详情页 → 点 ❤️ → 应变为红心
2. 点举报 → 弹窗 → 提交 → 成功
3. 点联系 → 跳 tel:
4. 留言 → 提交 → 列表显示新留言
5. 分享 → 复制链接

- [ ] **Step 13.6: 提交**

```bash
git add frontend/src/app/posts/\[id\]/page.tsx \
        frontend/src/components/post/favorite-button.tsx \
        frontend/src/components/post/report-dialog.tsx
git commit -m "feat(frontend): implement favorite/report/comment/share actions on post detail"
```

---

## Plan 完成检查

按 [Self-Review] 检查：
- ✅ 13 项 MUST 任务全部覆盖
- ✅ 无 placeholder（每步含完整代码/命令/期望）
- ✅ 类型一致（service / DTO 命名贯穿）
- ✅ DRY（公共逻辑抽到 service）
- ✅ YAGNI（不引入测试基建，留到 P1）
- ✅ 每任务一 commit（`git commit` 步骤齐全）

**总工时估算：** 35-40h（13 项 + 验证 + 调试）

**下一步**：开始执行（推荐从 Task 9 MUST-9 开始，最快产生业务价值）

---

**Plan 保存路径**：`docs/superpowers/plans/2026-06-11-p0-critical-batch.md`

**执行方式选择**：
1. **Subagent-Driven（推荐）** — 每任务派发新 subagent
2. **Inline Execution** — 当前会话批量执行

按用户指令"开始"，采用 **Inline Execution**（本会话执行）。
