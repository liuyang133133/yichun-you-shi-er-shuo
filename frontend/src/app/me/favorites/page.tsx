'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PostCard, type PostCardData } from '@/components/post/post-card';
import { SearchInput } from '@/components/patterns/search-input';
import { PostCardSkeleton, EmptyState } from '@/components/patterns/empty-state';
import { favoriteApi } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { ArrowLeft, Heart, Search } from 'lucide-react';

export default function MyFavoritesPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-20 text-center text-muted-foreground">加载中…</div>
      }
    >
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
      <Link
        href="/me"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
        返回个人中心
      </Link>

      {/* 标题 + 统计 */}
      <header>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Heart className="h-7 w-7 text-pink-500 fill-pink-500" />
          我的收藏
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          你收藏的房屋 / 二手 / 招聘 / 便民信息（共 {list.length} 条）
        </p>
      </header>

      {/* 搜索 */}
      {list.length > 0 && (
        <div className="max-w-md">
          <SearchInput
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索收藏的标题或描述…"
            aria-label="搜索收藏"
          />
        </div>
      )}

      {/* 内容 */}
      {loading ? (
        <PostCardSkeleton count={8} />
      ) : list.length === 0 ? (
        <EmptyState
          title="还没有收藏任何信息"
          description="看到喜欢的信息，点一下❤️收藏起来，随时查看"
          action={{ label: '去发现感兴趣的', href: '/' }}
          secondaryAction={{ label: '发布新信息', href: '/posts/publish' }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-16 w-16" strokeWidth={1.2} />}
          title={`没有找到匹配「${keyword}」的收藏`}
          description="试试其他关键词，或清空搜索条件"
          action={{ label: '清空搜索', onClick: () => setKeyword('') }}
        />
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