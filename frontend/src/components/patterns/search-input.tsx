'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** 是否显示清空按钮 */
  clearable?: boolean;
  /** pill / square */
  variant?: 'pill' | 'square';
  /** icon position */
  iconPosition?: 'left' | 'right';
  /** 自定义 icon class */
  iconClassName?: string;
}

/**
 * SearchInput — 统一搜索框
 *
 * 替换 3 处重复实现：
 * - Header (透明背景)
 * - 我的收藏
 * - 详情页侧栏
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      clearable = true,
      variant = 'pill',
      iconPosition = 'left',
      iconClassName,
      value,
      onChange,
      ...props
    },
    ref,
  ) => {
    const [internal, setInternal] = React.useState(value ?? '');
    const v = value ?? internal;

    function clear() {
      if (value === undefined) setInternal('');
      onChange?.({ target: { value: '' } } as any);
    }

    const radiusClass = variant === 'pill' ? 'rounded-full' : 'rounded-md';

    return (
      <div className={cn('relative', className)}>
        {iconPosition === 'left' && (
          <Search
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none',
              iconClassName,
            )}
          />
        )}
        <input
          ref={ref}
          type="search"
          value={v as any}
          onChange={(e) => {
            if (value === undefined) setInternal(e.target.value);
            onChange?.(e);
          }}
          className={cn(
            'w-full h-10 text-sm bg-background border border-input',
            'placeholder:text-muted-foreground/70',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            radiusClass,
            iconPosition === 'left' ? 'pl-10 pr-10' : 'pl-3 pr-10',
            'transition-colors',
          )}
          {...props}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {clearable && (v as string) && (
            <button
              type="button"
              onClick={clear}
              className="h-6 w-6 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
              aria-label="清空"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {iconPosition === 'right' && (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    );
  },
);
SearchInput.displayName = 'SearchInput';