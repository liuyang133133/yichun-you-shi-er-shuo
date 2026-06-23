'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';
type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
};

interface ToastContextValue {
  show: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

/** 顶层 API — 在任意处调用 */
export const toast = {
  success: (description: string, title?: string) =>
    showToast({ variant: 'success', description, title }),
  error: (description: string, title?: string) =>
    showToast({ variant: 'error', description, title, duration: 6000 }),
  warning: (description: string, title?: string) =>
    showToast({ variant: 'warning', description, title }),
  info: (description: string, title?: string) =>
    showToast({ variant: 'info', description, title }),
};

// 模块级订阅器列表 — 多个 Toaster 实例可并存
type Listener = (toasts: Toast[]) => void;
const listeners = new Set<Listener>();
let toasts: Toast[] = [];

function showToast(t: Omit<Toast, 'id'>): string {
  const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  toasts = [...toasts, { id, ...t }];
  listeners.forEach((l) => l(toasts));
  if (t.duration !== 0) {
    setTimeout(() => dismissToast(id), t.duration ?? 4000);
  }
  return id;
}

function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  listeners.forEach((l) => l(toasts));
}

const VARIANT_META: Record<ToastVariant, { icon: typeof CheckCircle2; tone: string }> = {
  success: { icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
  error:   { icon: XCircle,      tone: 'text-red-600 bg-red-50 dark:bg-red-950/40' },
  warning: { icon: AlertTriangle, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
  info:    { icon: Info,         tone: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
};

/** 挂载到 RootLayout 的 Toaster */
export function Toaster() {
  const [items, setItems] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    const listener: Listener = (next) => setItems(next);
    listeners.add(listener);
    setItems(toasts); // 同步初始值
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none"
    >
      {items.map((t) => {
        const meta = VARIANT_META[t.variant];
        const Icon = meta.icon;
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border bg-popover p-3 pr-2 shadow-elevated',
              'animate-slide-in-right min-w-[280px]',
            )}
          >
            <div className={cn('flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center', meta.tone)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              {t.title && <div className="font-semibold text-sm">{t.title}</div>}
              <div className="text-sm text-muted-foreground break-words">{t.description}</div>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="flex-shrink-0 h-7 w-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center transition-colors"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}