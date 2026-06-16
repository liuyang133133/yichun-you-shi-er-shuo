'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiFetch, setToken, setUser, getToken } from '@/lib/api';
import { Shield, AlertCircle } from 'lucide-react';

type Tab = 'sms' | 'password';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginInner />
    </Suspense>
  );
}

function AdminLoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const expired = search.get('expired') === '1';
  const next = search.get('next') || '/dashboard';
  const [tab, setTab] = useState<Tab>('sms');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(expired ? '登录已过期，请重新登录' : null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace(next);
    }
  }, [router, next]);

  async function sendCode() {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入有效的 11 位手机号');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const r: any = await apiFetch('/auth/sms-code', {
        method: 'POST',
        body: { phone: phone.trim() },
      });
      const cd = r?.cooldown || 60;
      setCooldown(cd);
      const timer = setInterval(() => {
        setCooldown((s) => {
          if (s <= 1) { clearInterval(timer); return 0; }
          return s - 1;
        });
      }, 1000);
    } catch (e: any) {
      setError(e?.message || '发送失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入有效的 11 位手机号');
      return;
    }
    if (tab === 'sms' && !/^\d{6}$/.test(code)) {
      setError('请输入 6 位验证码');
      return;
    }
    if (tab === 'password' && !password) {
      setError('请输入密码');
      return;
    }
    setLoading(true);
    try {
      const tokens: any = await apiFetch(
        tab === 'sms' ? '/auth/login-sms' : '/auth/login-password',
        { method: 'POST', body: tab === 'sms' ? { phone: phone.trim(), code } : { phone: phone.trim(), password } },
      );
      setToken(tokens.accessToken);

      // 拉取用户信息
      const me: any = await apiFetch('/auth/me');
      if (me.role !== 'admin') {
        setError('该账号不是管理员，无权登录后台');
        setToken('');
        return;
      }
      setUser(me);
      router.replace(next);
    } catch (e: any) {
      setError(e?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary text-white shadow-lg mb-3">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">伊春有事儿说 · 管理后台</h1>
          <p className="text-sm text-muted-foreground mt-1">仅限管理员账号登录</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>登录</CardTitle>
          </CardHeader>
          <CardContent>
            {expired && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>登录已过期，请重新登录</span>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Tab 切换: 验证码登录 / 密码登录 */}
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => setTab('sms')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    tab === 'sms' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  验证码登录
                </button>
                <button
                  type="button"
                  onClick={() => setTab('password')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    tab === 'password' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  密码登录
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">手机号</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="11 位手机号"
                  maxLength={11}
                  type="tel"
                />
              </div>

              {tab === 'sms' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">验证码</label>
                  <div className="flex gap-2">
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6 位验证码"
                      maxLength={6}
                      inputMode="numeric"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={sendCode}
                      disabled={loading || cooldown > 0}
                      className="whitespace-nowrap"
                    >
                      {cooldown > 0 ? `${cooldown}s` : '发送验证码'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">密码</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="登录密码"
                  />
                </div>
              )}
              {error && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? '登录中…' : '登录后台'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                需先用 seed 创建管理员账号（role=admin）
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
