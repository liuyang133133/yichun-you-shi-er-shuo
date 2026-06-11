'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api';
import { setAccessToken, setStoredUser } from '@/lib/auth';
import { Smartphone, Lock, ArrowRight, Sparkles, Shield, Check } from 'lucide-react';

type Tab = 'sms' | 'password';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('sms');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入有效的 11 位手机号');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const r = await authApi.sendSmsCode(phone);
      setCooldown(r.cooldown || 60);
      const timer = setInterval(() => {
        setCooldown((s) => {
          if (s <= 1) { clearInterval(timer); return 0; }
          return s - 1;
        });
      }, 1000);
      alert(`验证码已发送\n开发环境：查看后端控制台日志\n冷却 ${r.cooldown} 秒`);
    } catch (e: any) {
      setError(e?.message || '发送失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入有效的 11 位手机号');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      let res;
      if (tab === 'sms') {
        if (!/^\d{6}$/.test(code)) {
          setError('请输入 6 位验证码');
          setLoading(false);
          return;
        }
        res = await authApi.loginBySms(phone, code);
      } else {
        if (password.length < 6) {
          setError('密码至少 6 位');
          setLoading(false);
          return;
        }
        res = await authApi.loginByPassword(phone, password);
      }
      setAccessToken(res.accessToken);
      setStoredUser({
        id: res.user?.phone || phone,
        phone: res.user?.phone || phone,
      });
      // 登录成功后跳回 middleware 重定向前想去的页面（SHOULD-19）
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/me';
      // 安全校验:只允许跳同源绝对路径,防止 open-redirect
      const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/me';
      router.push(safeRedirect);
    } catch (e: any) {
      setError(e?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      {/* Left: 品牌 Hero */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary via-emerald-700 to-teal-900 text-white overflow-hidden">
        {/* 装饰圆 */}
        <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.08),transparent_50%)]" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-2xl">🌲</span>
            </div>
            <div>
              <div className="text-lg font-bold">伊春有事儿说</div>
              <div className="text-xs text-white/70">本地生活信息平台</div>
            </div>
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium mb-4">
              <Sparkles className="h-3 w-3" />
              小兴安岭脚下
            </div>
            <h1 className="font-display text-4xl xl:text-5xl font-black leading-tight">
              连接本地生活<br />
              <span className="text-orange-300">信息更真实</span>
            </h1>
            <p className="text-white/80 mt-4 leading-relaxed max-w-md">
              房屋出租 · 二手交易 · 招聘求职 · 便民信息<br />
              一站式本地信息平台
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              { icon: <Check className="h-3.5 w-3.5" />, text: '手机号验证码登录，自动注册账号' },
              { icon: <Check className="h-3.5 w-3.5" />, text: '本地人发布，本地人浏览' },
              { icon: <Check className="h-3.5 w-3.5" />, text: 'JWT 双 token 鉴权，7 天免登录' },
            ].map((it, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-white/85">
                <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  {it.icon}
                </div>
                {it.text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/50">
          © 2026 伊春有事儿说
        </div>
      </aside>

      {/* Right: 登录表单 */}
      <section className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="font-display text-3xl font-black">欢迎回来 👋</h2>
            <p className="text-sm text-muted-foreground">登录后即可发布信息、收藏、留言</p>
          </div>

          {/* Tab */}
          <div className="flex gap-1 p-1 rounded-full bg-secondary">
            <button
              onClick={() => setTab('sms')}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
                tab === 'sms'
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              <Smartphone className="inline h-4 w-4 mr-1" /> 验证码登录
            </button>
            <button
              onClick={() => setTab('password')}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
                tab === 'password'
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              <Lock className="inline h-4 w-4 mr-1" /> 密码登录
            </button>
          </div>

          {/* 表单 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">手机号</Label>
              <Input
                type="tel"
                placeholder="11 位手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                maxLength={11}
                className="h-12 text-base"
              />
            </div>

            {tab === 'sms' ? (
              <div className="space-y-2">
                <Label className="text-sm">验证码</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="6 位数字"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="h-12 text-base tracking-widest"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={sendCode}
                    disabled={cooldown > 0 || loading || !/^1[3-9]\d{9}$/.test(phone)}
                    className="shrink-0 h-12 px-4"
                  >
                    {cooldown > 0 ? `${cooldown}s` : '获取验证码'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm">密码</Label>
                <Input
                  type="password"
                  placeholder="至少 6 位"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                />
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2 animate-fade-in">
                ⚠ {error}
              </div>
            )}

            <Button
              onClick={handleLogin}
              disabled={loading}
              size="lg"
              className="w-full h-12 rounded-full bg-gradient-to-r from-primary to-emerald-600 shadow-md hover:shadow-lg transition-all text-base"
            >
              {loading ? '登录中…' : '登录 / 注册'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
              <Shield className="h-3 w-3" />
              登录即代表同意 <Link href="#" className="underline hover:text-foreground">用户协议</Link> 和 <Link href="#" className="underline hover:text-foreground">隐私政策</Link>
            </div>
          </div>

          {/* 移动端 Logo */}
          <div className="lg:hidden text-center pt-4 border-t">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-xl">🌲</span> 伊春有事儿说 · 本地生活信息平台
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
