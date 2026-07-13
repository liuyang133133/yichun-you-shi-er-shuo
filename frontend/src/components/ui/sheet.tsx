'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** 桌面侧:right(默认) | left;移动端:bottom */
  side?: 'right' | 'left' | 'bottom';
  /** 自定义内容 class */
  contentClassName?: string;
  children?: React.ReactNode;
  /** 底部固定区(按钮等) */
  footer?: React.ReactNode;
  /** 是否点击遮罩关闭 */
  closeOnOverlay?: boolean;
}

/**
 * Sheet — 抽屉
 *
 * 桌面 (md+): side='right' 从右滑入,480px 宽
 * 移动端 (<md): 从底部滑入,占满宽度
 *
 * 沿用现有 Dialog 风格: 自研 + tailwind,0 新依赖
 */
export function Sheet({
  open,
  onClose,
  title,
  side = 'right',
  contentClassName,
  children,
  footer,
  closeOnOverlay = true,
}: SheetProps) {
  // Esc 关闭
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // body scroll lock
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  // 桌面 right / left;移动端 always bottom
  const slideClass =
    side === 'left'
      ? 'inset-y-0 left-0 md:max-w-md w-full'
      : side === 'bottom'
        ? 'inset-x-0 bottom-0 max-h-[90vh]'
        : 'inset-y-0 right-0 md:max-w-md w-full';

  return (
    <div className="fixed inset-0 z-[90] animate-fade-in" data-testid="sheet-root">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => closeOnOverlay && onClose()}
        aria-hidden
        data-testid="sheet-overlay"
      />
      {/* 抽屉本体 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'absolute bg-popover text-popover-foreground shadow-elevated flex flex-col',
          'animate-slide-in',
          slideClass,
          contentClassName,
        )}
        data-testid="sheet-content"
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-display text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center transition-colors"
              aria-label="关闭"
              data-testid="sheet-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {footer && (
          <div className="border-t p-4 bg-popover sticky bottom-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
