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

  function handleClose() {
    if (saving || uploading) return;
    if (isDirty) {
      const ok = window.confirm('放弃修改?');
      if (!ok) return;
    }
    onClose();
  }

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
            disabled={uploading || saving}
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
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="说点什么…"
            rows={4}
            aria-describedby="ep-bio-count"
            data-testid="ep-bio"
          />
          <div
            id="ep-bio-count"
            data-testid="ep-bio-count"
            className="text-xs text-muted-foreground text-right"
          >
            {bio.length}/{BIO_MAX_UI}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
