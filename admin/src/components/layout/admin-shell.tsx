'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FileText, Users, Flag, Building2, LogOut, MessageSquare, Image as ImageIcon, Shield, KeyRound, UserCog, ClipboardList, ScrollText } from 'lucide-react';
import { getUser, clearAuth, getToken, apiFetch } from '@/lib/api';
import { clsx } from 'clsx';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV = [
  { href: '/dashboard', label: '看板', icon: LayoutDashboard },
  { href: '/posts', label: '信息审核', icon: FileText },
  { href: '/users', label: '用户管理', icon: Users },
  { href: '/reports', label: '举报处理', icon: Flag },
  { href: '/companies', label: '公司管理', icon: Building2 },
  { href: '/banners', label: 'Banner 运营', icon: ImageIcon },
];

// T-004 + T-005: 系统管理子菜单
const SYSTEM_NAV = [
  { href: '/roles', label: '角色管理', icon: Shield },
  { href: '/permissions', label: '权限管理', icon: KeyRound },
  { href: '/admin-users', label: '管理员列表', icon: UserCog },
  { href: '/audit-logs', label: '操作日志', icon: ClipboardList },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [user, setUserState] = useState<{ phone: string; role: string } | null>(null);

  useEffect(() => {
    if (!getToken() || !getUser()) {
      const next = encodeURIComponent(pathname || '/dashboard');
      router.replace(`/login?expired=1&next=${next}`);
      return;
    }
    const u = getUser()!;
    if (u.role !== 'admin') {
      clearAuth();
      const next = encodeURIComponent(pathname || '/dashboard');
      router.replace(`/login?expired=1&next=${next}`);
      return;
    }
    setUserState(u);
    setReady(true);
  }, [router, pathname]);

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
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
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

          {/* T-004: 系统管理 分组 */}
          <div className="pt-3 pb-1.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
            系统管理
          </div>
          {SYSTEM_NAV.map((item) => {
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
        <div className="p-3 border-t space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate">已登录：{user.phone}</span>
            {/* SHOULD-23: 暗色模式切换 */}
            <ThemeToggle />
          </div>
          <button
            onClick={async () => {
              // [P1-002] 先调后端 logout 把 token 加入黑名单，再清本地
              try {
                await apiFetch('/auth/logout', { method: 'POST' });
              } catch {
                // 失败也继续清本地（不影响 UX）
              }
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
