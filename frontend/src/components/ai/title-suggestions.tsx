'use client';

import { useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/button';

interface Props {
  titles: string[];
  initialIndex?: number;
  onSelect: (title: string) => void;
}

export function TitleSuggestions({ titles, initialIndex = 0, onSelect }: Props) {
  const [selected, setSelected] = useState(initialIndex);
  if (!titles || titles.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <span>建议标题（点选一个）</span>
      </div>
      <div className="space-y-1.5">
        {titles.map((t, i) => (
          <button
            key={i}
            onClick={() => {
              setSelected(i);
              onSelect(t);
            }}
            className={clsx(
              'w-full text-left px-3 py-2 rounded-md text-sm border transition-colors',
              selected === i
                ? 'border-primary bg-primary/5 text-foreground font-medium'
                : 'border-border hover:border-primary/30 hover:bg-secondary/50 text-muted-foreground',
            )}
          >
            <div className="flex items-center gap-2">
              {selected === i ? (
                <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              ) : (
                <span className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span className="truncate">{t}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SkipAiButton({ onSkip }: { onSkip: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
      跳过 AI，手动填写
    </Button>
  );
}
