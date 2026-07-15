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
import { authApi, userApi, type MeDetail } from '@/lib/api';
import { uploadApi } from '@/lib/api-upload';
import { setStoredUser, getStoredUser, clearAuth } from '@/lib/auth';
import {
  Camera,
  Check,
  Loader2,
  PencilLine,
  Quote,
  User as UserIcon,
} from 'lucide-react';

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

  // 只在抽屉从关闭→打开 那一刻 reset,避免 avatar PATCH 后 meDetail 引用变化
  // 偷偷重置用户未保存的 nickname/gender/bio 编辑。
  const prevOpen = React.useRef(false);
  React.useEffect(() => {
    if (open && !prevOpen.current) {
      setNickname(meDetail?.nickname || '');
      setAvatar(meDetail?.avatar ?? null);
      setGender(isValidGender(meDetail?.gender) ? (meDetail!.gender as GenderValue) : 0);
      setBio(meDetail?.bio || '');
    }
    prevOpen.current = open;
  }, [open, meDetail]);

  // 检测"用户改过任意字段" → 关闭时确认
  const isDirty =
    nickname !== (meDetail?.nickname || '') ||
    avatar !== (meDetail?.avatar ?? null) ||
    gender !== (isValidGender(meDetail?.gender) ? meDetail!.gender : 0) ||
    bio !== (meDetail?.bio || '');

  // 头像"上传即落库"
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (saving || uploading) {
      e.target.value = '';
      return;
    }
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
      const updated = await userApi.updateMe({ avatar: url });
      const fresh = await authApi.me().catch(() => null);
      const nextAvatar = fresh?.avatar ?? updated.avatar ?? url;
      const nextNickname = fresh?.nickname ?? updated.nickname ?? meDetail?.nickname;
      setAvatar(nextAvatar);
      onSaved({ ...meDetail!, nickname: nextNickname, avatar: nextAvatar });
      const cur = getStoredUser();
      if (cur) setStoredUser({ ...cur, nickname: nextNickname, avatar: nextAvatar });
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
      const fresh = await authApi.me().catch(() => null);
      const nextNickname = fresh?.nickname ?? updated.nickname ?? trimmed;
      const nextAvatar = fresh?.avatar ?? updated.avatar ?? avatar;
      onSaved({ ...meDetail!, nickname: nextNickname, gender, bio, avatar: nextAvatar });
      const cur = getStoredUser();
      if (cur) setStoredUser({ ...cur, nickname: nextNickname, avatar: nextAvatar });
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

  // 字符计数颜色:接近上限时变橙
  const bioCountColor =
    bio.length >= BIO_MAX_UI
      ? 'text-destructive font-medium'
      : bio.length >= BIO_MAX_UI * 0.8
        ? 'text-amber-600 font-medium'
        : 'text-muted-foreground';

  return (
    <Sheet
      open={open}
      onClose={() => {
        // 包装一层保留 Esc/遮罩也走"放弃修改"确认
        if (saving || uploading) return;
        if (isDirty) {
          const ok = window.confirm('放弃修改?');
          if (!ok) return;
        }
        onClose();
      }}
      title="编辑资料"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
            {isDirty ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>有未保存的修改</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>一切就绪</span>
              </>
            )}
          </p>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => {
                if (saving || uploading) return;
                if (isDirty) {
                  const ok = window.confirm('放弃修改?');
                  if (!ok) return;
                }
                onClose();
              }}
              disabled={saving || uploading}
              className="min-w-[88px]"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              data-testid="sheet-save"
              className="min-w-[120px] shadow-soft"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  保存中…
                </>
              ) : (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  保存修改
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      {/* ============================================================
       * 顶部 Hero 头像区 — 渐变背景条 + 头像勋章
       * ============================================================ */}
      <div className="-mx-6 -mt-6 mb-6">
        {/* 渐变装饰条 */}
        <div
          className="relative h-24 overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, hsl(158 64% 35%) 0%, hsl(158 80% 25%) 60%, hsl(24 95% 53%) 100%)',
          }}
          aria-hidden
        >
          {/* 装饰光斑 */}
          <div className="absolute -top-12 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-8 left-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        </div>

        {/* 头像区:头像与渐变条重叠 ~50% */}
        <div className="relative px-6 -mt-12 flex flex-col items-center">
          <div className="relative group">
            {/* 外圈柔光晕 */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent-orange/20 blur-xl scale-110" aria-hidden />

            {/* 头像本体 */}
            <Avatar
              src={avatar}
              name={nickname || '?'}
              fallback={(meDetail?.phone || 'U')[0]}
              size="2xl"
              className="relative h-24 w-24 ring-4 ring-popover shadow-elevated"
            />

            {/* 上传中环状遮罩 */}
            {uploading && (
              <div
                className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center backdrop-blur-[1px]"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-7 w-7 text-white animate-spin" />
              </div>
            )}

            {/* 相机按钮 — 悬浮于头像右下 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || saving}
              data-testid="avatar-change"
              aria-label={uploading ? '正在上传头像' : '更换头像'}
              className="
                absolute -bottom-1 -right-1 h-9 w-9 rounded-full
                bg-popover text-foreground
                ring-2 ring-popover
                shadow-elevated
                flex items-center justify-center
                transition-all duration-200 ease-out
                hover:scale-110 hover:bg-primary hover:text-primary-foreground
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-popover disabled:hover:text-foreground
                group-hover:scale-105
              "
            >
              <Camera className="h-4 w-4" strokeWidth={2.25} />
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

          {/* 上传状态文字 */}
          <p className="mt-2 text-xs text-muted-foreground">
            {uploading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                上传中…
              </span>
            ) : (
              '支持 jpg / png / webp / gif · 最大 5MB'
            )}
          </p>
        </div>
      </div>

      {/* ============================================================
       * 表单区 — 分组卡片 + 字段标题两列对齐
       * ============================================================ */}
      <div className="space-y-5">
        {/* 昵称 */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label
              htmlFor="ep-nickname"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
              昵称
              <span className="text-destructive">*</span>
            </Label>
            <span
              className={
                nickname.length >= NICKNAME_MAX
                  ? 'text-xs text-destructive font-medium tabular-nums'
                  : nickname.length >= NICKNAME_MAX * 0.8
                    ? 'text-xs text-amber-600 font-medium tabular-nums'
                    : 'text-xs text-muted-foreground tabular-nums'
              }
            >
              {nickname.length}/{NICKNAME_MAX}
            </span>
          </div>
          <Input
            id="ep-nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="如:小李、王老板"
            className="h-11 transition-colors"
          />
        </div>

        {/* 性别 — Segmented Control */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <span className="h-3.5 w-3.5 inline-flex items-center justify-center text-muted-foreground text-sm leading-none">
              ⚥
            </span>
            性别
          </Label>
          <div
            role="radiogroup"
            aria-label="性别"
            className="
              grid grid-cols-3 gap-1 p-1 rounded-xl
              bg-muted/60 border border-border/60
            "
          >
            {GENDER_OPTIONS.map((opt) => {
              const selected = gender === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={opt.label}
                  onClick={() => setGender(opt.value)}
                  className={`
                    relative h-10 rounded-lg text-sm font-medium
                    transition-all duration-200 ease-out
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                    ${
                      selected
                        ? 'bg-popover text-foreground shadow-soft ring-1 ring-border/80'
                        : 'text-muted-foreground hover:text-foreground hover:bg-popover/60'
                    }
                  `}
                >
                  {selected && (
                    <span
                      className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary"
                      aria-hidden
                    />
                  )}
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            选填,仅用于个性化推荐,不会公开展示
          </p>
        </div>

        {/* 简介 */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label
              htmlFor="ep-bio"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <Quote className="h-3.5 w-3.5 text-muted-foreground" />
              简介
            </Label>
            <span
              id="ep-bio-count"
              data-testid="ep-bio-count"
              className={`text-xs tabular-nums transition-colors ${bioCountColor}`}
              aria-live="polite"
            >
              {bio.length}/{BIO_MAX_UI}
            </span>
          </div>
          <div className="relative">
            <Textarea
              id="ep-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="说点什么…让大家认识你"
              rows={4}
              aria-describedby="ep-bio-count"
              data-testid="ep-bio"
              className="
                resize-none transition-all duration-200
                focus-visible:ring-2 focus-visible:ring-primary/40
                pb-7
              "
            />
            {/* 装饰:左下角铅笔图标提示 */}
            <PencilLine
              className="
                absolute bottom-2.5 right-3 h-3.5 w-3.5
                text-muted-foreground/40 pointer-events-none
              "
              aria-hidden
            />
          </div>
        </div>

        {/* 提示卡片 */}
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 flex gap-2 items-start">
          <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-bold">i</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            完善个人资料有助于获得更多信任与互动。所有信息仅在必要时公开。
          </p>
        </div>
      </div>
    </Sheet>
  );
}