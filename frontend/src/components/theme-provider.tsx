'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * SHOULD-23: 暗色模式 Provider
 *
 * - attribute="class": 切到 .dark 类（与 tailwind.config.ts darkMode: ['class'] 匹配）
 * - defaultTheme="system": 跟随系统首选项
 * - enableSystem: 允许系统模式
 * - disableTransitionOnChange: 切主题时禁用过渡动画（避免闪烁）
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
