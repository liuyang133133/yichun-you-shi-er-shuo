'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { messagesApi, usersApi, type MessageItem } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { formatDateTime } from '@/lib/date';
// [P1-14 2026-07-15] alert() 会冻主线程, 改用 toast (与全站一致)
import { toast } from '@/components/toast/toaster';
import { ArrowLeft, Mail, Inbox, Send, CheckCheck, MessageSquare } from 'lucide-react';

type Message = MessageItem;

export default function MyMessagesPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center text-muted-foreground">加载中…</div>}>
      <MyMessagesContent />
    </Suspense>
  );
}

function MyMessagesContent() {
  const router = useRouter();
  const [tab, setTab] = useState<'inbox' | 'outbox'>('inbox');
  const [inbox, setInbox] = useState<Message[]>([]);
  const [outbox, setOutbox] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 写站内信
  const [showCompose, setShowCompose] = useState(false);
  const [receiverPhone, setReceiverPhone] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    loadInbox();
  }, [router]);

  async function loadInbox() {
    setLoading(true);
    setError(null);
    try {
      const r = await messagesApi.inbox({ page: 1, pageSize: 50 });
      setInbox(r?.list || []);
      setUnread(r?.unreadCount || 0);
    } catch (e) {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function loadOutbox() {
    setLoading(true);
    try {
      const r = await messagesApi.outbox({ page: 1, pageSize: 50 });
      setOutbox(r?.list || []);
    } catch (e) {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'inbox') loadInbox();
    else loadOutbox();
  }, [tab]);

  async function markAllRead() {
    try {
      await messagesApi.readAll();
      loadInbox();
    } catch {}
  }

  async function sendMessage() {
    if (!receiverPhone.trim() || !content.trim()) {
      toast.error('请填写收件人手机号和内容');
      return;
    }
    setSending(true);
    try {
      // [T-024-h 2026-07-15] 修复: 后端 send-message DTO 改为 receiverPhone,
      // 不再需要前端先 usersApi.search (走脱敏公开列表查不到完整手机号)
      await messagesApi.send({ receiverPhone: receiverPhone.trim(), content: content.trim() } as any);
      setShowCompose(false);
      setReceiverPhone('');
      setContent('');
      setTab('outbox');
    } catch (e: any) {
      toast.error('发送失败：' + (e?.message || '请稍后再试'));
    } finally {
      setSending(false);
    }
  }

  const list = tab === 'inbox' ? inbox : outbox;

  return (
    <main className="container max-w-3xl py-6 space-y-6">
      <Link href="/me" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> 返回个人中心
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Mail className="h-7 w-7 text-primary" /> 站内信
            {unread > 0 && (
              <span className="text-sm font-normal text-white bg-red-500 rounded-full px-2 py-0.5">
                {unread} 条未读
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">与其他用户私下沟通</p>
        </div>
        <Button onClick={() => setShowCompose(true)} className="rounded-full">
          <Send className="h-4 w-4 mr-1" /> 写信
        </Button>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab('inbox')}
          className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-all ${
            tab === 'inbox' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Inbox className="h-4 w-4" /> 收件箱
        </button>
        <button
          onClick={() => setTab('outbox')}
          className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-all ${
            tab === 'outbox' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Send className="h-4 w-4" /> 发件箱
        </button>
        {tab === 'inbox' && unread > 0 && (
          <button
            onClick={markAllRead}
            className="ml-auto px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <CheckCheck className="h-3 w-3" /> 全部已读
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">{error}</div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-muted-foreground mb-4">
              {tab === 'inbox' ? '收件箱是空的' : '还没有发送过消息'}
            </p>
            {tab === 'outbox' && (
              <Button onClick={() => setShowCompose(true)}>写第一封信</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((m) => {
            // [T-024-i 2026-07-16] 点击进双人会话页
            // inbox 跳对方 = sender; outbox 跳对方 = receiver
            const otherId = tab === 'inbox' ? m.sender?.id : m.receiver?.id;
            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (otherId) router.push(`/me/messages/with/${otherId}`);
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && otherId) {
                    router.push(`/me/messages/with/${otherId}`);
                  }
                }}
                className={`p-4 rounded-2xl border transition-colors cursor-pointer hover:shadow-md hover:border-primary/40 ${
                  tab === 'inbox' && !m.isRead ? 'bg-blue-50/50 border-blue-200' : 'bg-card'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {(tab === 'inbox' ? m.sender?.nickname : m.receiver?.nickname)?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-sm truncate">
                        {tab === 'inbox' ? m.sender?.nickname : `→ ${m.receiver?.nickname}`}
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDateTime(m.createdAt)}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-foreground/90 leading-relaxed break-words whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 写信弹窗 */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" /> 发送站内信
                </h3>
                <button onClick={() => setShowCompose(false)} className="text-muted-foreground hover:text-foreground text-xl">×</button>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">收件人手机号</label>
                  <Input
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="11 位手机号"
                    maxLength={11}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">消息内容</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    maxLength={1000}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
                    placeholder="说点什么..."
                  />
                  <div className="text-xs text-muted-foreground text-right">{content.length}/1000</div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowCompose(false)}>取消</Button>
                  <Button onClick={sendMessage} disabled={sending}>
                    {sending ? '发送中…' : '发送'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
