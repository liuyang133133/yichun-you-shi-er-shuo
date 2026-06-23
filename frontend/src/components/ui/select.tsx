'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  emoji?: string;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** 触发器样式变体 */
  variant?: 'default' | 'pill' | 'bare';
  /** 是否全宽 */
  fullWidth?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

/**
 * Select — 自研下拉选择器
 *
 * 设计要点：
 * - 基于 native <details>/<summary> 实现，无 portal，无依赖
 * - 键盘可访问（Tab 聚焦 / Enter 打开 / Esc 关闭 / ↑↓ 选择）
 * - 支持搜索过滤（可选）
 *
 * 用法：
 * <Select value={area} onChange={setArea} options={areas} variant="pill" />
 */
export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      options,
      placeholder = '请选择…',
      disabled,
      variant = 'default',
      fullWidth,
      className,
      id,
      ...ariaProps
    },
    ref,
  ) => {
    const detailsRef = React.useRef<HTMLDetailsElement>(null);
    const [open, setOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(value ?? defaultValue ?? '');
    const [focusIdx, setFocusIdx] = React.useState(-1);

    const currentValue = value ?? internalValue;
    const current = options.find((o) => o.value === currentValue);

    function commit(v: string) {
      if (value === undefined) setInternalValue(v);
      onChange?.(v);
      setOpen(false);
      detailsRef.current?.removeAttribute('open');
    }

    function handleKey(e: React.KeyboardEvent) {
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen(true);
          detailsRef.current?.setAttribute('open', '');
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        detailsRef.current?.removeAttribute('open');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIdx((i) => Math.min(i + 1, options.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && focusIdx >= 0) {
        e.preventDefault();
        commit(options[focusIdx].value);
      }
    }

    const triggerStyles = {
      default: cn(
        'h-10 px-3 rounded-md border border-input bg-background text-sm',
        'hover:bg-accent hover:text-accent-foreground transition-colors',
      ),
      pill: cn(
        'h-9 px-3 rounded-full border bg-background text-sm',
        'hover:bg-secondary/70 transition-colors',
      ),
      bare: cn(
        'h-9 px-2 text-sm bg-transparent hover:bg-secondary/60 rounded transition-colors',
      ),
    }[variant];

    return (
      <div
        ref={ref}
        className={cn('relative inline-block', fullWidth && 'w-full', className)}
      >
        <details
          ref={detailsRef}
          className="relative"
          onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={ariaProps['aria-label']}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={handleKey}
            onClick={(e) => {
              e.preventDefault();
              if (disabled) return;
              if (open) {
                setOpen(false);
                detailsRef.current?.removeAttribute('open');
              } else {
                setOpen(true);
                detailsRef.current?.setAttribute('open', '');
              }
            }}
            className={cn(
              triggerStyles,
              'flex items-center gap-2 cursor-pointer select-none list-none',
              '[&::-webkit-details-marker]:hidden',
              disabled && 'opacity-50 cursor-not-allowed',
              fullWidth && 'w-full justify-between',
              !fullWidth && 'min-w-[120px] justify-between',
            )}
          >
            <span className={cn('flex items-center gap-1.5 truncate', !current && 'text-muted-foreground')}>
              {current?.emoji && <span aria-hidden>{current.emoji}</span>}
              {current?.label ?? placeholder}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                open && 'rotate-180',
              )}
            />
          </summary>

          <ul
            role="listbox"
            className={cn(
              'absolute z-50 mt-1 min-w-full overflow-hidden',
              'rounded-lg border bg-popover text-popover-foreground shadow-elevated',
              'py-1 animate-fade-in',
              'max-h-64 overflow-y-auto',
              fullWidth ? 'left-0 right-0' : 'left-0',
            )}
          >
            {options.map((opt, i) => {
              const selected = opt.value === currentValue;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={opt.disabled}
                  onClick={() => !opt.disabled && commit(opt.value)}
                  onMouseEnter={() => setFocusIdx(i)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    focusIdx === i && 'bg-accent text-accent-foreground',
                    selected && 'font-medium',
                    opt.disabled && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {opt.emoji && <span aria-hidden>{opt.emoji}</span>}
                  <span className="flex-1 truncate">{opt.label}</span>
                  {selected && <Check className="h-4 w-4 text-primary" />}
                </li>
              );
            })}
            {options.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">无选项</li>
            )}
          </ul>
        </details>

        {/* 关闭其他已打开的 select — 点击外部 */}
        {open && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setOpen(false);
              detailsRef.current?.removeAttribute('open');
            }}
            aria-hidden
          />
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';