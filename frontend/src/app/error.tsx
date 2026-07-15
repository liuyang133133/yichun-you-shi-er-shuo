'use client';

/**
 * [P1-18 2026-07-15] 全局错误边界
 * Next.js 15 约定: error.tsx 自动捕获子组件抛出的错误, 显示 fallback UI
 * 之前: 任何未捕获错误会让整个应用崩溃白屏, 用户体验差
 * 修复: 提供"重试"和"返回首页"两个动作, 用户可恢复
 *
 * 注意: error.tsx 必须是 client component ('use client')
 * 不能捕获的事件: 同级的 layout.tsx 错误, 全局错误需用 global-error.tsx
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 上报错误到日志服务 (V1.1 接入 Sentry, 这里先 console)
    // eslint-disable-next-line no-console
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">页面出错了</h1>
        <p className="text-muted-foreground text-sm">
          抱歉, 页面加载时遇到问题。请尝试刷新, 或返回首页。
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            错误 ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button onClick={reset} variant="default" size="sm">
            <RefreshCw className="mr-1 h-4 w-4" />
            重试
          </Button>
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="mr-1 h-4 w-4" />
              返回首页
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
