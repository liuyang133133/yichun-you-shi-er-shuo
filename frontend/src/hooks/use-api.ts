'use client';

import * as React from 'react';
import { ApiError } from '@/lib/api';
import { toast } from '@/components/toast/toaster';

export interface UseApiOptions<T> {
  /** 立即执行（默认 true） */
  immediate?: boolean;
  /** 成功 toast */
  successMessage?: string;
  /** 失败 toast（默认开启；传 false 关闭） */
  errorMessage?: string | false;
  /** 失败时回调 */
  onError?: (e: ApiError) => void;
  /** 成功时回调 */
  onSuccess?: (data: T) => void;
}

export interface UseApiResult<T, Args extends any[]> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  /** 手动触发 */
  run: (...args: Args) => Promise<T | null>;
  /** 重置 */
  reset: () => void;
}

/**
 * useApi — 统一 loading / error / toast 处理
 *
 * 用法：
 * const { data, loading, error, run } = useApi(
 *   (postId: string) => postApi.get(postId),
 *   { errorMessage: '加载失败', onSuccess: (p) => console.log(p) }
 * );
 *
 * 模板（页面级）：
 * if (loading) return <PageLoading />;
 * if (error) return <ErrorState onRetry={run} />;
 * if (!data || data.list.length === 0) return <EmptyState ... />;
 */
export function useApi<T, Args extends any[] = []>(
  fn: (...args: Args) => Promise<T>,
  opts: UseApiOptions<T> = {},
): UseApiResult<T, Args> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(opts.immediate !== false);
  const [error, setError] = React.useState<ApiError | null>(null);
  const mountedRef = React.useRef(true);
  const argsRef = React.useRef<Args | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = React.useCallback(
    async (...args: Args) => {
      argsRef.current = args;
      setLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        if (!mountedRef.current) return result;
        setData(result);
        if (opts.successMessage) {
          toast.success(opts.successMessage);
        }
        opts.onSuccess?.(result);
        return result;
      } catch (e: any) {
        if (!mountedRef.current) return null;
        const err =
          e instanceof ApiError
            ? e
            : new ApiError(e?.message || '未知错误', -1, 500, null);
        setError(err);
        if (opts.errorMessage !== false) {
          const msg = opts.errorMessage || err.message || '请求失败';
          toast.error(msg);
        }
        opts.onError?.(err);
        return null;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [fn, opts],
  );

  // 立即执行
  React.useEffect(() => {
    if (opts.immediate !== false) {
      run(...([] as unknown as Args));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = React.useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, run, reset };
}