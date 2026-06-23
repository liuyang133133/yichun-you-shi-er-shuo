'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api';
import { clearAuth, getStoredUser, type AuthUser } from '@/lib/auth';
import { LogOut, Plus, ChevronDown, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  // 用 useSearchParams 代替 typeof window 检查 — 否则 SSR 时 active=false,
  // 客户端渲染时 active=true, 触发 hydration mismatch 警告
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickQ, setQuickQ] = useState('');

  useEffect(() => {
    setUser(getStoredUser());
    setMenuOpen(false);
  }, [pathname]);

  function submitQuickSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = quickQ.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setQuickQ('');
  }

  async function handleLogout() {
    try { await authApi.logout(); } catch {}
    clearAuth();
    setUser(null);
    setMenuOpen(false);
    router.push('/');
  }

  const navItems = [
    { type: 'house', label: '房屋出租' },
    { type: 'secondhand', label: '二手交易' },
    { type: 'job', label: '招聘求职' },
    { type: 'lifebiz', label: '便民信息' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary via-emerald-600 to-teal-700 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
            {/* 树木 SVG */}
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
              <path d="M12 2L8 8h3v3H6l4 5h4v6h-2v-6H8l4-5H7V8h2L12 2z" opacity="0.95" />
              <circle cx="12" cy="5" r="1.2" />
            </svg>
            <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-orange-500 border-2 border-background" />
          </div>
          <div>
            <div className="text-base font-bold leading-tight tracking-tight">
              伊春<span className="text-primary">有事儿说</span>
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight font-medium tracking-wide">
              小兴安岭 · 本地生活
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {navItems.map((it) => {
            const active = pathname === '/' && searchParams.get('type') === it.type;
            return (
              <Link
                key={it.type}
                href={`/?type=${it.type}`}
                className={`relative px-3.5 py-1.5 rounded-full font-medium transition-colors ${
                  active
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* 搜索框 */}
          <form onSubmit={submitQuickSearch} className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-full bg-secondary/60 hover:bg-secondary transition-colors w-44 lg:w-64 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/30">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              value={quickQ}
              onChange={(e) => setQuickQ(e.target.value)}
              placeholder="搜索信息 / 服务 / 商家…"
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/70 outline-none min-w-0"
            />
          </form>

          {/* 移动端搜索图标 */}
          <Link
            href="/search"
            className="md:hidden h-9 w-9 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center"
            aria-label="搜索"
          >
            <Search className="h-4 w-4" />
          </Link>

          {/* SHOULD-23: 暗色模式切换 */}
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/posts/publish">
                <Button size="sm" className="hidden sm:inline-flex rounded-full shadow-md hover:shadow-lg transition-shadow">
                  <Plus className="mr-1 h-4 w-4" />
                  发布信息
                </Button>
              </Link>
              {/* 用户菜单 */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-secondary/60 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                    {user.nickname?.[0] || user.phone[0] || 'U'}
                  </div>
                  <span className="hidden md:inline text-sm font-medium max-w-[100px] truncate">
                    {user.nickname || user.phone}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-popover shadow-lg p-1 z-50 animate-fade-in">
                      <Link href="/me" className="block px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors">
                        👤 我的资料
                      </Link>
                      <Link href="/me/posts" className="block px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors">
                        📝 我的发布
                      </Link>
                      <Link href="/me/favorites" className="block px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors">
                        ❤️ 我的收藏
                      </Link>
                      <div className="my-1 border-t" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors text-destructive flex items-center"
                      >
                        <LogOut className="mr-2 h-3.5 w-3.5" /> 退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="rounded-full">
                  登录
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="rounded-full shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-primary to-emerald-600">
                  免费注册
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
