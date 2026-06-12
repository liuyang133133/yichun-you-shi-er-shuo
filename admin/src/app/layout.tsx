import './globals.css';
import type { Metadata } from 'next';
import { AdminShell } from '@/components/layout/admin-shell';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: '管理后台 - 伊春有事儿说',
  description: '伊春有事儿说管理后台',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-muted text-foreground antialiased">
        <ThemeProvider>
          <AdminShell>{children}</AdminShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
