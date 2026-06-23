'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  /** 大 emoji 或 icon (默认 📭) */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** 主 CTA */
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** 次要 CTA */
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

/**
 * EmptyState — 统一空状态展示
 *
 * 用法：
 * <EmptyState
 *   title="还没有发布过信息"
 *   description="发布第一条信息，让本地人看到你"
 *   action={{ label: '立即发布', href: '/posts/publish' }}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-4 rounded-2xl border-2 border-dashed bg-muted/30',
        className,
      )}
    >
      <div className="mb-4 text-muted-foreground/60">
        {icon ?? <Inbox className="h-16 w-16" strokeWidth={1.2} />}
      </div>
      <h3 className="font-display text-lg font-bold mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-5">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap gap-2 justify-center">
          {action &&
            (action.href ? (
              <Link
                href={action.href}
                className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-md hover:shadow-hover"
              >
                {action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-md hover:shadow-hover"
              >
                {action.label}
              </button>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                {secondaryAction.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton — 加载占位
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

/**
 * PostCardSkeleton — 帖子卡片骨架
 */
export function PostCardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card overflow-hidden">
          <Skeleton className="aspect-[16/9]" />
          <div className="p-4 space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="flex items-center gap-2 pt-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * PageLoading — 整页 spinner
 */
export function PageLoading({ message = '加载中…' }: { message?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="inline-flex flex-col items-center gap-3 text-muted-foreground">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}

/**
 * ErrorState — 错误展示
 */
export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = '加载失败',
  message = '请检查网络后重试',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="text-5xl mb-4">😕</div>
      <h3 className="font-display text-lg font-bold mb-1.5 text-destructive">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-5">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-md"
        >
          重试
        </button>
      )}
    </div>
  );
}