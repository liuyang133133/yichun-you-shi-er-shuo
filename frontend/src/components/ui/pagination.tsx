'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  page: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
  /** 显示页码数量（含省略号） */
  windowSize?: number;
  className?: string;
}

/**
 * Pagination — 分页
 *
 * 替换 posts/page.tsx 手写分页
 * 用法：
 * <Pagination page={page} total={total} pageSize={20} onChange={setPage} />
 */
export function Pagination({
  page,
  total,
  pageSize = 20,
  onChange,
  windowSize = 5,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  // 算页码窗口
  function pageItems(): (number | '…')[] {
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + windowSize - 1);
    if (end - start + 1 < windowSize) {
      start = Math.max(1, end - windowSize + 1);
    }
    const items: (number | '…')[] = [];
    if (start > 1) {
      items.push(1);
      if (start > 2) items.push('…');
    }
    for (let i = start; i <= end; i++) items.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) items.push('…');
      items.push(totalPages);
    }
    return items;
  }

  function btn(active?: boolean, disabled?: boolean) {
    return cn(
      'h-9 min-w-9 px-2.5 inline-flex items-center justify-center rounded-md text-sm transition-colors',
      active
        ? 'bg-primary text-primary-foreground shadow-sm font-medium'
        : 'bg-card border border-input text-foreground hover:bg-secondary',
      disabled && 'opacity-40 cursor-not-allowed',
    );
  }

  return (
    <nav className={cn('flex items-center justify-center gap-1', className)} aria-label="分页">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(1)}
        className={btn(false, page <= 1)}
        aria-label="首页"
      >
        <ChevronsLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={btn(false, page <= 1)}
        aria-label="上一页"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pageItems().map((it, i) =>
        it === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground text-sm">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => onChange(it)}
            className={btn(it === page)}
            aria-current={it === page ? 'page' : undefined}
          >
            {it}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className={btn(false, page >= totalPages)}
        aria-label="下一页"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(totalPages)}
        className={btn(false, page >= totalPages)}
        aria-label="末页"
      >
        <ChevronsRight className="h-4 w-4" />
      </button>
    </nav>
  );
}