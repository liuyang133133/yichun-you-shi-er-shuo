'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

/**
 * SHOULD-23: 暗色模式切换按钮
 *
 * 三态循环: light → dark → system → light
 * - light: Sun 图标
 * - dark: Moon 图标
 * - system: Monitor 图标
 *
 * SSR 阶段 mounted=false 只渲染占位，避免 hydration mismatch
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function cycle() {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  }

  // 占位（避免 SSR 闪烁）
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="切换主题"
        className="h-9 w-9 rounded-full hover:bg-secondary/60 transition-colors flex items-center justify-center"
      >
        <span className="h-4 w-4" />
      </button>
    );
  }

  const current = theme === 'system' ? 'system' : resolvedTheme;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`切换主题（当前: ${current}）`}
      title={`切换主题（当前: ${current}，点击切换 light/dark/system）`}
      className="h-9 w-9 rounded-full hover:bg-secondary/60 active:bg-secondary transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
    >
      {current === 'dark' ? (
        <Moon className="h-4 w-4" />
      ) : current === 'light' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Monitor className="h-4 w-4" />
      )}
    </button>
  );
}
