'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/patterns/avatar';
import { PageLoading } from '@/components/patterns/empty-state';
import { toast } from '@/components/toast/toaster';
import { authApi, meApi, messagesApi, type MeDetail } from '@/lib/api';
import { EditProfileSheet } from '@/components/me/edit-profile-sheet';
import { clearAuth, getAccessToken, getStoredUser, type AuthUser } from '@/lib/auth';
import {
  LogOut, FileText, Heart, MessageCircle, ChevronRight, Settings,
  Shield, Bell, BadgeCheck, Plus, Compass,
} from 'lucide-react';

const QUICK_LINKS = [
  { href: '/me/posts', icon: FileText, label: '我的发布', desc: '查看 / 管理已发布信息', tone: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
  { href: '/me/favorites', icon: Heart, label: '我的收藏', desc: '收藏的房屋 / 二手 / 招聘', tone: 'text-pink-600 bg-pink-50 dark:bg-pink-950/40' },
  { href: '/me/messages', icon: MessageCircle, label: '站内信', desc: '买家 / 卖家 / HR 沟通', tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
  { href: '/posts/publish', icon: Plus, label: '发布新信息', desc: '发布到 4 大模块之一', tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
];

const SETTINGS = [
  { icon: Bell, label: '消息通知', desc: '接收新留言 / 系统通知' },
  { icon: Shield, label: '账号安全', desc: '改昵称 / 修改密码 / 账号安全', href: '/me/security' },
  { icon: Settings, label: '隐私设置', desc: '控制谁能看到我的信息' },
  { icon: Compass, label: '使用指南', desc: '快速了解伊春有事儿说' },
];

const STAT_TABS = [
  { key: 'posts', label: '发布', href: '/me/posts' },
  { key: 'favorites', label: '收藏', href: '/me/favorites' },
  { key: 'comments', label: '留言', href: undefined },
  { key: 'unread', label: '未读', href: '/me/messages' },
] as const;

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [meDetail, setMeDetail] = useState<MeDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [stats, setStats] = useState({ posts: 0, favorites: 0, comments: 0, unread: 0 });

  useEffect(() => {
    const token = getAccessToken();
    const u = getStoredUser();
    if (!token || !u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    setReady(true);
    // [P1-01] V1.0 验收修复: /auth/me 失败时不再立即踢回登录页
    // 业务背景: 登录后立即访问 /me,后端 /auth/me 偶发 5xx/网络抖动
    // 旧逻辑: 失败 → clearAuth() + router.replace('/login') → 用户被踢
    // 新逻辑: 用 localStorage 数据继续渲染;失败时静默记录到 meDetail 为 null
    //        统计接口也用 allSettled, 失败填 0, 不影响页面
    // 只有明确 401 (token 失效) 才走 handle401 → /login
    authApi.me()
      .then((data) => setMeDetail(data))
      .catch((e) => {
        // 仅 token 失效 (401) 才清登录态;其它错误 (5xx/网络) 保留登录态
        if (e?.status === 401) {
          clearAuth();
          router.replace('/login?expired=1');
        }
        // 否则: token 仍有效,保留 localStorage 数据继续展示
      });

    // 并行拉统计
    Promise.allSettled([
      meApi.postsCount(),
      meApi.favoritesCount(),
      meApi.commentsCount(),
      messagesApi.inbox({ page: 1, pageSize: 1 }).catch(() => ({ unreadCount: 0 })),
    ]).then(([p, f, c, m]: any) => {
      setStats({
        posts: p.status === 'fulfilled' ? p.value : 0,
        favorites: f.status === 'fulfilled' ? f.value : 0,
        comments: c.status === 'fulfilled' ? c.value : 0,
        unread: m.status === 'fulfilled' ? (m.value?.unreadCount || 0) : 0,
      });
    });
  }, [router]);

  async function handleLogout() {
    try { await authApi.logout(); } catch {}
    clearAuth();
    toast.success('已退出登录');
    router.replace('/');
  }

  if (!ready || !user) {
    return <PageLoading message="加载个人中心…" />;
  }

  // [T-XXX-LOGIN] 优先用 meDetail (服务器权威) 的 nickname/avatar/phone,
  // 兜底用 localStorage 的 user,最后兜底「用户 XXXX」
  // 修复:之前只用 localStorage,登录响应只含 phone → 显示「用户 XXXX」让用户误以为"用户被重新生成"
  const displayName =
    meDetail?.nickname || user.nickname || `用户 ${user.phone.slice(-4)}`;

  return (
    <main className="container max-w-4xl py-8 space-y-6">
      {/* 资料 Hero 卡 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-emerald-600 to-teal-700 dark:from-primary dark:via-emerald-700 dark:to-teal-800 text-white p-6 md:p-8 shadow-elevated">
        {/* 装饰光斑 */}
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6">
          <Avatar
            src={meDetail?.avatar || undefined}
            name={displayName}
            fallback={(meDetail?.phone || user.phone)?.[0] || 'U'}
            size="2xl"
            className="ring-4 ring-white/30 shadow-xl bg-white/20 backdrop-blur-md"
          />
          <div className="flex-1 text-center md:text-left space-y-1.5">
            <div className="font-display text-2xl font-black flex items-center gap-2 justify-center md:justify-start flex-wrap">
              <span>{displayName}</span>
              {meDetail?.role === 'admin' && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-400 text-amber-900 font-bold">
                  管理员
                </span>
              )}
            </div>
            <div className="text-white/80 text-sm font-mono">
              {meDetail?.phone || user.phone}
            </div>
            <div className="flex items-center gap-2 text-xs text-white/70 justify-center md:justify-start">
              <BadgeCheck className="h-3.5 w-3.5" />
              {meDetail?.role === 'admin' ? '平台管理员' : '已注册用户'} · 加入伊春有事儿说
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-full bg-white/15 backdrop-blur-md border-white/30 text-white hover:bg-white/25 hover:text-white"
              onClick={() => setEditOpen(true)}
              data-testid="open-edit-profile"
            >
              编辑资料
            </Button>
          </div>
        </div>

        {/* 统计行 */}
        <div className="relative mt-6 grid grid-cols-4 divide-x divide-white/20 bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden">
          {STAT_TABS.map((s) => (
            <div key={s.key} className="py-3 text-center">
              {s.href ? (
                <Link
                  href={s.href}
                  className="block hover:bg-white/5 transition-colors px-2 py-1"
                >
                  <div className="text-2xl font-black">{stats[s.key]}</div>
                  <div className="text-xs text-white/70 mt-0.5">{s.label}</div>
                </Link>
              ) : (
                <div className="px-2 py-1">
                  <div className="text-2xl font-black">{stats[s.key]}</div>
                  <div className="text-xs text-white/70 mt-0.5">{s.label}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 快捷入口 */}
      <section>
        <h2 className="font-display text-lg font-bold mb-3">快捷入口</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_LINKS.map((it) => {
            const Icon = it.icon;
            return (
              <Link key={it.href} href={it.href} className="group">
                <Card className="hover:shadow-hover hover:-translate-y-0.5 transition-all cursor-pointer h-full border-transparent hover:border-primary/30">
                  <CardContent className="p-4 space-y-2">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${it.tone}`}>
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
      </section>

      {/* 设置 */}
      <section>
        <h2 className="font-display text-lg font-bold mb-3">设置</h2>
        <Card>
          <CardContent className="p-0 divide-y">
            {SETTINGS.map((it) => {
              const Icon = it.icon;
              const content = (
                <>
                  <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{it.label}</div>
                    <div className="text-xs text-muted-foreground">{it.desc}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </>
              );
              return it.href ? (
                <Link
                  key={it.label}
                  href={it.href}
                  className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left group"
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={it.label}
                  className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left group"
                  onClick={() => toast.info(`${it.label}功能开发中`, '提示')}
                >
                  {content}
                </button>
              );
            })}
          </CardContent>
        </Card>
      </section>

      {/* 退出 */}
      <Button
        variant="outline"
        className="w-full h-12 rounded-full text-destructive border-destructive/30 hover:bg-destructive/5"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        退出登录
      </Button>

      {/* 底部说明 */}
      <p className="text-center text-xs text-muted-foreground pt-4">
        伊春有事儿说 v1.0 · 让本地信息流动起来
      </p>

      {/* [T-023] 编辑资料 Sheet — 头像/昵称/简介/性别 抽屉 */}
      <EditProfileSheet
        open={editOpen}
        meDetail={meDetail}
        onClose={() => setEditOpen(false)}
        onSaved={(next) => setMeDetail(next)}
      />
    </main>
  );
}