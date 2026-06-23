'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** 主操作按钮 */
  confirm?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive';
    loading?: boolean;
  };
  /** 取消按钮 */
  cancel?: {
    label: string;
    onClick?: () => void;
  };
  children?: React.ReactNode;
  className?: string;
  /** 是否点击遮罩关闭 */
  closeOnOverlay?: boolean;
}

/**
 * Dialog — 模态对话框
 *
 * 用法：
 * <Dialog
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   title="确认删除？"
 *   description="删除后无法恢复"
 *   confirm={{ label: '删除', onClick: handleDelete, variant: 'destructive' }}
 * />
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  confirm,
  cancel,
  children,
  className,
  closeOnOverlay = true,
}: DialogProps) {
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

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 animate-fade-in">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => closeOnOverlay && onClose()}
        aria-hidden
      />
      {/* 卡片 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        className={cn(
          'relative bg-popover text-popover-foreground rounded-2xl border shadow-elevated',
          'w-full max-w-md p-6 animate-slide-up',
          className,
        )}
      >
        {title && (
          <h2 id="dialog-title" className="font-display text-lg font-bold mb-2 pr-6">
            {title}
          </h2>
        )}
        {description && (
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        )}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center transition-colors"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>

        {children}

        {(confirm || cancel) && (
          <div className="flex gap-2 justify-end mt-6">
            {cancel && (
              <button
                type="button"
                onClick={() => (cancel.onClick ? cancel.onClick() : onClose())}
                className="h-9 px-4 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                {cancel.label}
              </button>
            )}
            {confirm && (
              <button
                type="button"
                onClick={confirm.onClick}
                disabled={confirm.loading}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-medium transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  confirm.variant === 'destructive'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
              >
                {confirm.loading ? '处理中…' : confirm.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}