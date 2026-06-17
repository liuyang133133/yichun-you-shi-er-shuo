'use client';

import { Badge } from '@/components/ui/badge';
import { ExtractChip } from '@/lib/api-ai';
import { Check, AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

function confidenceColor(c: number): string {
  if (c >= 0.85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (c >= 0.6) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

function confidenceIcon(c: number) {
  if (c >= 0.85) return <Check className="h-3 w-3" />;
  if (c >= 0.6) return <AlertTriangle className="h-3 w-3" />;
  return <X className="h-3 w-3" />;
}

interface Props {
  chips: ExtractChip[];
  missingFields?: string[];
}

const MISSING_LABELS: Record<string, string> = {
  title: '标题',
  areaName: '小区',
  layout: '户型',
  floor: '楼层',
  price: '价格',
  areaSize: '面积',
};

export function ExtractChips({ chips, missingFields = [] }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip, i) => (
        <Badge
          key={`${chip.label}-${i}`}
          variant="outline"
          className={clsx('px-2.5 py-1 text-xs flex items-center gap-1.5', confidenceColor(chip.confidence))}
        >
          {confidenceIcon(chip.confidence)}
          <span className="font-medium">{chip.label}：</span>
          <span>{chip.value}</span>
        </Badge>
      ))}
      {missingFields.map((f) => (
        <Badge
          key={`missing-${f}`}
          variant="outline"
          className="px-2.5 py-1 text-xs flex items-center gap-1.5 bg-slate-50 text-slate-500 border-slate-200 border-dashed"
        >
          <X className="h-3 w-3" />
          <span>{MISSING_LABELS[f] || f}：未识别</span>
        </Badge>
      ))}
    </div>
  );
}
