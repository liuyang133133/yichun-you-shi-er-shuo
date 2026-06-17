'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExtractChips } from '@/components/ai/extract-chips';
import { TitleSuggestions, SkipAiButton } from '@/components/ai/title-suggestions';
import { aiApi, ExtractResponse, RAW_TEXT_MAX, RAW_TEXT_MIN, AiPostType } from '@/lib/api-ai';
import { Sparkles, Loader2, AlertCircle, ChevronRight } from 'lucide-react';

type Status = 'idle' | 'loading' | 'success' | 'error';

const EXAMPLE_HINTS = [
  '南郡精装两室一厅 8楼 1200一月 押一付三 拎包入住',
  '出售金水湾 90平 两室 50万 简装 三楼',
  '招聘 餐厅服务员 月薪3500-4500 经验不限',
];

interface Props {
  initialType?: AiPostType;
}

export default function AiPublishMode({ initialType = 'house' }: Props) {
  const router = useRouter();
  const [rawText, setRawText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastHash = useRef<string>('');

  // debounce 800ms
  useEffect(() => {
    if (rawText.length < RAW_TEXT_MIN) {
      setStatus('idle');
      setResult(null);
      setError(null);
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setStatus('loading');
    debounceTimer.current = setTimeout(() => {
      runExtract();
    }, 800);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawText]);

  async function runExtract() {
    setError(null);
    try {
      const r = await aiApi.extract(rawText, initialType);
      if (r.rawTextHash === lastHash.current) return; // 防 stale
      lastHash.current = r.rawTextHash;
      setResult(r);
      setStatus('success');
      if (r.suggestions.titles[0]) setSelectedTitle(r.suggestions.titles[0]);
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'AI 暂不可用');
    }
  }

  function goToManual(prefill: Record<string, any>) {
    const params = new URLSearchParams({ mode: 'manual', type: initialType });
    Object.entries(prefill).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') {
        params.set(`prefill_${k}`, String(v));
      }
    });
    if (selectedTitle) params.set('prefill_title', selectedTitle);
    router.push(`/posts/publish?${params.toString()}`);
  }

  const charCount = rawText.length;
  const isOverLimit = charCount > RAW_TEXT_MAX;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-white">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Sparkles className="h-3 w-3" />
            智能发布
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">把您要发的内容写出来，AI 帮您整理</h1>
          <p className="text-sm text-muted-foreground">
            不用填表，像聊天一样发信息 ——
            {initialType === 'house' ? '房屋出租' : '其他类型'} 也能用
          </p>
        </div>

        {/* 输入区 */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="试试这样写：金水湾精装两室一厅 8楼 1200一月 押一付三 拎包入住"
              className="min-h-[140px] text-base resize-y"
              maxLength={RAW_TEXT_MAX + 50}
              autoFocus
            />
            <div className="flex items-center justify-between text-xs">
              <div className="text-muted-foreground">
                {charCount}/{RAW_TEXT_MAX}
                {isOverLimit && <span className="text-rose-500 ml-2">超出 {charCount - RAW_TEXT_MAX} 字</span>}
              </div>
              <div className="text-muted-foreground">
                {status === 'loading' && (
                  <span className="flex items-center gap-1 text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" /> AI 正在分析...
                  </span>
                )}
                {status === 'idle' && charCount > 0 && charCount < RAW_TEXT_MIN && (
                  <span>至少输入 {RAW_TEXT_MIN} 字</span>
                )}
                {status === 'error' && (
                  <span className="flex items-center gap-1 text-rose-500">
                    <AlertCircle className="h-3 w-3" /> {error}
                  </span>
                )}
                {status === 'success' && result && (
                  <span>
                    耗时 {result.durationMs}ms{result.cached && ' (已缓存)'}
                  </span>
                )}
              </div>
            </div>

            {/* 示例提示 */}
            {charCount === 0 && (
              <div className="pt-2 border-t space-y-1.5">
                <div className="text-xs text-muted-foreground">不知道写啥？试试这些：</div>
                {EXAMPLE_HINTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setRawText(ex)}
                    className="block w-full text-left text-sm text-primary hover:underline truncate"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 结果区 */}
        {status === 'success' && result && (
          <Card>
            <CardContent className="p-5 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <span>已识别</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {Object.keys(result.fields).filter((k) => result.fields[k]).length} / {Object.keys(result.fields).length} 个字段
                  </span>
                </div>
                <ExtractChips chips={result.chips} missingFields={result.missingFields} />
              </div>

              {result.suggestions.titles.length > 0 && (
                <TitleSuggestions
                  titles={result.suggestions.titles}
                  onSelect={setSelectedTitle}
                />
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => goToManual(result.fields)}
                  disabled={!result.fields.areaName && !result.fields.title}
                >
                  用这个去发布
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <SkipAiButton onSkip={() => router.push(`/posts/publish?mode=manual&type=${initialType}`)} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 错误时给个兜底入口 */}
        {status === 'error' && (
          <Card>
            <CardContent className="p-5 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
              <div>
                <div className="font-medium text-foreground">AI 暂时不可用</div>
                <div className="text-sm text-muted-foreground mt-1">您可以手动填写，或稍后再试</div>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={runExtract} variant="outline" size="sm">
                  重试
                </Button>
                <Button onClick={() => router.push(`/posts/publish?mode=manual&type=${initialType}`)} variant="ghost" size="sm">
                  直接手动填写
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
