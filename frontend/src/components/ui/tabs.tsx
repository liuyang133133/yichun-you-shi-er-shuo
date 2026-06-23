'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  /** 当前选中值 */
  value?: T;
  defaultValue?: T;
  /** 切换时回调 */
  onChange?: (value: T) => void;
  /** Tab 项 */
  items: TabItem<T>[];
  /** 视觉风格 */
  variant?: 'pill' | 'underline' | 'segmented';
  /** Tab 大小 */
  size?: 'sm' | 'md';
  /** 是否可横向滚动（移动端） */
  scrollable?: boolean;
  className?: string;
}

/**
 * Tabs — 统一标签切换
 *
 * variant:
 * - pill: 圆角胶囊（默认，匹配首页筛选条）
 * - underline: 下划线（详情页/管理后台用）
 * - segmented: 分段控制（移动端偏好）
 *
 * 用法：
 * const [type, setType] = useState<'all'|'passed'>('all')
 * <Tabs value={type} onChange={setType} items={[
 *   { value: 'all', label: '全部', badge: 27 },
 *   { value: 'passed', label: '已通过' },
 * ]} />
 */
export function Tabs<T extends string = string>({
  value,
  defaultValue,
  onChange,
  items,
  variant = 'pill',
  size = 'md',
  scrollable,
  className,
}: TabsProps<T>) {
  const [internal, setInternal] = React.useState<T>(defaultValue ?? items[0]?.value as T);
  const current = value ?? internal;

  function commit(v: T) {
    if (value === undefined) setInternal(v);
    onChange?.(v);
  }

  const containerStyles = cn(
    'flex items-center gap-1.5',
    scrollable && 'overflow-x-auto pb-1 -mx-1 px-1',
    className,
  );

  const itemStyles = (active: boolean, disabled?: boolean) => {
    const sizeCls = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm';
    if (variant === 'pill') {
      return cn(
        sizeCls,
        'rounded-full font-medium whitespace-nowrap transition-all',
        active
          ? 'bg-foreground text-background shadow-md'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        disabled && 'opacity-50 cursor-not-allowed',
      );
    }
    if (variant === 'underline') {
      return cn(
        sizeCls,
        'border-b-2 font-medium whitespace-nowrap transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
        disabled && 'opacity-50 cursor-not-allowed',
      );
    }
    // segmented
    return cn(
      sizeCls,
      'font-medium whitespace-nowrap transition-colors',
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
      disabled && 'opacity-50 cursor-not-allowed',
    );
  };

  return (
    <div
      role="tablist"
      className={cn(containerStyles, variant === 'segmented' && 'inline-flex p-1 bg-secondary rounded-lg')}
    >
      {items.map((it) => {
        const active = it.value === current;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-disabled={it.disabled}
            disabled={it.disabled}
            onClick={() => !it.disabled && commit(it.value)}
            className={cn(
              'inline-flex items-center gap-1.5',
              itemStyles(active, it.disabled),
            )}
          >
            {it.icon}
            <span>{it.label}</span>
            {it.badge != null && (
              <span
                className={cn(
                  'ml-1 px-1.5 py-0.5 text-[10px] rounded-full font-bold',
                  active ? 'bg-white/20' : 'bg-background text-muted-foreground',
                )}
              >
                {it.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}