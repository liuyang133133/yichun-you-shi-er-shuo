'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FileText, Users, Flag, Building2, LogOut, MessageSquare } from 'lucide-react';
import { getUser, clearAuth, getToken } from '@/lib/api';
import { clsx } from 'clsx';

const NAV = [
  { href: '/dashboard', label: '看板', icon: LayoutDashboard },
  { href: '/posts', label: '信息审核', icon: FileText },
  { href: '/users', label: '用户管理', icon: Users },
  { href: '/reports', label: '举报处理', icon: Flag },
  { href: '/companies', label: '公司管理', icon: Building2 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [user, setUserState] = useState<{ phone: string; role: string } | null>(null);

  useEffect(() => {
    if (!getToken() || !getUser()) {
      router.replace('/login');
      return;
    }
    const u = getUser()!;
    if (u.role !== 'admin') {
      clearAuth();
      router.replace('/login');
      return;
    }
    setUserState(u);
    setReady(true);
  }, [router]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* 侧边栏 */}
      <aside className="hidden md:flex w-56 flex-col bg-card border-r">
        <div className="h-16 flex items-center px-4 border-b">
          <div className="h-9 w-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold">
            营
          </div>
          <div className="ml-2">
            <div className="text-sm font-semibold">伊春有事儿说</div>
            <div className="text-[10px] text-muted-foreground">管理后台</div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <div className="text-xs text-muted-foreground mb-2">已登录：{user.phone}</div>
          <button
            onClick={() => {
              clearAuth();
              router.replace('/login');
            }}
            className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-2 py-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
