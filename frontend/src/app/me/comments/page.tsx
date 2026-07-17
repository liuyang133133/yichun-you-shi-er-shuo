'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { commentApi } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { formatRelative } from '@/lib/date';

/**
 * [T-024-m 2026-07-16] 个人中心 "留言" 列表:
 *   - 后端 GET /comments/me (comment.service.findReceivedByMe)
 *   - 语义: 我作为帖子主人收到的所有留言 (跟我发布的 post 关联)
 *   - 一行一条留言: 谁留言 · 留言内容预览 · 在哪个帖 · 时间
 *   - 点击跳转: 评论者主页 / 帖子详情 (slug-aware) / 帖子留言区定位
 *
 * T-024-m 简化版: 整行 click 进帖子详情 (vite 评论锚点 location.hash 后续可加)
 */

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  house: { label: '房屋', emoji: '🏠' },
  secondhand: { label: '二手', emoji: '🛍️' },
  job: { label: '招聘', emoji: '💼' },
  lifebiz: { label: '便民', emoji: '📌' },
};

interface ReceivedComment {
  id: string;
  content: string;
  createdAt: string;
  user?: { id: string; nickname: string; avatar?: string };
  post?: { id: string; title: string; slug?: string; type?: string; status?: string };
}

export default function MyCommentsPage() {
  const [list, setList] = useState<ReceivedComment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) return;
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await commentApi.receivedByMe({ page: 1, pageSize: 50 });
      setList((r?.list || []) as ReceivedComment[]);
      setTotal(r?.total || 0);
    } catch {
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container max-w-3xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/me" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回个人中心
        </Link>
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <MessageCircle className="h-7 w-7 text-primary" /> 我收到的留言
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          共 {total} 条 — 别人在我的帖子里留的言
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">还没有收到任何留言</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((c) => {
            const t = c.post?.type && TYPE_LABELS[c.post.type];
            const postSlug = c.post?.slug || '';
            const postHref = c.post
              ? `/posts/${c.post.id}${postSlug ? `-${postSlug}` : ''}`
              : '/';
            return (
              <Link
                key={c.id}
                href={postHref}
                className="block bg-card rounded-2xl border p-4 transition-colors hover:shadow-md hover:border-primary/40"
              >
                <div className="flex items-start gap-3">
                  {/* 留言者头像 fallback */}
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center text-white font-bold shrink-0">
                    {(c.user?.nickname || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-sm truncate">
                        {c.user?.nickname || '匿名用户'}
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {formatRelative(c.createdAt)}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-foreground/90 leading-relaxed line-clamp-2 whitespace-pre-wrap break-words">
                      {c.content}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {t && <span>{t.emoji}</span>}
                      <span className="truncate max-w-[60vw]">
                        来自帖: {c.post?.title || '已删除'}
                      </span>
                      {c.post?.status === 'pending' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px]">
                          待审核
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
