'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { ArrowLeft, Mail, Inbox, Send, CheckCheck, MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: number;
  createdAt: string;
  sender?: { id: string; nickname: string; avatar?: string };
  receiver?: { id: string; nickname: string; avatar?: string };
}

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
      const r = await fetch('http://localhost:3001/api/v1/messages/inbox', {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      const j = await r.json();
      setInbox(j?.data?.list || []);
      setUnread(j?.data?.unreadCount || 0);
    } catch (e) {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function loadOutbox() {
    setLoading(true);
    try {
      const r = await fetch('http://localhost:3001/api/v1/messages/outbox', {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      const j = await r.json();
      setOutbox(j?.data?.list || []);
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
      await fetch('http://localhost:3001/api/v1/messages/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      loadInbox();
    } catch {}
  }

  async function sendMessage() {
    if (!receiverPhone.trim() || !content.trim()) {
      alert('请填写收件人手机号和内容');
      return;
    }
    setSending(true);
    try {
      // 先查用户 ID（通过 phone）
      const r = await fetch(
        `http://localhost:3001/api/v1/users?keyword=${encodeURIComponent(receiverPhone)}`,
        { headers: { Authorization: `Bearer ${getAccessToken()}` } },
      );
      const j = await r.json();
      const target = (j?.data?.list || []).find(
        (u: any) => u.phone === receiverPhone.trim(),
      );
      if (!target) {
        alert('收件人不存在或手机号错误');
        return;
      }
      // 发消息
      const sendR = await fetch('http://localhost:3001/api/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ receiverId: Number(target.id), content: content.trim() }),
      });
      if (!sendR.ok) {
        const err = await sendR.json().catch(() => ({}));
        alert('发送失败：' + (err?.message || sendR.status));
        return;
      }
      setShowCompose(false);
      setReceiverPhone('');
      setContent('');
      setTab('outbox');
    } catch (e) {
      alert('发送失败');
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
          {list.map((m) => (
            <div
              key={m.id}
              className={`p-4 rounded-2xl border transition-colors ${
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
                      {new Date(m.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-foreground/90 leading-relaxed break-words whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              </div>
            </div>
          ))}
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
