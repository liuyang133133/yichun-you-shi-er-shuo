/**
 * T-018: /privacy 隐私政策
 */

import type { Metadata } from 'next';
import { agreementApi } from '@/lib/api';
import { SimpleMarkdown } from '@/components/markdown/simple-markdown';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const a = await agreementApi.byKey('privacy');
    return {
      title: a.title,
      description: `伊春有事儿说 ${a.title}（v${a.version}）`,
    };
  } catch {
    return {
      title: '隐私政策',
      description: '伊春有事儿说 隐私政策',
    };
  }
}

export default async function PrivacyPage() {
  let agreement;
  let error: string | null = null;
  try {
    agreement = await agreementApi.byKey('privacy');
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
          <h1 className="mb-2 text-2xl font-bold">隐私政策</h1>
          <p>协议内容暂时无法加载，请稍后再试。{error}</p>
        </div>
      ) : (
        <article data-testid="agreement-content">
          <header className="mb-6 border-b border-gray-200 pb-4">
            <h1 className="text-3xl font-bold text-gray-900">{agreement!.title}</h1>
            <p className="mt-2 text-sm text-gray-500">
              版本 v{agreement!.version} · 生效日期 {agreement!.effectiveAt.slice(0, 10)}
            </p>
          </header>
          <SimpleMarkdown content={agreement!.content} />
        </article>
      )}
    </main>
  );
}
