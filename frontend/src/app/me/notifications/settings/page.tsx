'use client';

// T-018 build 修复: 避免预渲染时 useSearchParams Suspense 报错
export const dynamic = 'force-dynamic';

/**
 * T-008: 通知偏好设置
 * 路径: /me/notifications/settings
 * 功能: 8 类事件启用开关 + 静默时段 (quietHours) 设置
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Settings, ArrowLeft, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { notificationsApi, type NotificationSetting, type NotificationEvent } from '@/lib/notifications';
import { clsx } from 'clsx';

const EVENT_LABELS: Record<NotificationEvent, { label: string; emoji: string; description: string }> = {
  comment: { label: '评论', emoji: '💬', description: '收到其他用户对你帖子的评论' },
  audit: { label: '审核结果', emoji: '✅', description: '你的帖子被审核通过 / 拒绝 / 下架' },
  order: { label: '订单', emoji: '🛒', description: '订单状态变化（待 T-029 实现）' },
  auth: { label: '账号安全', emoji: '🔐', description: '登录验证、密码修改、新设备登录' },
  system: { label: '系统公告', emoji: '📢', description: '管理员群发的系统消息' },
  appeal: { label: '申诉进度', emoji: '⚖️', description: '你的举报 / 申诉处理结果' },
  follow: { label: '关注动态', emoji: '👥', description: '你关注的人 / 标签的更新（待 T-044）' },
  invite: { label: '邀请奖励', emoji: '🎁', description: '邀请好友注册 / 奖励到账' },
};

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [globalEnabled, setGlobalEnabled] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await notificationsApi.listSettings();
      setSettings(r);
      // 全局状态：全部 enabled = true
      setGlobalEnabled(r.every((s) => s.enabled));
    } catch {
      setSettings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleEvent(event: NotificationEvent, enabled: boolean) {
    setSaving(event);
    try {
      await notificationsApi.upsertSetting(event, { enabled });
      setSettings((s: NotificationSetting[]) => s.map((x) => (x.event === event ? { ...x, enabled } : x)));
    } catch (e) {
      alert('保存失败');
    } finally {
      setSaving(null);
    }
  }

  async function setQuietHours(event: NotificationEvent, quietHours: { start: string; end: string } | null) {
    setSaving(event);
    try {
      await notificationsApi.upsertSetting(event, { quietHours });
      setSettings((s) =>
        s.map((x) => (x.event === event ? { ...x, quietHours } : x)),
      );
    } catch (e) {
      alert('保存失败');
    } finally {
      setSaving(null);
    }
  }

  async function toggleGlobal() {
    const newState = !globalEnabled;
    setGlobalEnabled(newState);
    setSaving('global');
    try {
      // 并行更新所有事件
      await Promise.all(
        Object.keys(EVENT_LABELS).map((event) =>
          notificationsApi.upsertSetting(event as NotificationEvent, { enabled: newState }),
        ),
      );
      setSettings((s) => s.map((x) => ({ ...x, enabled: newState })));
    } catch (e) {
      alert('保存失败');
      setGlobalEnabled(!newState);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <div className="container py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/me/notifications"
            className="h-9 w-9 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">通知偏好</h1>
              <p className="text-xs text-muted-foreground">管理 8 类事件的接收开关</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">加载中…</div>
        ) : (
          <>
            {/* 总开关 */}
            <div className="bg-card rounded-2xl border p-5 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-semibold">接收所有通知</div>
                    <div className="text-xs text-muted-foreground">
                      关闭后，所有 8 类通知都不再接收（紧急通知除外）
                    </div>
                  </div>
                </div>
                <ToggleSwitch
                  checked={globalEnabled}
                  onChange={toggleGlobal}
                  loading={saving === 'global'}
                />
              </div>
            </div>

            {/* 8 类事件 */}
            <div className="bg-card rounded-2xl border divide-y">
              {Object.entries(EVENT_LABELS).map(([event, info]) => {
                const setting = settings.find((s) => s.event === event);
                const enabled = setting?.enabled ?? true;
                return (
                  <div key={event} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-lg shrink-0">
                          {info.emoji}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{info.label}</div>
                          <div className="text-xs text-muted-foreground">{info.description}</div>
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={enabled}
                        onChange={(v) => toggleEvent(event as NotificationEvent, v)}
                        loading={saving === event}
                      />
                    </div>

                    {/* 静默时段（仅部分类型显示） */}
                    {enabled && (event === 'comment' || event === 'system') && (
                      <QuietHoursEditor
                        value={setting?.quietHours ?? null}
                        onChange={(qh) => setQuietHours(event as NotificationEvent, qh)}
                        loading={saving === event}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- 开关 ---------- */
function ToggleSwitch({
  checked, onChange, loading,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={loading}
      className={clsx(
        'relative h-6 w-11 rounded-full transition-colors shrink-0',
        checked ? 'bg-primary' : 'bg-secondary',
        loading && 'opacity-50',
      )}
      aria-label={checked ? '关闭' : '开启'}
    >
      <span
        className={clsx(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

/* ---------- 静默时段 ---------- */
function QuietHoursEditor({
  value, onChange, loading,
}: {
  value: { start: string; end: string } | null;
  onChange: (v: { start: string; end: string } | null) => void;
  loading?: boolean;
}) {
  const [enabled, setEnabled] = useState(!!value);
  const [start, setStart] = useState(value?.start ?? '22:00');
  const [end, setEnd] = useState(value?.end ?? '08:00');

  async function save() {
    if (enabled) {
      await onChange({ start, end });
    } else {
      await onChange(null);
    }
  }

  return (
    <div className="mt-3 pl-12">
      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={async (e) => {
            setEnabled(e.target.checked);
            // 立即保存
            setTimeout(save, 0);
          }}
          className="rounded"
          disabled={loading}
        />
        <Clock className="h-3 w-3" />
        <span>启用静默时段（时段内通知自动降级，紧急通知除外）</span>
      </label>

      {enabled && (
        <div className="flex items-center gap-2 mt-2">
          <Input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            onBlur={save}
            disabled={loading}
            className="h-8 text-xs w-28"
          />
          <span className="text-xs text-muted-foreground">至</span>
          <Input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            onBlur={save}
            disabled={loading}
            className="h-8 text-xs w-28"
          />
          <Button size="sm" variant="ghost" onClick={save} disabled={loading} className="h-7 text-xs">
            <Check className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}