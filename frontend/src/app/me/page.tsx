'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { authApi } from '@/lib/api';
import { clearAuth, getAccessToken, getStoredUser, type AuthUser } from '@/lib/auth';
import { LogOut, FileText, Heart, MessageCircle, ChevronRight, Settings, Shield, Bell, BadgeCheck } from 'lucide-react';

const QUICK_LINKS = [
  { href: '/me/posts', icon: FileText, label: '我的发布', desc: '查看 / 管理已发布信息', color: 'text-blue-600 bg-blue-50' },
  { href: '/me/favorites', icon: Heart, label: '我的收藏', desc: '收藏的房屋 / 二手 / 招聘', color: 'text-pink-600 bg-pink-50' },
  { href: '/me/messages', icon: MessageCircle, label: '站内信', desc: '买家 / 卖家 / HR 沟通', color: 'text-emerald-600 bg-emerald-50' },
  { href: '/posts/publish', icon: FileText, label: '发布新信息', desc: '发布到 4 大模块之一', color: 'text-amber-600 bg-amber-50' },
];

const SETTINGS = [
  { icon: Bell, label: '消息通知', desc: '接收新留言 / 系统通知' },
  { icon: Shield, label: '账号安全', desc: '修改密码 / 实名认证' },
  { icon: Settings, label: '隐私设置', desc: '控制谁能看到我的信息' },
];

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [meDetail, setMeDetail] = useState<{ sub: string; phone: string; role: string } | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const u = getStoredUser();
    if (!token || !u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    setReady(true);
    authApi.me()
      .then(setMeDetail)
      .catch(() => {
        clearAuth();
        router.replace('/login');
      });
  }, [router]);

  async function handleLogout() {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.replace('/');
  }

  if (!ready || !user) {
    return (
      <main className="container py-20 text-center text-muted-foreground">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  const initial = (meDetail?.phone || user.phone || 'U')[0];

  return (
    <main className="container max-w-4xl py-8 space-y-6">
      {/* 资料 Hero 卡 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-emerald-600 to-teal-700 text-white p-8 shadow-lg">
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="h-24 w-24 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-4xl ring-4 ring-white/30 shadow-xl">
            {initial.toUpperCase()}
          </div>
          <div className="flex-1 text-center md:text-left space-y-1.5">
            <div className="font-display text-2xl font-black flex items-center gap-2 justify-center md:justify-start">
              {user.nickname || `用户 ${user.phone.slice(-4)}`}
              {meDetail?.role === 'admin' && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-400 text-amber-900 font-bold">
                  管理员
                </span>
              )}
            </div>
            <div className="text-white/80 text-sm font-mono">{meDetail?.phone || user.phone}</div>
            <div className="flex items-center gap-2 text-xs text-white/70 justify-center md:justify-start">
              <BadgeCheck className="h-3.5 w-3.5" />
              已认证用户 · 注册于 {new Date().toLocaleDateString('zh-CN')}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full bg-white/15 backdrop-blur-md border-white/30 text-white hover:bg-white/25 hover:text-white">
              编辑资料
            </Button>
          </div>
        </div>

        {/* 统计行 */}
        <div className="relative mt-6 grid grid-cols-3 divide-x divide-white/20 bg-white/10 backdrop-blur-md rounded-2xl">
          {[
            { label: '发布', value: 0 },
            { label: '收藏', value: 0 },
            { label: '留言', value: 0 },
          ].map((s) => (
            <div key={s.label} className="py-3 text-center">
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-xs text-white/70 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 快捷入口 */}
      <div>
        <h2 className="font-display text-lg font-bold mb-3">我的</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_LINKS.map((it) => {
            const Icon = it.icon;
            return (
              <Link key={it.href} href={it.href}>
                <Card className="hover:shadow-hover hover:-translate-y-0.5 transition-all cursor-pointer h-full">
                  <CardContent className="p-4 space-y-2">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${it.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">{it.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{it.desc}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 设置 */}
      <div>
        <h2 className="font-display text-lg font-bold mb-3">设置</h2>
        <Card>
          <CardContent className="p-0 divide-y">
            {SETTINGS.map((it) => {
              const Icon = it.icon;
              return (
                <button
                  key={it.label}
                  className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{it.label}</div>
                    <div className="text-xs text-muted-foreground">{it.desc}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* 退出 */}
      <Button
        variant="outline"
        className="w-full h-12 rounded-full text-destructive border-destructive/30 hover:bg-destructive/5"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        退出登录
      </Button>
    </main>
  );
}
