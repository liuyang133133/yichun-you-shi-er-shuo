'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiFetch, setToken, setUser, getToken } from '@/lib/api';
import { Shield, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace('/dashboard');
    }
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim() || !password) {
      setError('请输入手机号和密码');
      return;
    }
    setLoading(true);
    try {
      const tokens: any = await apiFetch('/auth/login-password', {
        method: 'POST',
        body: { phone: phone.trim(), password },
      });
      setToken(tokens.accessToken);

      // 拉取用户信息
      const me: any = await apiFetch('/auth/me');
      if (me.role !== 'admin') {
        setError('该账号不是管理员，无权登录后台');
        setToken('');
        return;
      }
      setUser(me);
      router.replace('/dashboard');
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
            <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="space-y-2">
                <label className="text-sm font-medium">密码</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="登录密码"
                />
              </div>
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
