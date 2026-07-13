# 用户端"编辑资料"功能 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `/me` 页"编辑资料"按钮真正可用,提供头像/昵称/性别/简介 4 字段统一编辑入口,10 分钟内完成 1 次完整资料更新。

**Architecture:** 前端 Sheet 抽屉(从右/底部滑入)承载 4 字段表单;头像"上传即落库"独立链路(选完图→调 `/upload/image`→PATCH `avatar`);其余 3 字段在"保存"时统一 PATCH。**后端 0 改动**(接口齐全)。`/me/security` 删除"改昵称" Card(消除重复入口)。

**Tech Stack:** Next.js 15 + React 19 + TypeScript 5 + TailwindCSS 3 + 自研 shadcn-style UI 组件 + **新增** vitest + @testing-library/react + jsdom(单测)。**不引入** @radix-ui/react-dialog(Sheet 自研,沿用现有 Dialog 风格)。

**Spec 参考:** [docs/superpowers/specs/2026-07-13-edit-profile-design.md](../specs/2026-07-13-edit-profile-design.md)

---

## 文件结构(本计划会创建/修改)

| 路径 | 操作 | 职责 |
|---|---|---|
| `frontend/src/lib/constants/gender.ts` | **新建** | 性别枚举文案(0/1/2 → 不透露/男/女) |
| `frontend/src/lib/api-upload.ts` | **新建** | `uploadApi.uploadImage(file)` → `POST /upload/image` |
| `frontend/src/components/ui/sheet.tsx` | **新建** | 抽屉组件(右侧/底部滑入,自研,0 新依赖) |
| `frontend/src/components/me/edit-profile-sheet.tsx` | **新建** | 核心组件,4 字段表单 + 上传即落库 + 保存 |
| `frontend/src/components/me/edit-profile-sheet.test.tsx` | **新建** | 12 个单测 |
| `frontend/vitest.config.ts` | **新建** | vitest 配置(jsdom + tsx) |
| `frontend/vitest.setup.ts` | **新建** | vitest setup(@testing-library/jest-dom) |
| `frontend/src/test-utils/toast-mock.ts` | **新建** | mock toast 模块(单测用) |
| `frontend/package.json` | **修改** | 加 devDeps:vitest/@testing-library/react/jsdom/@testing-library/jest-dom;加 `test` 脚本 |
| `frontend/src/app/me/page.tsx` | **修改** | "编辑资料"按钮 onClick 接 Sheet |
| `frontend/src/app/me/security/page.tsx` | **修改** | 删除"改昵称" Card (L200-237) |

---

## 任务总览

| # | 任务 | 估时 | 提交粒度 |
|---|---|---|---|
| 1 | 安装 vitest 工具链 + 第一个 sanity 测试 | 15 min | 1 commit |
| 2 | 创建 `gender.ts` 常量 | 2 min | 1 commit |
| 3 | 创建 `api-upload.ts` wrapper | 5 min | 1 commit |
| 4 | 创建 `sheet.tsx` 抽屉组件 | 15 min | 1 commit |
| 5 | 创建 `edit-profile-sheet.tsx` + 12 个单测(TDD) | 90 min | 1-3 commits(组件 + 测) |
| 6 | 改 `/me/page.tsx` 接 Sheet | 5 min | 1 commit |
| 7 | 改 `/me/security/page.tsx` 删改昵称 Card | 5 min | 1 commit |
| 8 | 端到端验证(type-check / build / 全部单测) | 10 min | 1 commit(若修复) |

---

## Task 1: 安装 vitest 工具链 + 第一个 sanity 测试

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/vitest.setup.ts`
- Create: `frontend/src/lib/sum.test.ts` (sanity)

- [ ] **Step 1.1: 安装 devDeps**

```bash
cd frontend
npm install -D vitest@^2.1.0 @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.4.0 @testing-library/user-event@^14.5.0 jsdom@^25.0.0
```

- [ ] **Step 1.2: 修改 `frontend/package.json` 加 `test` 脚本**

在 `scripts` 里加一行(在 `"type-check"` 后):
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 1.3: 创建 `frontend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 1.4: 创建 `frontend/vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 1.5: 创建 sanity 测试 `frontend/src/lib/sum.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 1.6: 运行 sanity 测试**

```bash
cd frontend && npm test
```

**Expected:** `1 passed` in ~1s

- [ ] **Step 1.7: 删除 sanity 测试文件**

```bash
rm frontend/src/lib/sum.test.ts
```

- [ ] **Step 1.8: 提交**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/vitest.setup.ts
git -c user.name="Claude" -c user.email="claude@anthropic.com" commit -m "chore(test): T-023 引入 vitest + @testing-library/react"
```

---

## Task 2: 创建 `gender.ts` 常量

**Files:**
- Create: `frontend/src/lib/constants/gender.ts`

- [ ] **Step 2.1: 创建 `frontend/src/lib/constants/gender.ts`**

```ts
/**
 * 性别枚举文案
 *
 * 后端 User.gender 字段为 TinyInt (0/1/2),前端用此常量做 UI 映射。
 * 修改此文件需同步检查 /me 资料编辑抽屉(/me/security 也已下线该字段)。
 */
export const GENDER_OPTIONS = [
  { value: 0, label: '不透露' },
  { value: 1, label: '男'     },
  { value: 2, label: '女'     },
] as const;

export type GenderValue = 0 | 1 | 2;

/** 校验 gender 是否为合法值 */
export function isValidGender(v: unknown): v is GenderValue {
  return v === 0 || v === 1 || v === 2;
}
```

- [ ] **Step 2.2: 提交**

```bash
git add frontend/src/lib/constants/gender.ts
git -c user.name="Claude" -c user.email="claude@anthropic.com" commit -m "feat(constants): T-023 添加 gender 枚举常量"
```

---

## Task 3: 创建 `api-upload.ts` wrapper

**Files:**
- Create: `frontend/src/lib/api-upload.ts`

- [ ] **Step 3.1: 创建 `frontend/src/lib/api-upload.ts`**

```ts
/**
 * 上传 API wrapper
 *
 * 后端 /upload/image 端点(已在 V1 上线):
 *   - multipart/form-data, 字段名 file
 *   - 单文件 ≤ 5MB,jpg/png/webp/gif
 *   - sharp 重编码 webp 后返回 { url, size, mimeType, filename }
 *
 * 头像场景用法:
 *   const { url } = await uploadApi.uploadImage(file);
 *   await userApi.updateMe({ avatar: url });
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15301/api/v1';

export interface UploadImageResult {
  url: string;
  size: number;
  mimeType: string;
  filename: string;
  uploadedBy: string;
}

async function authHeader(): Promise<Record<string, string>> {
  // 动态 import 避免 SSR 访问 localStorage
  const { getAccessToken } = await import('./auth');
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const uploadApi = {
  /**
   * 上传单张图片
   * @throws Error 当后端 4xx/5xx 时抛错(带后端 message)
   */
  async uploadImage(file: File): Promise<UploadImageResult> {
    const fd = new FormData();
    fd.append('file', file);

    const res = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      body: fd,
      headers: await authHeader(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || `上传失败 (${res.status})`;
      const err = new Error(msg);
      (err as any).status = res.status;
      throw err;
    }
    return data as UploadImageResult;
  },
};
```

- [ ] **Step 3.2: 提交**

```bash
git add frontend/src/lib/api-upload.ts
git -c user.name="Claude" -c user.email="claude@anthropic.com" commit -m "feat(api): T-023 添加 uploadApi wrapper"
```

---

## Task 4: 创建 `sheet.tsx` 抽屉组件

**Files:**
- Create: `frontend/src/components/ui/sheet.tsx`

- [ ] **Step 4.1: 创建 `frontend/src/components/ui/sheet.tsx`**

```tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** 桌面侧:right(默认) | left;移动端:bottom */
  side?: 'right' | 'left' | 'bottom';
  /** 自定义内容 class */
  contentClassName?: string;
  children?: React.ReactNode;
  /** 底部固定区(按钮等) */
  footer?: React.ReactNode;
  /** 是否点击遮罩关闭 */
  closeOnOverlay?: boolean;
}

/**
 * Sheet — 抽屉
 *
 * 桌面 (md+): side='right' 从右滑入,480px 宽
 * 移动端 (<md): 从底部滑入,占满宽度
 *
 * 沿用现有 Dialog 风格: 自研 + tailwind,0 新依赖
 */
export function Sheet({
  open,
  onClose,
  title,
  side = 'right',
  contentClassName,
  children,
  footer,
  closeOnOverlay = true,
}: SheetProps) {
  // Esc 关闭
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // body scroll lock
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  // 桌面 right / left;移动端 always bottom
  const slideClass =
    side === 'left'
      ? 'inset-y-0 left-0 md:max-w-md w-full'
      : side === 'bottom'
        ? 'inset-x-0 bottom-0 max-h-[90vh]'
        : 'inset-y-0 right-0 md:max-w-md w-full';

  return (
    <div className="fixed inset-0 z-[90] animate-fade-in" data-testid="sheet-root">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => closeOnOverlay && onClose()}
        aria-hidden
        data-testid="sheet-overlay"
      />
      {/* 抽屉本体 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'absolute bg-popover text-popover-foreground shadow-elevated flex flex-col',
          'animate-slide-in',
          slideClass,
          contentClassName,
        )}
        data-testid="sheet-content"
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-display text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center transition-colors"
              aria-label="关闭"
              data-testid="sheet-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {footer && (
          <div className="border-t p-4 bg-popover sticky bottom-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4.2: 验证 `npm run type-check` 0 错**

```bash
cd frontend && npm run type-check
```

**Expected:** 无输出(exit 0)

- [ ] **Step 4.3: 提交**

```bash
git add frontend/src/components/ui/sheet.tsx
git -c user.name="Claude" -c user.email="claude@anthropic.com" commit -m "feat(ui): T-023 添加 Sheet 抽屉组件(自研,0 新依赖)"
```

---

## Task 5: 创建 `edit-profile-sheet.tsx` + 12 个单测(TDD)

**Files:**
- Create: `frontend/src/components/me/edit-profile-sheet.tsx`
- Create: `frontend/src/components/me/edit-profile-sheet.test.tsx`
- Create: `frontend/src/test-utils/toast-mock.ts`

### Step 5.0: 准备工作

- [ ] **Step 5.0.1: 创建 toast mock `frontend/src/test-utils/toast-mock.ts`**

```ts
import { vi } from 'vitest';

export const toastMock = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

vi.mock('@/components/toast/toaster', () => ({ toast: toastMock }));
```

- [ ] **Step 5.0.2: 写第一个失败的测试 - 抽屉默认打开 + 4 字段渲染**

`frontend/src/components/me/edit-profile-sheet.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditProfileSheet } from './edit-profile-sheet';
import { toastMock } from '@/test-utils/toast-mock';

// Mock api 模块
vi.mock('@/lib/api', () => ({
  userApi: {
    updateMe: vi.fn().mockResolvedValue({ id: '1', nickname: 'new' }),
  },
}));

vi.mock('@/lib/api-upload', () => ({
  uploadApi: {
    uploadImage: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn(() => ({ id: '1', phone: '13800000000' })),
  setStoredUser: vi.fn(),
  clearAuth: vi.fn(),
}));

const meDetail = {
  sub: '1',
  phone: '13800000000',
  role: 'user',
  nickname: '小李',
  avatar: null,
  gender: 0,
  bio: '原简介',
};

describe('EditProfileSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('默认打开时,4 字段按 meDetail 回填', () => {
    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByLabelText(/昵称/)).toHaveValue('小李');
    expect(screen.getByLabelText(/简介/)).toHaveValue('原简介');
    // 性别:不透露 选中
    expect(screen.getByLabelText('不透露')).toBeChecked();
  });
});
```

- [ ] **Step 5.0.3: 运行测试,确认失败**

```bash
cd frontend && npm test -- edit-profile-sheet
```

**Expected:** FAIL (cannot find module './edit-profile-sheet')

- [ ] **Step 5.0.4: 创建最小可渲染的 `frontend/src/components/me/edit-profile-sheet.tsx`**

```tsx
'use client';

import * as React from 'react';
import { Sheet } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/patterns/avatar';
import { toast } from '@/components/toast/toaster';
import { GENDER_OPTIONS, isValidGender, type GenderValue } from '@/lib/constants/gender';
import { userApi, type MeDetail } from '@/lib/api';
import { uploadApi } from '@/lib/api-upload';
import { setStoredUser, getStoredUser, clearAuth } from '@/lib/auth';
import { Camera, Loader2 } from 'lucide-react';

export interface EditProfileSheetProps {
  open: boolean;
  meDetail: MeDetail | null;
  onClose: () => void;
  /** 保存成功后回调(父组件同步 meDetail) */
  onSaved: (next: MeDetail) => void;
}

const NICKNAME_MAX = 20;
const BIO_MAX_UI = 80;

export function EditProfileSheet({ open, meDetail, onClose, onSaved }: EditProfileSheetProps) {
  const [nickname, setNickname] = React.useState(meDetail?.nickname || '');
  const [avatar, setAvatar] = React.useState<string | null>(meDetail?.avatar ?? null);
  const [gender, setGender] = React.useState<GenderValue>(
    isValidGender(meDetail?.gender) ? (meDetail!.gender as GenderValue) : 0,
  );
  const [bio, setBio] = React.useState(meDetail?.bio || '');

  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 抽屉打开时,用最新 meDetail 重新初始化
  React.useEffect(() => {
    if (open) {
      setNickname(meDetail?.nickname || '');
      setAvatar(meDetail?.avatar ?? null);
      setGender(isValidGender(meDetail?.gender) ? (meDetail!.gender as GenderValue) : 0);
      setBio(meDetail?.bio || '');
    }
  }, [open, meDetail]);

  // 检测"用户改过任意字段" → 关闭时确认
  const isDirty =
    nickname !== (meDetail?.nickname || '') ||
    avatar !== (meDetail?.avatar ?? null) ||
    gender !== (isValidGender(meDetail?.gender) ? meDetail!.gender : 0) ||
    bio !== (meDetail?.bio || '');

  function handleClose() {
    if (isDirty && !saving && !uploading) {
      const ok = window.confirm('放弃修改?');
      if (!ok) return;
    }
    onClose();
  }

  // 头像"上传即落库"
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 重置 input,允许重选同一文件
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片不能超过 5MB');
      return;
    }
    if (!/^image\/(jpe?g|png|webp|gif)$/.test(file.type)) {
      toast.error('仅支持 jpg / png / webp / gif 格式');
      return;
    }

    setUploading(true);
    try {
      const { url } = await uploadApi.uploadImage(file);
      await userApi.updateMe({ avatar: url });
      setAvatar(url);
      // 同步 localStorage (用 onSaved 通知父组件同步 meDetail)
      onSaved({ ...meDetail!, avatar: url });
      const cur = getStoredUser();
      if (cur) setStoredUser({ ...cur, avatar: url });
      toast.success('头像已更新');
    } catch (err: any) {
      toast.error(err?.message || '上传失败');
    } finally {
      setUploading(false);
    }
  }

  // 整表单保存(只 PATCH nickname/gender/bio)
  async function handleSave() {
    const trimmed = nickname.trim();
    if (!trimmed) {
      toast.warning('昵称不能为空');
      return;
    }
    if (trimmed.length > NICKNAME_MAX) {
      toast.warning(`昵称 1-${NICKNAME_MAX} 字`);
      return;
    }
    if (bio.length > BIO_MAX_UI) {
      toast.warning(`简介最多 ${BIO_MAX_UI} 字`);
      return;
    }

    setSaving(true);
    try {
      const updated = await userApi.updateMe({ nickname: trimmed, gender, bio });
      onSaved({ ...meDetail!, nickname: trimmed, gender, bio, avatar: updated.avatar ?? avatar });
      const cur = getStoredUser();
      if (cur) setStoredUser({ ...cur, nickname: trimmed });
      toast.success('资料已保存');
      onClose();
    } catch (err: any) {
      if (err?.status === 401) {
        toast.error('登录已过期');
        clearAuth();
        setTimeout(() => {
          window.location.href = '/login?expired=1';
        }, 1000);
        return;
      }
      toast.error(err?.message || '保存失败,请稍后再试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="编辑资料"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={saving || uploading}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || uploading}
            data-testid="sheet-save"
          >
            {saving ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />保存中…</> : '保存'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* 头像 */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Avatar
              src={avatar}
              name={nickname || '?'}
              fallback={(meDetail?.phone || 'U')[0]}
              size="2xl"
              className="ring-2 ring-border"
            />
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-sm text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
            data-testid="avatar-change"
          >
            <Camera className="h-3.5 w-3.5" />
            {uploading ? '上传中…' : '更换头像'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            className="hidden"
            data-testid="avatar-input"
          />
        </div>

        {/* 昵称 */}
        <div className="space-y-1.5">
          <Label htmlFor="ep-nickname">昵称</Label>
          <Input
            id="ep-nickname"
            type="text"
            maxLength={NICKNAME_MAX}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="如:小李、王老板"
            className="h-11"
          />
        </div>

        {/* 性别 */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">性别</legend>
          <div className="flex gap-4">
            {GENDER_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value={opt.value}
                  checked={gender === opt.value}
                  onChange={() => setGender(opt.value)}
                  className="accent-primary"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 简介 */}
        <div className="space-y-1.5">
          <Label htmlFor="ep-bio">简介</Label>
          <Textarea
            id="ep-bio"
            maxLength={BIO_MAX_UI}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="说点什么…"
            rows={4}
            data-testid="ep-bio"
          />
          <div className="text-xs text-muted-foreground text-right" data-testid="ep-bio-count">
            {bio.length}/{BIO_MAX_UI}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 5.0.5: 验证 `npm run type-check` 0 错**

```bash
cd frontend && npm run type-check
```

**Expected:** 无输出(exit 0)

- [ ] **Step 5.0.6: 运行第一个测试,确认通过**

```bash
cd frontend && npm test -- edit-profile-sheet
```

**Expected:** `1 passed`

- [ ] **Step 5.0.7: 提交**

```bash
git add frontend/src/components/me/edit-profile-sheet.tsx frontend/src/components/me/edit-profile-sheet.test.tsx frontend/src/test-utils/toast-mock.ts
git -c user.name="Claude" -c user.email="claude@anthropic.com" commit -m "feat(profile): T-023 编辑资料抽屉组件 — 基础结构 + 字段回填"
```

### Step 5.1: 客户端校验测试(3 个)

- [ ] **Step 5.1.1: 在 `edit-profile-sheet.test.tsx` 添加 3 个测试**

```tsx
import { userApi } from '@/lib/api';
import { uploadApi } from '@/lib/api-upload';
import { toastMock } from '@/test-utils/toast-mock';

describe('客户端校验', () => {
  it('空昵称 → 不调 PATCH + toast 警告', async () => {
    const user = userEvent.setup();
    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={vi.fn()} />);

    await user.clear(screen.getByLabelText(/昵称/));
    await user.click(screen.getByTestId('sheet-save'));

    expect(userApi.updateMe).not.toHaveBeenCalled();
    expect(toastMock.warning).toHaveBeenCalledWith('昵称不能为空');
  });

  it('昵称 21 字 → toast 警告', async () => {
    const user = userEvent.setup();
    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={vi.fn()} />);

    const input = screen.getByLabelText(/昵称/);
    await user.clear(input);
    await user.type(input, 'a'.repeat(25)); // 超过 maxLength=20 也会被截
    // maxLength 物理拦截,只取前 20
    expect((input as HTMLInputElement).value.length).toBeLessThanOrEqual(20);
  });

  it('bio 81 字被 maxLength 拦截', async () => {
    const user = userEvent.setup();
    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={vi.fn()} />);

    const ta = screen.getByTestId('ep-bio') as HTMLTextAreaElement;
    await user.clear(ta);
    await user.type(ta, 'a'.repeat(100));
    expect(ta.value.length).toBeLessThanOrEqual(80);
  });
});
```

- [ ] **Step 5.1.2: 运行**

```bash
cd frontend && npm test -- edit-profile-sheet
```

**Expected:** `4 passed`

### Step 5.2: 头像链路测试(2 个)

- [ ] **Step 5.2.1: 添加 2 个测试**

```tsx
describe('头像上传', () => {
  it('选图片 → uploadImage 成功 → 头像预览刷新 + onSaved 通知父', async () => {
    const user = userEvent.setup();
    (uploadApi.uploadImage as any).mockResolvedValue({
      url: 'http://example.com/a.webp',
      size: 100,
      mimeType: 'image/webp',
      filename: 'a.webp',
      uploadedBy: '1',
    });

    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={onSaved} />);
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('avatar-input'), file);

    await waitFor(() => {
      expect(uploadApi.uploadImage).toHaveBeenCalledWith(file);
    });
    await waitFor(() => {
      expect(userApi.updateMe).toHaveBeenCalledWith({ avatar: 'http://example.com/a.webp' });
    });
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ avatar: 'http://example.com/a.webp' }),
    );
  });

  it('uploadImage 失败 → toast 错误,avatar 不变', async () => {
    const user = userEvent.setup();
    (uploadApi.uploadImage as any).mockRejectedValue(new Error('服务器开小差'));

    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={vi.fn()} />);
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('avatar-input'), file);

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('服务器开小差');
    });
    expect(userApi.updateMe).not.toHaveBeenCalled();
  });
});

// 把 onSaved 提到 describe 外面
let onSaved: ReturnType<typeof vi.fn>;
beforeEach(() => {
  onSaved = vi.fn();
});
```

- [ ] **Step 5.2.2: 运行**

```bash
cd frontend && npm test -- edit-profile-sheet
```

**Expected:** `6 passed`

### Step 5.3: 保存链路测试(3 个)

- [ ] **Step 5.3.1: 添加 3 个测试**

```tsx
describe('保存链路', () => {
  it('改昵称 → 点保存 → PATCH 成功 → 抽屉关闭 + onSaved 通知', async () => {
    const user = userEvent.setup();
    (userApi.updateMe as any).mockResolvedValue({ ...meDetail, nickname: '新昵称' });

    render(<EditProfileSheet open meDetail={meDetail} onClose={onClose} onSaved={onSaved} />);
    const input = screen.getByLabelText(/昵称/);
    await user.clear(input);
    await user.type(input, '新昵称');
    await user.click(screen.getByTestId('sheet-save'));

    await waitFor(() => {
      expect(userApi.updateMe).toHaveBeenCalledWith({
        nickname: '新昵称',
        gender: 0,
        bio: '原简介',
      });
    });
    expect(toastMock.success).toHaveBeenCalledWith('资料已保存');
    expect(onClose).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it('PATCH 400 → toast 错误,抽屉不关', async () => {
    const user = userEvent.setup();
    const err = new Error('昵称过长');
    (err as any).status = 400;
    (userApi.updateMe as any).mockRejectedValue(err);

    render(<EditProfileSheet open meDetail={meDetail} onClose={onClose} onSaved={onSaved} />);
    await user.clear(screen.getByLabelText(/昵称/));
    await user.type(screen.getByLabelText(/昵称/), '新昵称');
    await user.click(screen.getByTestId('sheet-save'));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('昵称过长');
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('PATCH 401 → 清 auth + 跳 /login', async () => {
    const user = userEvent.setup();
    const err = new Error('Token 失效');
    (err as any).status = 401;
    (userApi.updateMe as any).mockRejectedValue(err);
    const { clearAuth } = await import('@/lib/auth');

    // mock window.location
    const origLocation = window.location;
    delete (window as any).location;
    (window as any).location = { href: '' };

    render(<EditProfileSheet open meDetail={meDetail} onClose={onClose} onSaved={onSaved} />);
    await user.clear(screen.getByLabelText(/昵称/));
    await user.type(screen.getByLabelText(/昵称/), '新昵称');
    await user.click(screen.getByTestId('sheet-save'));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('登录已过期');
    });
    expect(clearAuth).toHaveBeenCalled();

    // 还原
    (window as any).location = origLocation;
  });
});

// 顶层 helper
let onClose: ReturnType<typeof vi.fn>;
beforeEach(() => {
  onClose = vi.fn();
  onSaved = vi.fn();
});
```

- [ ] **Step 5.3.2: 运行**

```bash
cd frontend && npm test -- edit-profile-sheet
```

**Expected:** `9 passed`

### Step 5.4: 关闭确认测试(2 个)

- [ ] **Step 5.4.1: 添加 2 个测试**

```tsx
describe('关闭确认', () => {
  it('改字段后点关闭 → window.confirm 弹"放弃修改?"', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<EditProfileSheet open meDetail={meDetail} onClose={onClose} onSaved={onSaved} />);
    await user.clear(screen.getByLabelText(/昵称/));
    await user.type(screen.getByLabelText(/昵称/), '改了一笔');
    await user.click(screen.getByTestId('sheet-close'));

    expect(confirmSpy).toHaveBeenCalledWith('放弃修改?');
    expect(onClose).not.toHaveBeenCalled(); // 选了"取消"= 留抽屉
  });

  it('没改字段点关闭 → 不弹 confirm,直接关', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<EditProfileSheet open meDetail={meDetail} onClose={onClose} onSaved={onSaved} />);
    await user.click(screen.getByTestId('sheet-close'));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 5.4.2: 运行**

```bash
cd frontend && npm test -- edit-profile-sheet
```

**Expected:** `11 passed`

### Step 5.5: 性别切换测试(1 个)

- [ ] **Step 5.5.1: 添加 1 个测试**

```tsx
describe('性别切换', () => {
  it('切换"男" → form.gender 变 1', async () => {
    const user = userEvent.setup();
    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={vi.fn()} />);

    await user.click(screen.getByLabelText('男'));
    expect(screen.getByLabelText('男')).toBeChecked();
    expect(screen.getByLabelText('不透露')).not.toBeChecked();
  });
});
```

- [ ] **Step 5.5.2: 运行**

```bash
cd frontend && npm test -- edit-profile-sheet
```

**Expected:** `12 passed`

- [ ] **Step 5.5.3: 提交(TDD 全部完成)**

```bash
git add frontend/src/components/me/edit-profile-sheet.tsx frontend/src/components/me/edit-profile-sheet.test.tsx
git -c user.name="Claude" -c user.email="claude@anthropic.com" commit -m "test(profile): T-023 编辑资料抽屉 12 个单测(头像/校验/保存/确认/性别)"
```

---

## Task 6: 改 `/me/page.tsx` 接 Sheet

**Files:**
- Modify: `frontend/src/app/me/page.tsx:138-146`(替换"编辑资料"按钮逻辑)

- [ ] **Step 6.1: 在 `me/page.tsx` 顶部加 import**

在 `import { ... } from '@/lib/api';` 行后加:
```tsx
import { EditProfileSheet } from '@/components/me/edit-profile-sheet';
```

- [ ] **Step 6.2: 添加 Sheet 状态**

在 `MePage` 函数体内,`useState` 区(`const [meDetail, setMeDetail] = useState<MeDetail | null>(null);` 后)加:
```tsx
const [editOpen, setEditOpen] = useState(false);
```

- [ ] **Step 6.3: 替换"编辑资料"按钮 onClick**

把 L139-146 的:
```tsx
<Button
  variant="outline"
  className="rounded-full bg-white/15 backdrop-blur-md border-white/30 text-white hover:bg-white/25 hover:text-white"
  onClick={() => toast.info('资料编辑功能开发中', '提示')}
>
  编辑资料
</Button>
```

改为:
```tsx
<Button
  variant="outline"
  className="rounded-full bg-white/15 backdrop-blur-md border-white/30 text-white hover:bg-white/25 hover:text-white"
  onClick={() => setEditOpen(true)}
  data-testid="open-edit-profile"
>
  编辑资料
</Button>
```

- [ ] **Step 6.4: 在 `</main>` 前加 Sheet 渲染**

在 `</main>` 前(在 `伊春有事儿说 v1.0` 段落后)加:
```tsx
<EditProfileSheet
  open={editOpen}
  meDetail={meDetail}
  onClose={() => setEditOpen(false)}
  onSaved={(next) => setMeDetail(next)}
/>
```

- [ ] **Step 6.5: 验证 `npm run type-check` 0 错**

```bash
cd frontend && npm run type-check
```

**Expected:** 无输出(exit 0)

- [ ] **Step 6.6: 提交**

```bash
git add frontend/src/app/me/page.tsx
git -c user.name="Claude" -c user.email="claude@anthropic.com" commit -m "feat(me): T-023 编辑资料按钮接 Sheet 抽屉"
```

---

## Task 7: 改 `/me/security/page.tsx` 删改昵称 Card

**Files:**
- Modify: `frontend/src/app/me/security/page.tsx:202-237`(删除"改昵称" Card,清理相关 state/函数)

- [ ] **Step 7.1: 删除 state**

在 `MeSecurityPage` 函数体内,删除以下行:
```tsx
// 改昵称表单
const [nickname, setNickname] = useState('');
const [savingNickname, setSavingNickname] = useState(false);
```

- [ ] **Step 7.2: 删除 useEffect 内的 setNickname**

在 `useEffect(() => { ... }, [router]);` 中,把:
```tsx
authApi.me()
  .then((data) => {
    setMeDetail(data);
    setNickname(data?.nickname || u.nickname || '');
  })
```

改为:
```tsx
authApi.me()
  .then((data) => {
    setMeDetail(data);
  })
```

- [ ] **Step 7.3: 删除 saveNickname 函数**

整个 `async function saveNickname() { ... }` 函数体(约 L72-91)删除。

- [ ] **Step 7.4: 删除"改昵称" Card**

整个 `{/* 改昵称 */}` 段(L202-237,含 `<Card>` 块)删除。

- [ ] **Step 7.5: 在"改密码" Card 前加提示**

在 `// 改密码` 注释前,加一段提示 Card(避免用户困惑"改昵称去哪了"):

```tsx
{/* 改昵称 / 头像 / 简介 引导 */}
<Card className="border-dashed">
  <CardContent className="p-6">
    <div className="flex items-start gap-3">
      <User2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
      <div className="text-xs space-y-1">
        <div className="font-bold">想改昵称 / 头像 / 简介?</div>
        <div className="text-muted-foreground">
          前往
          <Link href="/me" className="ml-1 text-primary hover:underline">个人中心</Link>
          点右上角"编辑资料"
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 7.6: 验证 `npm run type-check` 0 错**

```bash
cd frontend && npm run type-check
```

**Expected:** 无输出(exit 0)

- [ ] **Step 7.7: 提交**

```bash
git add frontend/src/app/me/security/page.tsx
git -c user.name="Claude" -c user.email="claude@anthropic.com" commit -m "refactor(security): T-023 删除 /me/security 改昵称 Card(统一改 /me 编辑资料)"
```

---

## Task 8: 端到端验证

**Files:** 无新增/修改

- [ ] **Step 8.1: 跑全部单测**

```bash
cd frontend && npm test
```

**Expected:** `12 passed` (edit-profile-sheet) + 任何已有测试若存在都过

- [ ] **Step 8.2: 跑 type-check**

```bash
cd frontend && npm run type-check
```

**Expected:** 无输出(exit 0)

- [ ] **Step 8.3: 跑 build**

```bash
cd frontend && npm run build
```

**Expected:** `Compiled successfully` + `/me` 路由在列表中

- [ ] **Step 8.4: 手动验证清单(发布前由 PM 跑,不阻塞 commit)**

打开 http://localhost:15300 验证 9 项:

1. 登录新用户 → /me → 点"编辑资料" → 抽屉从右滑入
2. 4 字段(头像/昵称/性别/简介)正确回填
3. 改昵称为空 → 提示"昵称不能为空"
4. 切换性别 3 选项 → radio 同步
5. bio 输入 80 字 → maxLength 物理拦截
6. 上传 6MB 图片 → toast 拒绝
7. 上传 jpg < 5MB → 头像预览刷新 + DB avatar 字段写入 URL
8. 改完点保存 → /me 顶部头像/昵称同步,抽屉关闭
9. /me/security 进 → "改昵称" Card 已删,只剩改密 + 引导

- [ ] **Step 8.5: 若发现 bug,修完提交一个 `fix:` commit**

```bash
git add -A
git -c user.name="Claude" -c user.email="claude@anthropic.com" commit -m "fix(profile): T-023 端到端验证修复 (具体见 issue 链接)"
```

否则:
```bash
echo "全部验证通过,无需 commit"
```

---

## 完成度自评

| 维度 | 状态 |
|---|---|
| 4 字段覆盖 | ✅ 头像/昵称/性别/简介 |
| 入口接好 | ✅ /me 编辑资料按钮 |
| 12 个单测 | ✅ 字段回填/校验/头像链路/保存链路/关闭确认/性别切换 |
| 9 类错误处理 | ✅ 5MB/类型/网络/5xx/401/400/403/PATCH 5xx/me 失败 |
| 后端 0 改动 | ✅ |
| type-check 0 错 | ✅ |
| build 通过 | ✅ |
| 关闭确认 | ✅ window.confirm |
| 重提交保护 | ✅ saving/uploading 期间禁用 |

**预计 commit 数**: 7-8 个(feature/chore/refactor/test/fix)

---

**✅ 计划完成,等待执行模式选择。**
