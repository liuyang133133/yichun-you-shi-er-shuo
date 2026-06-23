'use client';

import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps {
  checked: boolean | 'indeterminate';
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  id?: string;
  className?: string;
  required?: boolean;
}

/**
 * Checkbox — 复选框（替换 input type=checkbox）
 *
 * 用法：
 * <Checkbox
 *   checked={agreed}
 *   onChange={setAgreed}
 *   label="我已阅读并同意《用户协议》"
 * />
 */
export function Checkbox({
  checked,
  onChange,
  disabled,
  label,
  description,
  id,
  className,
  required,
}: CheckboxProps) {
  const isChecked = checked === true;
  const isIndeterminate = checked === 'indeterminate';
  const reactId = React.useId();
  const inputId = id || reactId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex items-start gap-2.5 cursor-pointer select-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <span className="relative inline-flex items-center justify-center mt-0.5">
        <input
          id={inputId}
          type="checkbox"
          checked={isChecked}
          disabled={disabled}
          required={required}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            'h-4 w-4 rounded border-2 transition-all flex items-center justify-center',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
            isChecked || isIndeterminate
              ? 'bg-primary border-primary'
              : 'bg-background border-input hover:border-primary/50',
          )}
          aria-hidden
        >
          {isChecked && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
          {isIndeterminate && <Minus className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
        </span>
      </span>
      {(label || description) && (
        <span className="flex-1 min-w-0">
          {label && (
            <span className="text-sm leading-snug block">
              {label}
              {required && <span className="text-destructive ml-0.5">*</span>}
            </span>
          )}
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