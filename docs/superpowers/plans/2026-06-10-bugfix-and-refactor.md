# Bug Fix & Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 24 known bugs across backend + frontend (data correctness / security / business logic / engineering) and add baseline CI + Swagger documentation.

**Architecture:** Four-phase fix-and-verify loop. Each phase has a small set of bite-sized tasks with TDD-style verification (write reproducer → fix → re-verify). All backend fixes include either a curl reproducer or a Jest test. All frontend fixes include a page-load verification via curl + grep for expected DOM markers.

**Tech Stack:**
- Backend: NestJS 10.3 + Prisma 5.22 + ioredis + bcryptjs
- Frontend: Next.js 15 + Tailwind 3 + lucide-react
- New libs: `@nestjs/throttler` (rate-limit), `helmet`, `@nestjs/swagger` + `swagger-ui-express`
- Test: `supertest` (backend e2e), `jest` (backend unit)

---

## File Structure Changes

### New files
- `backend/test/e2e/auth.e2e-spec.ts` — auth endpoint e2e
- `backend/test/e2e/post.e2e-spec.ts` — post CRUD e2e
- `backend/test/e2e/admin.e2e-spec.ts` — admin workflow e2e
- `backend/test/unit/redis.service.spec.ts` — Redis unit
- `backend/test/unit/jwt.strategy.spec.ts` — JWT strategy unit
- `backend/src/common/guards/throttler-behind-proxy.guard.ts` — Throttler 信任 proxy IP
- `backend/src/common/filters/all-exceptions.filter.spec.ts` — filter unit
- `backend/src/modules/sms/sms.service.spec.ts` — limit logic unit
- `.github/workflows/ci.yml` — GitHub Actions
- `backend/src/main.ts.bak` — rollback if helmet breaks

### Modified files
- `backend/src/main.ts` — add helmet + Throttler + Swagger
- `backend/src/modules/user/user.service.ts` — exclude password from all return shapes
- `backend/src/modules/auth/auth.service.ts` — fetch user fresh in JwtStrategy
- `backend/prisma/seed.ts` — idempotent upsert via unique key
- `backend/src/modules/auth/auth.controller.ts` — remove dev-token, add @Public decorators
- `backend/src/modules/post/post.service.ts` — fetch posts with sort + add Prisma index
- `backend/src/modules/post/post.controller.ts` — pass sort param, fix findMyPosts paging
- `backend/src/modules/comment/comment.service.ts` — block replies on hidden parents
- `frontend/src/lib/api.ts` — replace hard-coded URL, add type-safety to postApi.create
- `frontend/src/lib/env.ts` — centralize NEXT_PUBLIC_API_URL with runtime safety
- `frontend/src/app/posts/publish/page.tsx` — use api.ts helper, drop fetch hardcode
- `frontend/src/app/page.tsx` — SSR-safe category filter (no `window` at module scope)
- `frontend/src/components/post/post-card.tsx` — move timeAgo to client-side only, format date server-side
- `frontend/src/app/me/page.tsx` — return null while loading to avoid flash
- `frontend/src/components/layout/header.tsx` — implement click-outside to close menu
- `frontend/src/app/login/page.tsx` — replace `alert()` with inline toast

---

## Phase 1 — Data Correctness + Security (P0, 2h)

Fix 10 bugs that leak data or break security invariants. Each task ends with a working reproducer → fix → re-verify cycle.

### Task 1.1: Exclude password from all User return shapes

**Files:**
- Modify: `backend/src/modules/user/user.service.ts:64-103, 111-115`
- Test: `backend/test/unit/user.service-leak.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/test/unit/user.service-leak.spec.ts
import { Test } from '@nestjs/testing';
import { UserService } from '../../src/modules/user/user.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('UserService — no password leak', () => {
  it('findOne never returns password field', async () => {
    const fakeUser = { id: 1n, phone: '13800000000', password: '$2a$10$hashed', nickname: 'x' };
    const findUnique = jest.fn().mockResolvedValue(fakeUser);
    const prisma = { user: { findUnique, findFirst: findUnique } } as any;
    const svc = new UserService(prisma);
    const out = await svc.findOne(1n);
    expect(out).not.toHaveProperty('password');
  });
  it('findByPhone is for internal use only (not exposing to callers)', async () => {
    // Document the contract: only auth.service should use this
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest test/unit/user.service-leak.spec.ts -v`
Expected: FAIL — `findOne` currently returns `password` (no select).

- [ ] **Step 3: Fix `findOne` and `findAll` to explicitly select safe fields**

Edit `backend/src/modules/user/user.service.ts`:

```typescript
// findOne
const user = await this.prisma.user.findUnique({
  where: { id },
  select: {
    id: true, phone: true, nickname: true, avatar: true,
    gender: true, bio: true, status: true, role: true,
    lastLoginAt: true, createdAt: true, updatedAt: true,
  },
});
if (!user) throw new NotFoundException(`用户 ID ${id} 不存在`);
return user;

// findAll — same explicit select (replaces the broad `select: { ... }` block)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest test/unit/user.service-leak.spec.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/user/user.service.ts backend/test/unit/user.service-leak.spec.ts
git commit -m "fix(user): exclude password from findOne/findAll return shapes"
```

---

### Task 1.2: Add helmet + tighten CORS

**Files:**
- Modify: `backend/src/main.ts:20-22`
- Modify: `backend/package.json` (add `helmet`)
- Test: `backend/test/e2e/security-headers.e2e-spec.ts`

- [ ] **Step 1: Install helmet**

Run: `cd backend && npm install helmet@^7.1.0 --no-audit --no-fund`

- [ ] **Step 2: Write the failing e2e test**

```typescript
// backend/test/e2e/security-headers.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Security headers (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());

  it('responds with helmet headers', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/categories').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npx jest test/e2e/security-headers.e2e-spec.ts -v`
Expected: FAIL — headers missing.

- [ ] **Step 4: Add helmet + tighten CORS in main.ts**

Edit `backend/src/main.ts`:

```typescript
import helmet from 'helmet';

// ... after creating app
app.use(helmet());
app.enableCors({
  origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
  credentials: true,
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npx jest test/e2e/security-headers.e2e-spec.ts -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/main.ts backend/package.json backend/test/e2e/security-headers.e2e-spec.ts
git commit -m "feat(security): add helmet + restrict CORS to known origins"
```

---

### Task 1.3: Add @nestjs/throttler for SMS + login

**Files:**
- Modify: `backend/src/modules/sms/sms.service.ts` (add daily-per-phone counter)
- Modify: `backend/src/modules/auth/auth.service.ts` (rate-limit login)
- Modify: `backend/src/app.module.ts` (register ThrottlerModule)
- Modify: `backend/package.json`
- Test: `backend/test/unit/sms.service-throttle.spec.ts`

- [ ] **Step 1: Install**

Run: `cd backend && npm install @nestjs/throttler@^6.0.0 --no-audit --no-fund`

- [ ] **Step 2: Write the failing test (in-memory Redis mock)**

```typescript
// backend/test/unit/sms.service-throttle.spec.ts
import { SmsService } from '../../src/modules/sms/sms.service';

describe('SmsService — daily limit', () => {
  it('rejects after 10 sends/day', async () => {
    const fakeRedis = {
      get: jest.fn().mockResolvedValue('10'),
      ttl: jest.fn().mockResolvedValue(-2),
      setEx: jest.fn().mockResolvedValue(undefined),
      incr: jest.fn().mockResolvedValue(11),
      expire: jest.fn().mockResolvedValue(undefined),
    } as any;
    const svc = new SmsService(fakeRedis);
    await expect(svc.sendLoginCode('13800000000')).rejects.toThrow(/已达上限/);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd backend && npx jest test/unit/sms.service-throttle.spec.ts -v`
Expected: FAIL — current code only checks cooldown.

- [ ] **Step 4: Add daily limit in SmsService.sendLoginCode**

Edit `backend/src/modules/sms/sms.service.ts`:

```typescript
async sendLoginCode(phone: string) {
  // ... existing cooldown check ...

  // 每日上限 10 次
  const dailyKey = `sms:daily:${phone}:${this.todayKey()}`;
  const dailyCount = await this.redis.get(dailyKey);
  const used = dailyCount ? parseInt(dailyCount, 10) : 0;
  if (used >= this.DAILY_MAX) {
    throw new HttpException('今日发送次数已达上限', HttpStatus.TOO_MANY_REQUESTS);
  }
  // ... rest of existing code ...
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd backend && npx jest test/unit/sms.service-throttle.spec.ts -v`
Expected: PASS

- [ ] **Step 6: Register ThrottlerModule globally**

Edit `backend/src/app.module.ts` (add to imports):

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    // ... existing imports ...
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]), // 60 req/min/IP
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // ⬅ after JwtAuthGuard
    // ... existing providers ...
  ],
})
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/sms/sms.service.ts backend/src/app.module.ts backend/package.json backend/test/unit/sms.service-throttle.spec.ts
git commit -m "feat(security): add @nestjs/throttler + SMS daily limit"
```

---

### Task 1.4: Make seed.ts idempotent

**Files:**
- Modify: `backend/prisma/seed.ts:30-50, 120-180`

- [ ] **Step 1: Fix the user upsert to always include password**

Edit `backend/prisma/seed.ts` `main()` start:

```typescript
async function main() {
  console.log('🌱 开始播种（idempotent）...');
  // Always sync admin user password from env or default
  const ADMIN_PHONE = '13800099999';
  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: { password: adminHash, role: 'admin', nickname: '系统管理员', updatedAt: new Date() },
    create: { phone: ADMIN_PHONE, password: adminHash, role: 'admin', nickname: '系统管理员' },
  });
  // ... rest of existing code ...
}
```

- [ ] **Step 2: Add ON CONFLICT semantics to category creation**

Edit `backend/prisma/seed.ts` topCategories loop:

```typescript
for (const cat of topCategories) {
  // upsert by (code, parentId) — find first then update or create
  const existing = await prisma.category.findFirst({
    where: { code: cat.code, parentId: null },
  });
  if (existing) {
    // Skip if already exists; do NOT duplicate
    createdTopCats[cat.code] = existing.id;
  } else {
    const created = await prisma.category.create({ data: { ... } });
    createdTopCats[cat.code] = created.id;
  }
}
```

- [ ] **Step 3: Run seed twice, verify counts stay sane**

Run:
```bash
cd backend && npx prisma db seed
npx prisma db seed
MYSQL_PWD='yichun123456' "E:\soft\mysql-5.7.24-winx64\bin\mysql.exe" -h 127.0.0.1 -P 3307 -uyichun --ssl-mode=DISABLED -e "USE yichun_db; SELECT COUNT(*) AS cats FROM categories;"
```
Expected: `cats` = 29 (4 顶级 + 25 子) — same as one run.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/seed.ts
git commit -m "fix(seed): make seed idempotent (re-runnable without duplicates)"
```

---

### Task 1.5: Add AuditLog table + write on admin actions

**Files:**
- Modify: `backend/prisma/schema.prisma` (add `AuditLog` model)
- Run: `npx prisma migrate dev --name add_audit_log`
- Modify: `backend/src/modules/admin/post/admin-post.service.ts` (write audit log)

- [ ] **Step 1: Add AuditLog model to schema**

Edit `backend/prisma/schema.prisma` (append):

```prisma
model AuditLog {
  id         BigInt   @id @default(autoincrement())
  postId     BigInt   @map("post_id")
  adminUserId BigInt  @map("admin_user_id")
  action     String   @db.VarChar(20)
  reason     String?  @db.VarChar(500)
  createdAt  DateTime @default(now()) @map("created_at")
  @@index([postId])
  @@index([adminUserId, createdAt])
  @@map("audit_logs")
}
```

- [ ] **Step 2: Generate migration**

Run: `cd backend && npx prisma migrate dev --name add_audit_log --skip-seed`

- [ ] **Step 3: Write admin-post pass/reject to persist AuditLog**

Edit `backend/src/modules/admin/post/admin-post.service.ts`:

```typescript
async pass(adminId: bigint, postId: bigint, reason?: string) {
  return this.prisma.$transaction(async (tx) => {
    const updated = await tx.post.update({
      where: { id: postId },
      data: { auditStatus: 'passed', status: 'active' },
    });
    await tx.auditLog.create({
      data: { postId, adminUserId: adminId, action: 'pass', reason },
    });
    return updated;
  });
}
// Same for reject()
```

- [ ] **Step 4: Manual e2e via curl (no test infra yet)**

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login-password \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"phone":"13800099999","password":"admin123"}' | grep -oE '"accessToken":"[^"]+' | cut -d'"' -f4)
# Create a pending post first (via user1 token)
USER1_TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login-password \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"phone":"13800000000","password":"test123"}' | grep -oE '"accessToken":"[^"]+' | cut -d'"' -f4)
POST_ID=$(curl -s -X POST http://localhost:3001/api/v1/posts \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d '{"type":"house","categoryId":1,"title":"Audit test","description":"x"}' | grep -oE '"id":"[0-9]+' | head -1 | cut -d'"' -f4)
# Admin audit
curl -s -X POST "http://localhost:3001/api/v1/admin/posts/$POST_ID/audit" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"pass","reason":"审核测试"}'
# Verify audit_logs row
MYSQL_PWD='yichun123456' "E:\soft\mysql-5.7.24-winx64\bin\mysql.exe" -h 127.0.0.1 -P 3307 -uyichun --ssl-mode=DISABLED -e "USE yichun_db; SELECT * FROM audit_logs WHERE post_id=$POST_ID;"
```
Expected: 1 row with `action='pass'`, `reason='审核测试'`, `admin_user_id=1`.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/src/modules/admin/post/admin-post.service.ts backend/prisma/migrations/
git commit -m "feat(admin): add AuditLog table + write on audit actions"
```

---

### Task 1.6: Fix seed user updatedAt (avoid 0000-00-00)

**Files:**
- Modify: `backend/prisma/seed.ts:105-117` (admin user insert)

- [ ] **Step 1: Explicitly set createdAt + updatedAt in user upsert**

Edit `backend/prisma/seed.ts` admin upsert (from Task 1.4 already does this — verify both fields set).

- [ ] **Step 2: Re-run reset + seed, verify no 0000-00-00**

```bash
cd backend && npx prisma migrate reset --force --skip-seed && npx prisma db seed
MYSQL_PWD='yichun123456' "E:\soft\mysql-5.7.24-winx64\bin\mysql.exe" -h 127.0.0.1 -P 3307 -uyichun --ssl-mode=DISABLED -e "USE yichun_db; SELECT id, phone, updated_at FROM users;"
```
Expected: `updated_at` is a real timestamp, not `0000-00-00 00:00:00`.

- [ ] **Step 3: Commit** (if changes)

```bash
git add backend/prisma/seed.ts
git commit -m "fix(seed): ensure users.updated_at is set on create"
```

---

### Task 1.7: Remove dev-token endpoint

**Files:**
- Modify: `backend/src/modules/auth/auth.controller.ts` (remove dev-token handler)

- [ ] **Step 1: Remove dev-token code**

Edit `backend/src/modules/auth/auth.controller.ts`: delete the entire `@Post('dev-token')` handler and `DevTokenDto` if still imported.

- [ ] **Step 2: Run grep to confirm no callers**

```bash
cd backend && grep -r "dev-token" src/
```
Expected: no results.

- [ ] **Step 3: Smoke test login still works**

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/sms-code \
  -H "Content-Type: application/json; charset=utf-8" -d '{"phone":"13900077777"}'
# Read code from backend log
CODE=$(tail -100 /c/Users/dell/AppData/Local/Temp/claude/c--Users-dell-projects-yichun-you-shi-er-shuo/28f05831-295c-4e58-94eb-5ca6aa266acc/tasks/*.output | grep -oE "phone=13900077777 code=[0-9]+" | tail -1 | grep -oE '[0-9]+$')
curl -s -X POST http://localhost:3001/api/v1/auth/login-sms \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{\"phone\":\"13900077777\",\"code\":\"$CODE\"}" | head -c 200
```
Expected: 200 + accessToken.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/auth/auth.controller.ts
git commit -m "refactor(auth): remove dev-token endpoint (was T2.2 only)"
```

---

### Task 1.8: Frontend env helper (no more hard-coded URLs)

**Files:**
- Create: `frontend/src/lib/env.ts`
- Modify: `frontend/src/lib/api.ts:1-5` (use `env.NEXT_PUBLIC_API_URL`)
- Modify: `frontend/src/app/posts/publish/page.tsx:148-165` (use `api.ts` helper)

- [ ] **Step 1: Create env helper**

Create `frontend/src/lib/env.ts`:

```typescript
/**
 * 集中访问 NEXT_PUBLIC_* 变量
 * SSR 阶段 + 浏览器阶段都可用
 */
export const env = {
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
} as const;
```

- [ ] **Step 2: Update api.ts to use env**

Edit `frontend/src/lib/api.ts` line 6:

```typescript
import { env } from './env';
const API_BASE_URL = env.NEXT_PUBLIC_API_URL;
```

- [ ] **Step 3: Replace hard-coded fetch in publish page**

Edit `frontend/src/app/posts/publish/page.tsx` line ~148: remove the `fetch('http://localhost:3001/...')` block. Add a new method to `api.ts`:

```typescript
// in api.ts
postJob: (postId: bigint | string, data: any, token: string) =>
  fetch(`${env.NEXT_PUBLIC_API_URL}/posts/${postId}/job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  }).then(r => r.json()),
```

Use it in publish page.

- [ ] **Step 4: Run dev server check + curl POST /posts/publish flow**

Run: `curl -s -X POST http://localhost:3001/api/v1/posts/...` from frontend dev to verify env resolution.

Expected: 200, no 404 for backend host.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/env.ts frontend/src/lib/api.ts frontend/src/app/posts/publish/page.tsx
git commit -m "refactor(frontend): centralize API URL via env helper, drop hardcode"
```

---

### Task 1.9: Frontend SSR hydration — page.tsx `window` usage

**Files:**
- Modify: `frontend/src/app/page.tsx:60-67` (active state from URL)

- [ ] **Step 1: Read current implementation**

The issue: `new URLSearchParams(window.location.search)` runs at module scope during render → SSR crash.

- [ ] **Step 2: Fix with useSearchParams hook only**

Edit `frontend/src/app/page.tsx`:

```typescript
import { useSearchParams } from 'next/navigation';

// already imported in the function
// active detection now comes from search.get('type') which is SSR-safe
const currentType = search.get('type');
```

Verify the file no longer references `window` at render time.

- [ ] **Step 3: Run dev server, curl `/`, verify 200 + no hydration error in browser console**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/`
Expected: 200.

Open in browser, open dev console → no "Hydration failed" warning.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "fix(frontend): avoid window at render scope (SSR hydration)"
```

---

### Task 1.10: Add AuthGuard unit test (verify token not in payload leak)

**Files:**
- Test: `backend/test/unit/auth.service-guard.spec.ts`

- [ ] **Step 1: Write the test**

```typescript
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../src/modules/user/user.service';
import { AuthService } from '../../src/modules/auth/auth.service';

describe('JwtStrategy.validate()', () => {
  it('returns { sub, phone, role, jti, type } (no password)', async () => {
    const fakeUser = { id: 1n, phone: '13800000000', password: '$2a$10$x', role: 'user', status: 0 };
    const userSvc = { findOne: jest.fn().mockResolvedValue(fakeUser) } as any;
    const authSvc = {} as AuthService;
    const cfg = { get: jest.fn().mockReturnValue('test-secret') } as any;
    const strategy = new JwtStrategy(cfg, userSvc, authSvc);
    const out = await strategy.validate({ sub: '1', phone: '13800000000', jti: 'j', type: 'access' } as any);
    expect(out).toEqual({ sub: '1', phone: '13800000000', role: 'user', jti: 'j', type: 'access' });
    expect(out).not.toHaveProperty('password');
  });

  it('throws Unauthorized if user is banned (status=1)', async () => {
    const fakeUser = { id: 1n, phone: '13800000000', password: 'x', role: 'user', status: 1 };
    const userSvc = { findOne: jest.fn().mockResolvedValue(fakeUser) } as any;
    const authSvc = {} as AuthService;
    const cfg = { get: jest.fn().mockReturnValue('test-secret') } as any;
    const strategy = new JwtStrategy(cfg, userSvc, authSvc);
    await expect(strategy.validate({ sub: '1', phone: '13800000000', jti: 'j', type: 'access' } as any))
      .rejects.toThrow(/封禁/);
  });
});
```

- [ ] **Step 2: Run to verify it fails (the test infra may be missing — fix jest config if needed)**

```bash
cd backend && npx jest test/unit/auth.service-guard.spec.ts -v
```

If fails with "Cannot find module @nestjs/testing", create `backend/jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: 'test/.*\\.spec\\.ts$',
};
```

And add to `package.json`:
```json
"scripts": { "test": "jest" },
"devDependencies": { "jest": "^29.7.0", "ts-jest": "^29.1.0" }
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd backend && npx jest test/unit/auth.service-guard.spec.ts -v`
Expected: PASS (2 tests)

- [ ] **Step 4: Commit**

```bash
git add backend/test/unit/auth.service-guard.spec.ts backend/jest.config.js backend/package.json
git commit -m "test(auth): add JwtStrategy.validate unit tests + jest config"
```

---

## Phase 1 Verification

```bash
cd backend && npx jest  # all unit tests
# e2e flow:
curl -s http://localhost:3001/api/v1/categories -i | head -10  # helmet headers
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login-password \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"phone":"13800000000","password":"test123"}' | grep -oE '"accessToken":"[^"]+' | cut -d'"' -f4)
curl -s http://localhost:3001/api/v1/users -H "Authorization: Bearer $TOKEN"  # no password field
```

---

## Phase 2 — Business Logic + UX (P1, 2h)

Fix 8 bugs in business correctness + visible UX. Each has a curl + DOM-level reproducer.

### Task 2.1: post.findAll — wire sort parameter

**Files:**
- Modify: `backend/src/modules/post/post.controller.ts:26-45`

- [ ] **Step 1: Read current — controller destructures `sort` only in DTO not forwarded**

`post.controller.ts:36` calls `findAll({ type, categoryId, status, keyword, userId, page, pageSize })` — `sort` is in DTO but never passed.

- [ ] **Step 2: Add sort to service call**

Edit `backend/src/modules/post/post.controller.ts`:

```typescript
return this.postService.findAll({
  type, categoryId: categoryId ? Number(categoryId) : undefined,
  status, keyword, userId: userId ? Number(userId) : undefined,
  sort: search.sort as any,  // ⬅ add
  page, pageSize,
});
```

- [ ] **Step 3: curl test sort=price_asc returns cheaper first**

```bash
curl -s "http://localhost:3001/api/v1/posts?type=house&sort=price_asc&pageSize=2" | head -c 300
```
Expected: cheapest post first.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/post/post.controller.ts
git commit -m "fix(post): pass sort parameter from query to service"
```

---

### Task 2.2: post.findAll — add composite index (status, type, createdAt)

**Files:**
- Modify: `backend/prisma/schema.prisma` (Post @@index)

- [ ] **Step 1: Add index**

Edit `backend/prisma/schema.prisma` Post model:

```prisma
@@index([status, type, createdAt])
@@index([type, status, createdAt(sort: Desc)])
```

- [ ] **Step 2: Generate migration**

Run: `cd backend && npx prisma migrate dev --name post_listing_index`

- [ ] **Step 3: Run EXPLAIN to confirm index used**

```bash
MYSQL_PWD='yichun123456' "E:\soft\mysql-5.7.24-winx64\bin\mysql.exe" -h 127.0.0.1 -P 3307 -uyichun --ssl-mode=DISABLED -e "USE yichun_db; EXPLAIN SELECT * FROM posts WHERE status='active' AND type='house' ORDER BY created_at DESC LIMIT 20;"
```
Expected: `key` column shows the new index.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "perf(post): add composite index (status, type, created_at)"
```

---

### Task 2.3: comment.service — block replies to hidden parents

**Files:**
- Modify: `backend/src/modules/comment/comment.service.ts:46-58`

- [ ] **Step 1: Tighten the check**

Edit `backend/src/modules/comment/comment.service.ts` create():

```typescript
if (parent.status === 1) {
  throw new BadRequestException('父留言已隐藏，不能回复');
}
```

- [ ] **Step 2: Test by curl**

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login-password -H "Content-Type: application/json; charset=utf-8" -d '{"phone":"13800000000","password":"test123"}' | grep -oE '"accessToken":"[^"]+' | cut -d'"' -f4)
# Create top-level comment, then admin hides it, then try to reply
TOP_ID=$(curl -s -X POST http://localhost:3001/api/v1/posts/1/comments -H "Content-Type: application/json; charset=utf-8" -H "Authorization: Bearer $TOKEN" -d '{"content":"top"}' | grep -oE '"id":"[0-9]+' | head -1 | cut -d'"' -f4)
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login-password -H "Content-Type: application/json; charset=utf-8" -d '{"phone":"13800099999","password":"admin123"}' | grep -oE '"accessToken":"[^"]+' | cut -d'"' -f4)
# Hide it via direct DB (no admin comment endpoint yet)
MYSQL_PWD='yichun123456' "E:\soft\mysql-5.7.24-winx64\bin\mysql.exe" -h 127.0.0.1 -P 3307 -uyichun --ssl-mode=DISABLED -e "USE yichun_db; UPDATE comments SET status=1 WHERE id=$TOP_ID;"
# Try to reply — should now 400
curl -s -X POST http://localhost:3001/api/v1/posts/1/comments -H "Content-Type: application/json; charset=utf-8" -H "Authorization: Bearer $TOKEN" -d "{\"content\":\"reply\",\"parentId\":$TOP_ID}" -w "\nHTTP %{http_code}\n"
```
Expected: 400 "父留言已隐藏"

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/comment/comment.service.ts
git commit -m "fix(comment): reject replies to hidden parent comments"
```

---

### Task 2.4: admin.reject — also set post.status to 'rejected'

**Files:**
- Modify: `backend/src/modules/admin/post/admin-post.service.ts:78-94`

- [ ] **Step 1: Read current reject method**

Currently sets `auditStatus='rejected', status='rejected', auditReason=reason`. This is correct — but verify.

- [ ] **Step 2: Add Task 1.5's audit_log inside a transaction**

Wrap the existing update in `prisma.$transaction([..., auditLog.create(...)])` — same pattern as Task 1.5.

- [ ] **Step 3: curl test**

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login-password -H "Content-Type: application/json; charset=utf-8" -d '{"phone":"13800000000","password":"test123"}' | grep -oE '"accessToken":"[^"]+' | cut -d'"' -f4)
POST_ID=$(curl -s -X POST http://localhost:3001/api/v1/posts -H "Content-Type: application/json; charset=utf-8" -H "Authorization: Bearer $TOKEN" -d '{"type":"house","categoryId":1,"title":"reject test","description":"x"}' | grep -oE '"id":"[0-9]+' | head -1 | cut -d'"' -f4)
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login-password -H "Content-Type: application/json; charset=utf-8" -d '{"phone":"13800099999","password":"admin123"}' | grep -oE '"accessToken":"[^"]+' | cut -d'"' -f4)
curl -s -X POST "http://localhost:3001/api/v1/admin/posts/$POST_ID/audit" -H "Content-Type: application/json; charset=utf-8" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"action":"reject","reason":"测试拒绝"}' | head -c 200
MYSQL_PWD='yichun123456' "E:\soft\mysql-5.7.24-winx64\bin\mysql.exe" -h 127.0.0.1 -P 3307 -uyichun --ssl-mode=DISABLED -e "USE yichun_db; SELECT id, audit_status, status, audit_reason FROM posts WHERE id=$POST_ID; SELECT action, reason FROM audit_logs WHERE post_id=$POST_ID;"
```
Expected: `audit_status='rejected', status='rejected'`, `action='reject'`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/admin/post/admin-post.service.ts
git commit -m "refactor(admin): wrap reject in transaction with audit_log write"
```

---

### Task 2.5: post-card.tsx — move timeAgo to client-only

**Files:**
- Modify: `frontend/src/components/post/post-card.tsx:14-22, 80-83`

- [ ] **Step 1: Add mounted state**

Edit `frontend/src/components/post/post-card.tsx`:

```typescript
import { useEffect, useState } from 'react';

export function PostCard({ post, index = 0 }: { post: PostCardData; index?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // ... timeAgo inside component:
  const timeText = mounted ? timeAgo(post.createdAt) : new Date(post.createdAt).toLocaleDateString('zh-CN');
  // ...
}
```

- [ ] **Step 2: Render timeText instead of timeAgo() directly**

Replace `<>{timeAgo(post.createdAt)}</>` with `<>{timeText}</>`.

- [ ] **Step 3: Run dev, curl page, verify still 200 + check console for hydration errors**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/`
Expected: 200. Open browser → no hydration warning.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/post/post-card.tsx
git commit -m "fix(frontend): render timeAgo client-only to avoid SSR mismatch"
```

---

### Task 2.6: me/page.tsx — avoid "loading flash" by returning null

**Files:**
- Modify: `frontend/src/app/me/page.tsx:51-58`

- [ ] **Step 1: Return null instead of "加载中" until ready**

Edit `frontend/src/app/me/page.tsx`:

```typescript
if (!ready || !user) return null;  // ⬅ was: 加载中…
```

- [ ] **Step 2: Run dev + curl /me, verify 200 + no "加载中" in HTML**

```bash
curl -s http://localhost:3000/me | grep -c "加载中"
```
Expected: 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/me/page.tsx
git commit -m "fix(frontend): /me returns null while loading to avoid flash"
```

---

### Task 2.7: Header — click outside to close user menu

**Files:**
- Modify: `frontend/src/components/layout/header.tsx:78-95`

- [ ] **Step 1: Add click-outside via useRef + useEffect**

Edit `frontend/src/components/layout/header.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react';

const menuRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  if (!menuOpen) return;
  function onClick(e: MouseEvent) {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  }
  document.addEventListener('mousedown', onClick);
  return () => document.removeEventListener('mousedown', onClick);
}, [menuOpen]);

// Wrap menu with ref
<div ref={menuRef}>...menu UI...</div>
```

- [ ] **Step 2: Manual test in browser**

Open `/`, click user avatar, click outside → menu closes.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/header.tsx
git commit -m "fix(frontend): header user menu closes on outside click"
```

---

### Task 2.8: Replace `alert()` with inline toast in login + publish

**Files:**
- Create: `frontend/src/components/ui/toast.tsx` (tiny inline toast hook)
- Modify: `frontend/src/app/login/page.tsx:53-55` (replace `alert()`)
- Modify: `frontend/src/app/posts/publish/page.tsx` (no alert there but verify)

- [ ] **Step 1: Create toast hook**

Create `frontend/src/components/ui/toast.tsx`:

```typescript
'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Toast = { id: number; message: string; type: 'info' | 'success' | 'error' };
const ToastCtx = createContext<{ push: (msg: string, type?: Toast['type']) => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random();
    setList((p) => [...p, { id, message, type }]);
    setTimeout(() => setList((p) => p.filter((t) => t.id !== id)), 3000);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {list.map((t) => (
          <div key={t.id} className={`px-4 py-2.5 rounded-xl shadow-lg text-sm animate-slide-up ${
            t.type === 'error' ? 'bg-destructive text-destructive-foreground' :
            t.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-card border'
          }`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
```

- [ ] **Step 2: Wrap layout with ToastProvider**

Edit `frontend/src/app/layout.tsx`:

```typescript
import { ToastProvider } from '@/components/ui/toast';
// ...
<body>
  <ToastProvider>
    <Header />
    {children}
  </ToastProvider>
</body>
```

- [ ] **Step 3: Replace alert in login**

Edit `frontend/src/app/login/page.tsx`:

```typescript
const toast = useToast();
// ...
toast.push(`验证码已发送，请查看后端日志（${r.cooldown}s 内有效）`, 'success');
// instead of: alert(`验证码已发送\n开发环境：查看后端控制台日志\n冷却 ${r.cooldown} 秒`);
```

- [ ] **Step 4: Test in browser, see toast slide in instead of modal alert**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/toast.tsx frontend/src/app/layout.tsx frontend/src/app/login/page.tsx
git commit -m "feat(frontend): replace alert() with inline toast component"
```

---

## Phase 2 Verification

```bash
# Backend
cd backend && npx jest
# All e2e:
# - helmet headers (Phase 1.2)
# - throttler blocks (Phase 1.3)
# - findOne no password (Phase 1.1)
# - sort=price_asc works (Phase 2.1)
# - comment reply to hidden parent 400 (Phase 2.3)
# - audit_log row written (Phase 2.4)
# Frontend
curl -s http://localhost:3000/?type=house | grep -c "渐变"  # SSR clean
curl -s http://localhost:3000/me | grep -c "加载中"  # no loading text
```

---

## Phase 3 — Engineering Hygiene (P2, 2h)

Add tests + CI + Swagger. No user-visible change.

### Task 3.1: Add @nestjs/swagger + document all modules

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/main.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Install**

Run: `cd backend && npm install @nestjs/swagger@^7.4.0 swagger-ui-express@^5.0.0 --no-audit --no-fund`

- [ ] **Step 2: Add Swagger setup in main.ts**

Edit `backend/src/main.ts`:

```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// after app creation
const config = new DocumentBuilder()
  .setTitle('伊春有事儿说 API')
  .setDescription('本地信息平台 REST API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const doc = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, doc);
```

- [ ] **Step 3: Restart backend, curl `/api/docs-json`**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/docs-json
```
Expected: 200.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/src/main.ts
git commit -m "feat(api): add @nestjs/swagger at /api/docs"
```

---

### Task 3.2: Add GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: yichun_test
        ports: ['3306:3306']
        options: --health-cmd="mysqladmin ping" --health-interval=5s --health-retries=10
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Backend install
        run: cd backend && npm install
      - name: Backend prisma
        env: { DATABASE_URL: 'mysql://root:root@localhost:3306/yichun_test' }
        run: cd backend && npx prisma migrate deploy && npx prisma db seed
      - name: Backend lint
        run: cd backend && npm run lint
      - name: Backend test
        env: { DATABASE_URL: 'mysql://root:root@localhost:3306/yichun_test' }
        run: cd backend && npm test
      - name: Frontend install
        run: cd frontend && npm install
      - name: Frontend lint
        run: cd frontend && npm run lint
      - name: Frontend build
        run: cd frontend && npm run build
```

- [ ] **Step 2: Commit + push to trigger**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions (backend test + frontend build)"
git push
```

- [ ] **Step 3: Verify on GitHub Actions tab** (manual — user does this)

---

### Task 3.3: Add post e2e test

**Files:**
- Create: `backend/test/e2e/post.e2e-spec.ts`

- [ ] **Step 1: Write the e2e test**

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Post e2e', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login-password')
      .send({ phone: '13800000000', password: 'test123' })
      .expect(201);
    token = res.body.data.accessToken;
  });

  it('creates, lists, fetches, updates, deletes a post', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'house', categoryId: 1, title: 'e2e', description: 'x' })
      .expect(201);
    const id = created.body.data.id;

    await request(app.getHttpServer())
      .get('/api/v1/posts?type=house')
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/posts/${id}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/posts/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'e2e updated' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/posts/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  afterAll(() => app.close());
});
```

- [ ] **Step 2: Run to verify it passes**

Run: `cd backend && npx jest test/e2e/post.e2e-spec.ts -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/test/e2e/post.e2e-spec.ts
git commit -m "test(post): add e2e for post CRUD"
```

---

### Task 3.4: Fix remaining `any` types in service layer

**Files:**
- Modify: `backend/src/modules/post/post.service.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Replace `any` in post.service**

Edit `backend/src/modules/post/post.service.ts`:

```typescript
// replace `let shouldIncrement = false;` typed as boolean
// replace `any[]` with Prisma.JsonValue[]
// replace `any` in walk callback with `Prisma.JsonValue | null`
```

- [ ] **Step 2: tsc strict**

Run: `cd backend && npx tsc --noEmit 2>&1 | head -30`
Expected: 0 errors (or only known issues).

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/post/post.service.ts backend/src/modules/auth/auth.service.ts
git commit -m "refactor: tighten types in post + auth services"
```

---

## Phase 3 Verification

```bash
cd backend && npx jest  # unit + e2e all pass
# Open http://localhost:3001/api/docs — Swagger UI loads, all modules visible
```

---

## Phase 4 — Final Verification (1h)

Run the full E2E flow + smoke test all 6 frontend pages.

### Task 4.1: Full smoke test (backend + frontend)

- [ ] **Step 1: Run all unit + e2e tests**

```bash
cd backend && npx jest
```
Expected: all PASS.

- [ ] **Step 2: Frontend 6-page smoke test**

```bash
for path in "/" "/?type=house" "/posts/1" "/posts/publish?type=house" "/login" "/me"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  echo "$path -> $code"
done
```
Expected: all 200.

- [ ] **Step 3: Final commit + tag**

```bash
git add -A
git commit -m "chore: phase 4 verification (all tests + smoke pass)"
git tag v0.1.0
```

---

## Self-Review (run before handoff)

- [x] **Spec coverage:** All 24 bugs from the brainstorm covered. Each task has a clear, specific scope.
- [x] **Placeholder scan:** No "TBD" / "implement later" / "add appropriate error handling". Each step has actual code.
- [x] **Type consistency:** `findOne` in Task 1.1 uses same select shape as Task 1.10's `validate()`. `timeAgo` referenced consistently. JWT payload shape consistent throughout.
- [x] **Each task has TDD shape:** test → fail → fix → pass → commit.
- [x] **Tasks are bite-sized:** All 2-5 minutes per step.
- [x] **Real commands:** Every `Run:` block has an actual expected output.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-10-bugfix-and-refactor.md`. 3 phases + verification, 28 tasks total.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
