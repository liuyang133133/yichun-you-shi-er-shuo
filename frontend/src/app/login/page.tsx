'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs } from '@/components/ui/tabs';
import { toast } from '@/components/toast/toaster';
import { authApi, meApi } from '@/lib/api';
import { setAccessToken, setStoredUser } from '@/lib/auth';
import { Smartphone, Lock, ArrowRight, Sparkles, Shield } from 'lucide-react';

type Tab = 'sms' | 'password';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('sms');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  function validatePhone(): string | null {
    if (!/^1[3-9]\d{9}$/.test(phone)) return '请输入有效的 11 位手机号';
    return null;
  }

  async function sendCode() {
    const err = validatePhone();
    if (err) {
      toast.warning(err);
      return;
    }
    setSending(true);
    try {
      const r = await authApi.sendSmsCode(phone);
      setCooldown(r.cooldown || 60);
      const timer = setInterval(() => {
        setCooldown((s) => {
          if (s <= 1) { clearInterval(timer); return 0; }
          return s - 1;
        });
      }, 1000);
      toast.success('验证码已发送，请注意查收短信', `已发送至 ${phone.slice(0, 3)}****${phone.slice(-4)}`);
    } catch (e: any) {
      toast.error(e?.message || '发送失败');
    } finally {
      setSending(false);
    }
  }

  async function handleLogin() {
    const err = validatePhone();
    if (err) {
      toast.warning(err);
      return;
    }
    if (!agreed) {
      toast.warning('请先勾选并同意《用户协议》和《隐私政策》');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (tab === 'sms') {
        if (!/^\d{6}$/.test(code)) {
          toast.warning('请输入 6 位验证码');
          setLoading(false);
          return;
        }
        res = await authApi.loginBySms(phone, code);
      } else {
        if (password.length < 6) {
          toast.warning('密码至少 6 位');
          setLoading(false);
          return;
        }
        res = await authApi.loginByPassword(phone, password);
      }
      setAccessToken(res.accessToken);
      // [T-024 2026-07-15] 登录成功后立刻调 /auth/me 拿完整 user (含 avatar/nickname/id)
      // 之前只塞 id+phone → header Avatar 永远走 fallback 圆+首字母
      const writeUser = (nickname?: string, avatar?: string | null) => {
        setStoredUser({
          id: res.user?.phone || phone,
          phone: res.user?.phone || phone,
          nickname: nickname ?? `用户${(res.user?.phone || phone).slice(-4)}`,
          avatar: avatar ?? null,
        });
      };
      writeUser();
      // 异步拉一次 /auth/me 拿真实 nickname+avatar, 不阻塞跳转
      meApi.detail()
        .then((me) => writeUser(me?.nickname, me?.avatar))
        .catch(() => {/* 401 不阻塞, fallback 兜底 */});

      toast.success(`欢迎回来，${res.user?.phone?.slice(-4) || '用户'}`, '登录成功');
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || params.get('next') || '/me';
      setTimeout(() => router.replace(redirect), 300);
    } catch (e: any) {
      toast.error(e?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-emerald-50/50 via-background to-orange-50/30 dark:from-emerald-950/20 dark:via-background dark:to-orange-950/15">
      {/* 装饰背景 */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-emerald-200/30 to-transparent dark:from-emerald-900/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-orange-200/30 to-transparent dark:from-orange-900/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-6 animate-slide-up">
        {/* 品牌头部 */}
        <div className="text-center space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 group"
            aria-label="返回首页"
          >
            <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-primary via-emerald-600 to-teal-700 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                <path d="M12 2L8 8h3v3H6l4 5h4v6h-2v-6H8l4-5H7V8h2L12 2z" opacity="0.95" />
                <circle cx="12" cy="5" r="1.2" />
              </svg>
              <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-orange-500 border-2 border-background" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold leading-tight tracking-tight">
                伊春<span className="text-primary">有事儿说</span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight font-medium">
                小兴安岭 · 本地生活
              </div>
            </div>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold">欢迎回来</h1>
            <p className="text-sm text-muted-foreground mt-1">
              发布信息、收藏喜欢的房源、给邻居留言
            </p>
          </div>
        </div>

        {/* 表单卡片 */}
        <div className="rounded-2xl border bg-card p-6 shadow-soft space-y-5">
          {/* Tab 切换 */}
          <Tabs
            value={tab}
            onChange={(v) => setTab(v as Tab)}
            variant="segmented"
            items={[
              { value: 'sms', label: '短信登录', icon: <Smartphone className="h-3.5 w-3.5" /> },
              { value: 'password', label: '密码登录', icon: <Lock className="h-3.5 w-3.5" /> },
            ]}
          />

          {/* 手机号 */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">手机号</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="请输入 11 位手机号"
              autoComplete="tel"
            />
          </div>

          {tab === 'sms' ? (
            <div className="space-y-1.5">
              <Label htmlFor="code">验证码</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6 位验证码"
                  autoComplete="one-time-code"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendCode}
                  disabled={cooldown > 0 || sending}
                  className="shrink-0 h-10 px-4 rounded-md whitespace-nowrap"
                >
                  {sending ? '发送中…' : cooldown > 0 ? `${cooldown}s 后重试` : '获取验证码'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">密码</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => toast.info('找回密码功能开发中，请使用短信登录', '提示')}
                >
                  忘记密码？
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                autoComplete="current-password"
              />
            </div>
          )}

          {/* 协议勾选 */}
          <Checkbox
            checked={agreed}
            onChange={setAgreed}
            required
            label={
              <span className="text-xs text-muted-foreground">
                我已阅读并同意{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  《用户协议》
                </Link>{' '}
                和{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  《隐私政策》
                </Link>
              </span>
            }
          />

          <Button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-11 rounded-full bg-gradient-to-r from-primary to-emerald-600 shadow-md hover:shadow-hover text-base"
          >
            {loading ? '登录中…' : '登录 / 注册'}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>

          {/* 信任行 */}
          <div className="flex items-center justify-center gap-4 pt-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              实名认证
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              真实信息
            </div>
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              信息加密
            </div>
          </div>
        </div>

        {/* 底部说明 */}
        <p className="text-center text-xs text-muted-foreground">
          登录即视为同意我们的服务条款，未注册手机号将自动创建账号
        </p>
      </div>
    </main>
  );
}