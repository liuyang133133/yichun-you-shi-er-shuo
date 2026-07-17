'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { messagesApi, type MessageItem } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { formatDateTime } from '@/lib/date';
import { toast } from '@/components/toast/toaster';
import { ArrowLeft, Send, MessageSquare } from 'lucide-react';

/**
 * [T-024-i 2026-07-16] 双人会话页 (按 userId)
 * - GET /api/v1/messages/with/:userId 自动 markRead 接收方未读
 * - 底部输入框 + 发送 (后端 DTO 兼容 receiverId)
 *
 * [T-024-j 2026-07-16] 修复: 之前 default export 包 Suspense + 内部函数导致 SSR 阶段
 *   "Element type invalid" + "generateViewport is on the client" 两个 Next.js 15 报错
 *   (混 default/named import + viewport 跨边界生成失败)
 * 修: 直接 default export 客户端组件, 不用 Suspense 包装
 */
export default function ConversationPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const otherId = params?.userId;

  const [list, setList] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherNickname, setOtherNickname] = useState<string>('');
  const [myUserId, setMyUserId] = useState<string>('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    if (!otherId) return;
    load();
  }, [otherId, router]);

  // 加载完滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [list]);

  async function load() {
    if (!otherId) return;
    setLoading(true);
    try {
      const r = await messagesApi.conversation(otherId, { page: 1, pageSize: 100 });
      const arr = (r?.list || []) as MessageItem[];
      setList(arr);

      // 从 ls.yichun_user 拿我的 id (login/page.tsx setStoredUser 写过 id + nickname)
      try {
        const raw = localStorage.getItem('yichun_user');
        if (raw) {
          const u = JSON.parse(raw);
          setMyUserId(String(u.id || ''));
        }
      } catch {}

      // 从消息方向推断对方昵称: 找一条 sender != 我的 或 receiver != 我的
      const other = arr.find((m) => m.sender?.id && m.receiver?.id)
        || arr[0];
      if (other) {
        const myStored = (() => {
          try { return String(JSON.parse(localStorage.getItem('yichun_user') || '{}').id || ''); }
          catch { return ''; }
        })();
        const senderIsMe = other.sender?.id === myStored;
        setOtherNickname(
          (senderIsMe ? other.receiver?.nickname : other.sender?.nickname) || '对话',
        );
      } else {
        setOtherNickname('对话');
      }
    } catch (e: any) {
      toast.error('加载失败：' + (e?.message || '请稍后再试'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!content.trim() || !otherId) return;
    setSending(true);
    try {
      // [T-024-i] 后端 DTO 兼容 receiverId, 会话页直接用 otherId 发
      await messagesApi.send({ receiverId: otherId, content: content.trim() } as any);
      setContent('');
      // 重新拉
      await load();
    } catch (e: any) {
      toast.error('发送失败：' + (e?.message || '请稍后再试'));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="container max-w-3xl py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/me/messages" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回收件箱
        </Link>
      </div>

      <header className="flex items-center gap-3 pb-3 border-b">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center text-white font-bold">
          {(otherNickname || '?').charAt(0)}
        </div>
        <div>
          <h1 className="font-bold text-lg">{otherNickname || '对话'}</h1>
          <p className="text-xs text-muted-foreground">双人会话</p>
        </div>
      </header>

      {/* 消息流 */}
      <div className="rounded-2xl border bg-card p-4 space-y-3 min-h-[260px] max-h-[55vh] overflow-y-auto">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">加载中…</div>
        ) : list.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>暂无消息记录</p>
          </div>
        ) : (
          list.map((m) => {
            const mine = myUserId && m.sender?.id === myUserId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    mine
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  <div>{m.content}</div>
                  <div className={`mt-1 text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {formatDateTime(m.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 写消息 */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={1000}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
            placeholder={`回复 ${otherNickname || 'TA'}...`}
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">{content.length}/1000</div>
            <Button onClick={handleSend} disabled={sending || !content.trim()} className="rounded-full">
              <Send className="h-4 w-4 mr-1" />
              {sending ? '发送中…' : '发送'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
