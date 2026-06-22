'use client';
import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  postId: number;
  qualityScore?: number;
}

export function BoostCta({ postId, qualityScore }: Props) {
  const [visible, setVisible] = useState(true);
  const [boosting, setBoosting] = useState(false);

  if (qualityScore !== undefined && qualityScore < 50) return null;
  if (!visible) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 p-4 shadow-lg border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 z-50">
      <button
        onClick={() => setVisible(false)}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        aria-label="关闭"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-3xl">🎉</div>
        <div className="font-bold">发布成功!</div>
      </div>
      <div className="text-sm text-muted-foreground mb-3">
        加急置顶 <span className="text-amber-700 font-semibold">9.9 元/天</span>,
        让您的帖子排在最前面, 曝光提升 5x
      </div>
      <Button
        size="sm"
        className="w-full bg-gradient-to-r from-amber-500 to-orange-600"
        disabled={boosting}
        onClick={async () => {
          setBoosting(true);
          try {
            const r = await fetch(`/api/v1/posts/${postId}/boost`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ days: 1, paymentToken: 'stub' }),
              credentials: 'include',
            });
            if (r.status === 503) {
              alert('加急置顶功能即将上线, 请期待 Phase 1.5 商业化模块');
            } else {
              alert('加急置顶成功!');
            }
          } catch (e) {
            alert('调用失败, 请重试');
          } finally {
            setBoosting(false);
            setVisible(false);
          }
        }}
      >
        立即置顶 <ArrowRight className="ml-1 h-3 w-3" />
      </Button>
      {qualityScore !== undefined && (
        <div className="text-xs text-muted-foreground mt-2 text-center">
          AI 质量分: {qualityScore} (≥ 50 可置顶)
        </div>
      )}
    </Card>
  );
}