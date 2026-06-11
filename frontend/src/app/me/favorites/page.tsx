'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PostCard, type PostCardData } from '@/components/post/post-card';
import { favoriteApi } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { ArrowLeft, Heart, Search } from 'lucide-react';

export default function MyFavoritesPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center text-muted-foreground">加载中…</div>}>
      <MyFavoritesContent />
    </Suspense>
  );
}

function MyFavoritesContent() {
  const router = useRouter();
  const [list, setList] = useState<PostCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    favoriteApi
      .list()
      .then((r: any) => {
        const data = r?.data || r || [];
        // 提取 post 字段
        const posts = Array.isArray(data) ? data.map((f: any) => f.post || f) : [];
        setList(posts.filter((p: any) => p && p.id));
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = keyword
    ? list.filter(
        (p) => p.title?.includes(keyword) || (p as any).description?.includes(keyword),
      )
    : list;

  return (
    <main className="container max-w-6xl py-6 space-y-6">
      <Link href="/me" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> 返回个人中心
      </Link>

      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Heart className="h-7 w-7 text-pink-500 fill-pink-500" /> 我的收藏
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          你收藏的房屋 / 二手 / 招聘 / 便民信息（共 {list.length} 条）
        </p>
      </div>

      {/* 搜索 */}
      {list.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索收藏的标题或描述…"
            className="w-full h-10 pl-10 pr-3 rounded-full border border-input bg-background text-sm"
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card overflow-hidden">
              <div className="aspect-[16/9] bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">💝</div>
            <p className="text-muted-foreground mb-4">还没有收藏任何信息</p>
            <Link href="/">
              <Button>去发现感兴趣的</Button>
            </Link>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          没有找到匹配 &quot;{keyword}&quot; 的收藏
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((p, i) => (
            <PostCard key={p.id} post={p} index={i} />
          ))}
        </div>
      )}
    </main>
  );
}
