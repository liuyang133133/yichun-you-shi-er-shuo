'use client';
import { Badge } from '@/components/ui/badge';

interface Props {
  score: number;  // 0-100
  loading?: boolean;
}

export function QualityBadge({ score, loading }: Props) {
  if (loading) {
    return <Badge variant="outline" className="animate-pulse">AI 评估中...</Badge>;
  }
  const variant = score >= 75 ? 'default' : score >= 50 ? 'secondary' : 'destructive';
  const label = score >= 75 ? '优秀' : score >= 50 ? '良好' : '需优化';
  return (
    <Badge variant={variant} className="text-xs">
      AI 评估: {score} 分 · {label}
    </Badge>
  );
}