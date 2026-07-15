'use client';

/**
 * [P1-18 2026-07-15] Post 详情页错误边界
 * 帖子详情可能因为: 帖子不存在/被删除/API 错误/网络中断 等失败
 * 之前: 整个页面崩溃白屏
 * 修复: 显示友好提示 + 重试 + 返回列表
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { FileQuestion, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PostDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[Post Detail Error]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">无法加载帖子</h1>
        <p className="text-muted-foreground text-sm">
          帖子可能已删除、审核未通过, 或网络异常。
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            错误 ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button onClick={reset} variant="default" size="sm">
            <RefreshCw className="mr-1 h-4 w-4" />
            重新加载
          </Button>
          <Link href="/posts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回列表
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
