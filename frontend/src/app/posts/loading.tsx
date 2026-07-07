/**
 * [P1-08] V1.0 验收修复: 移动端 /posts?type=xxx 加载慢卡在"加载中…"
 * 根因: Next.js dev 首次编译 + 没有专门 loading.tsx, Suspense fallback 只是"加载中…"
 * 修复: 用 next.js loading.tsx 约定, 显示 8 个 PostCardSkeleton 占位
 *       移动端先看到骨架, 不会以为页面卡死
 */
import { PostCardSkeleton } from '@/components/patterns/empty-state';

export default function PostsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-white">
      {/* Hero 占位 */}
      <section className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          <div className="h-10 w-48 bg-white/20 rounded-md animate-pulse mb-3" />
          <div className="h-5 w-96 max-w-full bg-white/15 rounded animate-pulse" />
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* 筛选条占位 */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-muted/60 rounded-full animate-pulse shrink-0" />
          ))}
        </div>

        {/* 列表骨架 */}
        <PostCardSkeleton count={8} />
      </div>
    </div>
  );
}
