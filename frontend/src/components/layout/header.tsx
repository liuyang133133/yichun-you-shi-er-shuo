'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/patterns/avatar';
import { authApi, meApi } from '@/lib/api';
import { clearAuth, getStoredUser, getAccessToken, setStoredUser, AUTH_USER_CHANGED_EVENT, type AuthUser } from '@/lib/auth';
import {
  LogOut, Plus, ChevronDown, Search, Menu, X, Home, FileText, Heart, MessageCircle, Bell,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from './notification-bell';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickQ, setQuickQ] = useState('');

  useEffect(() => {
    setUser(getStoredUser());
    setMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // 监听"用户信息变更"事件 — 改头像/昵称后 Header 立即同步刷新
  // (否则需要切页面才更新,体验割裂)
  useEffect(() => {
    function refreshFromStorage() {
      setUser(getStoredUser());
    }
    window.addEventListener(AUTH_USER_CHANGED_EVENT, refreshFromStorage);
    return () => window.removeEventListener(AUTH_USER_CHANGED_EVENT, refreshFromStorage);
  }, []);

  // [T-024 2026-07-15] 路由切换/挂载时拉一次 /auth/me 把头像拉回 localStorage
  // 之前 header 只读 localStorage, 但 login 响应里只有 phone, ls 里 avatar 永远是 undefined
  // → Avatar 组件永远走 fallback 渐变色圆 + 首字母
  // 修复: 拿到 token 后调 meApi.detail, 把 nickname/avatar 写到 ls 触发 AUTH_USER_CHANGED_EVENT,
  // 上面的 listener 自动 setUser 拿到完整 user
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let cancelled = false;
    meApi.detail()
      .then((me) => {
        if (cancelled) return;
        const existing = getStoredUser();
        // 只有真有 avatar/nickname 时才覆写, 避免把已有头像覆盖成 null
        if (me?.avatar || me?.nickname) {
          setStoredUser({
            ...existing,
            id: String(me.sub ?? existing?.id ?? me.phone),
            phone: me.phone ?? existing?.phone,
            nickname: me.nickname ?? existing?.nickname,
            avatar: me.avatar ?? existing?.avatar ?? null,
          });
        }
      })
      .catch(() => {/* 401 忽略, Header 已能从现有 ls 渲染 */});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setMobileMenuOpen(false);
    router.push('/');
  }

  const navItems = [
    { type: 'house', label: '房屋租售', emoji: '🏠' },
    { type: 'secondhand', label: '二手交易', emoji: '🛍️' },
    { type: 'job', label: '招聘求职', emoji: '💼' },
    { type: 'lifebiz', label: '便民信息', emoji: '📌' },
  ];

  const currentType = searchParams.get('type');

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-16 items-center justify-between gap-2">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary via-emerald-600 to-teal-700 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
                <path d="M12 2L8 8h3v3H6l4 5h4v6h-2v-6H8l4-5H7V8h2L12 2z" opacity="0.95" />
                <circle cx="12" cy="5" r="1.2" />
              </svg>
              <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-orange-500 border-2 border-background" />
            </div>
            <div className="hidden sm:block">
              <div className="text-base font-bold leading-tight tracking-tight whitespace-nowrap">
                伊春<span className="text-primary">有事儿说</span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight font-medium tracking-wide">
                小兴安岭 · 本地生活
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {navItems.map((it) => {
              const active = pathname === '/' && currentType === it.type;
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
          <div className="flex items-center gap-1.5">
            {/* Desktop 搜索框 */}
            <form
              onSubmit={submitQuickSearch}
              className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-full bg-secondary/60 hover:bg-secondary transition-colors w-44 lg:w-64 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/30"
            >
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
              className="md:hidden h-9 w-9 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-colors"
              aria-label="搜索"
            >
              <Search className="h-4 w-4" />
            </Link>

            <ThemeToggle />

            {user ? (
              <>
                <Link href="/posts/publish" className="hidden sm:inline-flex">
                  <Button
                    size="sm"
                    className="rounded-full shadow-md hover:shadow-lg transition-shadow"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    <span className="hidden lg:inline">发布信息</span>
                  </Button>
                </Link>

                {/* T-008: 通知铃铛（仅登录用户） */}
                <NotificationBell />

                {/* 用户菜单 (desktop) */}
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-secondary/60 transition-colors"
                  >
                    <Avatar
                      src={user.avatar}
                      name={user.nickname || user.phone}
                      fallback={user.phone?.[0] || 'U'}
                      size="sm"
                      className="ring-1 ring-border"
                    />
                    <span className="hidden lg:inline text-sm font-medium max-w-[100px] truncate">
                      {user.nickname || user.phone}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  {menuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-popover shadow-lg p-1 z-50 animate-fade-in">
                        <UserDropdown onClose={() => setMenuOpen(false)} onLogout={handleLogout} />
                      </div>
                    </>
                  )}
                </div>

                {/* 移动端汉堡菜单 */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden h-9 w-9 rounded-full hover:bg-secondary/60 flex items-center justify-center transition-colors"
                  aria-label="菜单"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="rounded-full">
                    登录
                  </Button>
                </Link>
                <Link href="/login" className="hidden xs:inline-flex">
                  <Button
                    size="sm"
                    className="rounded-full shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-primary to-emerald-600"
                  >
                    免费注册
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-background border-l shadow-elevated animate-slide-in-right overflow-y-auto">
            <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
              {user ? (
                <div className="flex items-center gap-2.5">
                  <Avatar
                    src={user.avatar}
                    name={user.nickname || user.phone}
                    fallback={user.phone?.[0] || 'U'}
                    size="md"
                  />
                  <div>
                    <div className="font-bold text-sm">
                      {user.nickname || `用户 ${user.phone.slice(-4)}`}
                    </div>
                    <div className="text-xs text-muted-foreground">{user.phone}</div>
                  </div>
                </div>
              ) : (
                <div className="font-bold">伊春有事儿说</div>
              )}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="h-8 w-8 rounded-md hover:bg-secondary flex items-center justify-center"
                aria-label="关闭菜单"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-1">
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">浏览分类</div>
              {navItems.map((it) => {
                const active = pathname === '/' && currentType === it.type;
                return (
                  <Link
                    key={it.type}
                    href={`/?type=${it.type}`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    <span className="text-lg">{it.emoji}</span>
                    {it.label}
                  </Link>
                );
              })}
            </div>

            {user && (
              <div className="p-4 border-t space-y-1">
                <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">我的</div>
                <Link
                  href="/posts/publish"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary text-sm font-medium"
                >
                  <Plus className="h-4 w-4 text-primary" />
                  发布新信息
                </Link>
                <Link
                  href="/me"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary text-sm font-medium"
                >
                  <Home className="h-4 w-4" />
                  个人中心
                </Link>
                <Link
                  href="/me/posts"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary text-sm font-medium"
                >
                  <FileText className="h-4 w-4" />
                  我的发布
                </Link>
                <Link
                  href="/me/favorites"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary text-sm font-medium"
                >
                  <Heart className="h-4 w-4" />
                  我的收藏
                </Link>
                <Link
                  href="/me/messages"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary text-sm font-medium"
                >
                  <MessageCircle className="h-4 w-4" />
                  站内信
                </Link>
                <Link
                  href="/me/notifications"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary text-sm font-medium"
                >
                  <Bell className="h-4 w-4" />
                  通知中心
                </Link>
                <div className="pt-2 mt-2 border-t">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-sm font-medium text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </button>
                </div>
              </div>
            )}

            {!user && (
              <div className="p-4 border-t space-y-2">
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full rounded-full">
                    登录
                  </Button>
                </Link>
                <Link href="/login" className="block">
                  <Button className="w-full rounded-full bg-gradient-to-r from-primary to-emerald-600">
                    免费注册
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** 用户下拉菜单（desktop） */
function UserDropdown({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) {
  return (
    <>
      <Link
        href="/me"
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors"
      >
        <Home className="h-4 w-4 text-muted-foreground" />
        我的资料
      </Link>
      <Link
        href="/me/posts"
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors"
      >
        <FileText className="h-4 w-4 text-muted-foreground" />
        我的发布
      </Link>
      <Link
        href="/me/favorites"
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors"
      >
        <Heart className="h-4 w-4 text-muted-foreground" />
        我的收藏
      </Link>
      <Link
        href="/me/messages"
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors"
      >
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        站内信
      </Link>
      <Link
        href="/me/notifications"
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        通知中心
      </Link>
      <div className="my-1 border-t" />
      <button
        onClick={onLogout}
        className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors text-destructive"
      >
        <LogOut className="h-4 w-4" /> 退出登录
      </button>
    </>
  );
}