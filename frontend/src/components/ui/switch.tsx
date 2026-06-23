'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: React.ReactNode;
  description?: React.ReactNode;
  id?: string;
  className?: string;
}

/**
 * Switch — 滑动开关
 *
 * 用法：
 * <Switch checked={enabled} onChange={setEnabled} label="启用" />
 */
export function Switch({
  checked,
  onChange,
  disabled,
  size = 'md',
  label,
  description,
  id,
  className,
}: SwitchProps) {
  const reactId = React.useId();
  const inputId = id || reactId;

  const trackSize = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9';
  const thumbSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const thumbTranslate = size === 'sm' ? 'translate-x-3' : 'translate-x-4';

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'inline-flex items-center gap-2.5 cursor-pointer select-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <span className="relative inline-flex items-center">
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            trackSize,
            'rounded-full transition-colors duration-200',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
            checked ? 'bg-primary' : 'bg-input',
          )}
          aria-hidden
        >
          <span
            className={cn(
              thumbSize,
              'absolute top-0.5 left-0.5 rounded-full bg-background shadow-sm transition-transform duration-200',
              checked && thumbTranslate,
            )}
          />
        </span>
      </span>
      {(label || description) && (
        <span className="flex-1 min-w-0">
          {label && <span className="text-sm leading-snug block">{label}</span>}
          {description && (
            <span className="text-xs text-muted-foreground leading-snug block mt-0.5">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
}