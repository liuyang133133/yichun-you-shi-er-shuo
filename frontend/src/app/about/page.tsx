/**
 * T-018: /about 关于我们
 */

import type { Metadata } from 'next';
import { agreementApi } from '@/lib/api';
import { SimpleMarkdown } from '@/components/markdown/simple-markdown';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const a = await agreementApi.byKey('about');
    return {
      title: a.title,
      description: '伊春有事儿说 — 让伊春本地生活更便捷的分类信息平台',
    };
  } catch {
    return {
      title: '关于伊春有事儿说',
      description: '伊春本地生活分类信息平台',
    };
  }
}

export default async function AboutPage() {
  let agreement;
  let error: string | null = null;
  try {
    agreement = await agreementApi.byKey('about');
  } catch (e: any) {
    error = e?.message ?? '加载失败';
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <a href="/" className="hover:text-emerald-600">← 返回首页</a>
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <h1 className="mb-2 text-2xl font-bold">关于我们</h1>
          <p>内容暂时无法加载，请稍后再试。{error}</p>
        </div>
      ) : (
        <article data-testid="agreement-content">
          <SimpleMarkdown content={agreement!.content} />
        </article>
      )}
    </main>
  );
}
