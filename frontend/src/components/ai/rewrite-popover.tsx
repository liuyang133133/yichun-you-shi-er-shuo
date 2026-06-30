'use client';
import { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiApi, type AiPostType } from '@/lib/api-ai';
import type { RewriteVersion } from '@/types/ai-rewrite';
import { cn } from '@/lib/utils';

interface Props {
  type: AiPostType;
  field: 'title' | 'description';
  original: string;
  context?: Record<string, any>;
  onApply: (text: string) => void;
}

/**
 * Minimal popover (no @radix-ui/react-popover dependency).
 * Click the trigger to open; click outside / X / Escape to close.
 */
export function RewritePopover({ type, field, original, context, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<RewriteVersion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function load() {
    if (!original || versions.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const r = await aiApi.rewrite({ type, field, original, context });
      setVersions(r.versions || []);
    } catch (e: any) {
      setError(e?.message || '改写失败, 请重试');
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) load();
  }

  function handleReset() {
    setVersions([]);
    setError(null);
    load();
  }

  function applyVersion(v: RewriteVersion) {
    onApply(v.text);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
        disabled={!original}
        onClick={handleToggle}
        title="AI 改写"
      >
        <Sparkles className="h-4 w-4" />
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="AI 改写建议"
          className={cn(
            'absolute z-50 mt-1 right-0',
            'w-80 md:w-96',
            'rounded-lg border bg-popover text-popover-foreground shadow-lg',
            'p-4 space-y-3',
          )}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              AI 改写建议 <span className="text-muted-foreground text-xs">(3 风格)</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> AI 正在改写...
            </div>
          )}

          {!loading && error && (
            <div className="text-sm text-rose-600 py-2">{error}</div>
          )}

          {!loading && !error && versions.length === 0 && (
            <div className="text-sm text-muted-foreground py-2">暂无建议</div>
          )}

          {!loading && versions.map((v, i) => (
            <button
              key={`${v.style}-${i}`}
              type="button"
              onClick={() => applyVersion(v)}
              className={cn(
                'w-full text-left border rounded-lg p-3',
                'hover:bg-accent hover:border-primary/50 transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {v.style === 'concise' ? '精简' : v.style === 'attractive' ? '吸引' : 'SEO'}
                </span>
                {v.estimatedScoreGain > 0 && (
                  <span className="text-xs text-emerald-600 font-medium">
                    +{v.estimatedScoreGain} 分
                  </span>
                )}
              </div>
              <div className="text-sm whitespace-pre-wrap break-words">{v.text}</div>
            </button>
          ))}

          <div className="flex justify-between pt-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onApply(original)}
            >
              <RotateCcw className="h-3 w-3 mr-1" /> 用原版
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={loading}
            >
              重新生成
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
