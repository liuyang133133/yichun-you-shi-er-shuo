'use client';

/**
 * [P1-18 2026-07-15] /me/* 子树错误边界
 * 个人中心可能因为: token 过期/API 500/数据格式错误 等失败
 * 之前: /me 整片白屏, 用户只能手动刷新
 * 修复: 显示友好提示 + 重试 + 返回首页
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { UserX, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[Me Page Error]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <UserX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">个人中心加载失败</h1>
        <p className="text-muted-foreground text-sm">
          可能是登录状态过期或网络异常, 请重试。
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
