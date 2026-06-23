'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * /posts 重定向到 /?type=...
 *
 * 历史遗留路由统一入口，避免与首页 /?type=house 风格分裂
 * 保留 query 参数 (type, page)
 *
 * 例：
 *   /posts            → /?type=secondhand （默认二手）
 *   /posts?type=house → /?type=house
 *   /posts?type=job&page=2 → /?type=job&page=2
 */
export default function PostsIndexRedirect() {
  const router = useRouter();
  const sp = useSearchParams();
  useEffect(() => {
    const params = new URLSearchParams();
    const type = sp.get('type') || 'secondhand';
    params.set('type', type);
    const page = sp.get('page');
    if (page && page !== '1') params.set('page', page);
    router.replace(`/?${params.toString()}`);
  }, [router, sp]);
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      跳转中…
    </div>
  );
}