'use client';

/**
 * T-008: 通知中心列表
 * 路径: /me/notifications
 * 功能: 全部/未读 切换 + 列表 + 单条/全部已读 + 删除 + 跳转
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell, Check, CheckCheck, Trash2, Settings, Inbox, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notificationsApi, type NotificationItem, type NotificationEvent } from '@/lib/notifications';
import { useUnreadCount } from '@/lib/use-unread-count';
import { formatRelative } from '@/lib/date';
import { clsx } from 'clsx';

const EVENT_LABELS: Record<NotificationEvent, { label: string; emoji: string }> = {
  comment: { label: '评论', emoji: '💬' },
  audit: { label: '审核', emoji: '✅' },
  order: { label: '订单', emoji: '🛒' },
  auth: { label: '认证', emoji: '🔐' },
  system: { label: '系统', emoji: '📢' },
  appeal: { label: '申诉', emoji: '⚖️' },
  follow: { label: '关注', emoji: '👥' },
  invite: { label: '邀请', emoji: '🎁' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { refresh: refreshUnread } = useUnreadCount({ intervalMs: 0 });
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [list, setList] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await notificationsApi.list({
        unreadOnly: tab === 'unread',
        page,
        pageSize: 20,
      });
      setList(r.list);
      setTotal(r.total);
    } catch {
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [tab, page]);

  async function handleMarkRead(n: NotificationItem) {
    if (!n.readAt) {
      try {
        await notificationsApi.markRead(n.id);
        await refreshUnread();
        // 本地乐观更新
        setList((l) =>
          l.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
        );
      } catch (e) {
        console.error(e);
      }
    }
    // 跳转 payload.url
    if (n.payload?.url) {
      router.push(n.payload.url);
    } else if (n.payload?.type && n.payload?.id) {
      router.push(`/${n.payload.type}/${n.payload.id}`);
    }
  }

  async function handleMarkAllRead() {
    if (!confirm('标记全部已读？')) return;
    try {
      await notificationsApi.markAllRead();
      await refreshUnread();
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('删除这条通知？')) return;
    try {
      await notificationsApi.remove(id);
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  const pageCount = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <div className="container py-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">通知中心</h1>
              <p className="text-xs text-muted-foreground">共 {total} 条</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/me/notifications/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" /> 偏好设置
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4 mr-1" /> 全部已读
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => { setTab('all'); setPage(1); }}
            className={clsx(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              tab === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 hover:bg-secondary',
            )}
          >
            全部
          </button>
          <button
            onClick={() => { setTab('unread'); setPage(1); }}
            className={clsx(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              tab === 'unread' ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 hover:bg-secondary',
            )}
          >
            未读
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">加载中…</div>
        ) : list.length === 0 ? (
          <div className="bg-card rounded-2xl border p-16 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">{tab === 'unread' ? '没有未读通知 🎉' : '暂无通知'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((n) => {
              const event = EVENT_LABELS[n.event] || { label: n.event, emoji: '📌' };
              const isUnread = !n.readAt;
              return (
                <div
                  key={n.id}
                  className={clsx(
                    'bg-card rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer group',
                    isUnread && 'border-l-4 border-l-primary bg-primary/[0.02]',
                  )}
                  onClick={() => handleMarkRead(n)}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-lg shrink-0">
                      {event.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm truncate">{n.title}</span>
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-label="未读" />
                        )}
                        <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-secondary rounded">
                          {event.label}
                        </span>
                        {n.priority >= 4 && (
                          <span className="text-[10px] text-red-600 px-1.5 py-0.5 bg-red-50 rounded">
                            紧急
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-1">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/70">
                        {formatRelative(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isUnread && (
                        <span title="已读">
                          <Check className="h-4 w-4 text-emerald-600" />
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(n.id);
                        }}
                        className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center"
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 分页 */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              上一页
            </Button>
            <span className="text-sm text-muted-foreground">
              第 {page} / {pageCount} 页
            </span>
            <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
              下一页
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}