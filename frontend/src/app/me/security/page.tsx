'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/toast/toaster';
import { meApi, passwordApi, type MeDetail } from '@/lib/api';
import { clearAuth, getAccessToken, getStoredUser, type AuthUser } from '@/components/../lib/auth';
import {
  ArrowLeft, User2, Shield, Eye, EyeOff, Loader2, CheckCircle2, Smartphone,
} from 'lucide-react';

/**
 * /me/security — 个人中心 · 账号安全
 *
 * [V1.1b] 重构 — 解决用户报"注册流程设计不合理"的问题:
 *   - 把密码管理从注册流程里挪到这里
 *   - 改昵称也在这里
 *   - 改密码需要旧密码 (二次确认) — 改完撤销所有 token,本设备被踢
 */
export default function MeSecurityPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [meDetail, setMeDetail] = useState<MeDetail | null>(null);
  const [ready, setReady] = useState(false);

  // 改密码表单（hasPassword = true 时使用）
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // [V1.1b-补] 设置初始密码表单（hasPassword = false 时使用）— 走 SMS 验证 + reset 端点
  const [setCode, setSetCode] = useState('');
  const [setCooldown, setSetCooldown] = useState(0);
  const [setSending, setSetSending] = useState(false);
  const [settingPwd, setSettingPwd] = useState(false);

  // 页面加载:鉴权 + 拉用户详情
  useEffect(() => {
    const token = getAccessToken();
    const u = getStoredUser();
    if (!token || !u) {
      router.replace('/login?expired=1');
      return;
    }
    setUser(u);
    setReady(true);

    // [P1-13 2026-07-15] 统一用 meApi.detail() 入口
    meApi.detail()
      .then((data) => {
        setMeDetail(data);
      })
      .catch((e) => {
        if (e?.status === 401) {
          clearAuth();
          router.replace('/login?expired=1');
        }
      });
  }, [router]);

  // 改密码
  async function changePassword() {
    if (oldPwd.length < 6) { toast.warning('旧密码至少 6 位'); return; }
    if (newPwd.length < 6) { toast.warning('新密码至少 6 位'); return; }
    if (newPwd.length > 64) { toast.warning('新密码最多 64 位'); return; }
    if (newPwd !== confirmPwd) { toast.warning('两次输入的新密码不一致'); return; }
    if (oldPwd === newPwd) { toast.warning('新密码不能与旧密码相同'); return; }

    setSavingPwd(true);
    try {
      await passwordApi.change(oldPwd, newPwd);
      toast.success('密码已修改,所有设备已退出登录', '请重新登录');
      // 改密后所有 token 被撤销 — 清登录态 + 跳 login
      setTimeout(() => {
        clearAuth();
        router.replace('/login');
      }, 1500);
    } catch (e: any) {
      const msg: string = e?.message || '改密失败';
      if (/旧密码错误/.test(msg)) {
        toast.error('旧密码错误,请检查后重试');
      } else {
        toast.error(msg);
      }
    } finally {
      setSavingPwd(false);
    }
  }

  // [V1.1b-补] 发送设置密码验证码（已登录用户,走公开的 sendResetCode — phone 用当前用户手机号）
  async function sendSetCode() {
    const phone = meDetail?.phone || user?.phone;
    if (!phone) { toast.warning('未找到手机号,请重新登录'); return; }
    setSetSending(true);
    try {
      const r = await passwordApi.sendResetCode(phone);
      setSetCooldown(r.cooldown || 60);
      const timer = setInterval(() => {
        setSetCooldown((s) => {
          if (s <= 1) { clearInterval(timer); return 0; }
          return s - 1;
        });
      }, 1000);
      toast.success('验证码已发送', `请注意查收 ${phone.slice(0, 3)}****${phone.slice(-4)} 的短信`);
    } catch (e: any) {
      toast.error(e?.message || '发送失败');
    } finally {
      setSetSending(false);
    }
  }

  // [V1.1b-补] 设置初始密码 — 走 reset 端点（公开,SMS 码 + 新密码）
  async function setInitialPassword() {
    const phone = meDetail?.phone || user?.phone;
    if (!phone) { toast.warning('未找到手机号,请重新登录'); return; }
    if (newPwd.length < 6) { toast.warning('新密码至少 6 位'); return; }
    if (newPwd.length > 64) { toast.warning('新密码最多 64 位'); return; }
    if (newPwd !== confirmPwd) { toast.warning('两次输入的新密码不一致'); return; }
    if (!/^\d{6}$/.test(setCode)) { toast.warning('请输入 6 位验证码'); return; }

    setSettingPwd(true);
    try {
      await passwordApi.reset(phone, setCode, newPwd);
      toast.success('密码已设置,所有设备已退出登录', '请用新密码重新登录');
      // reset 撤销所有 token — 清登录态 + 跳 login
      setTimeout(() => {
        clearAuth();
        router.replace('/login');
      }, 1500);
    } catch (e: any) {
      const msg: string = e?.message || '设置失败';
      if (/验证码|已过期|无效/i.test(msg)) {
        toast.error(msg);
        setSetCode('');
      } else {
        toast.error(msg);
      }
    } finally {
      setSettingPwd(false);
    }
  }

  if (!ready || !user) {
    return (
      <main className="container max-w-2xl py-8">
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          加载中…
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-2xl py-6 space-y-6">
      {/* 顶部返回 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="rounded-full"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Button>
        <h1 className="font-display text-xl font-bold">账号安全</h1>
      </div>

      {/* 改昵称 / 头像 / 简介 引导 */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <User2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-xs space-y-1">
              <div className="font-bold">想改昵称 / 头像 / 简介?</div>
              <div className="text-muted-foreground">
                前往
                <Link href="/me" className="ml-1 text-primary hover:underline">个人中心</Link>
                点右上角"编辑资料"
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 改密码 — 按 meDetail.hasPassword 分支:
            - true: 必须填旧密码 (change 流程)
            - false: 没设过密码, 用 SMS 码设置初始密码 (reset 流程, V1.1b 砍注册设密环节) */}
      {meDetail?.hasPassword ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="font-bold">登录密码</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              修改后,所有已登录设备都会自动退出,需要用新密码重新登录
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="oldPwd">当前密码</Label>
              <div className="relative">
                <Input
                  id="oldPwd"
                  type={showPwd ? 'text' : 'password'}
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                  placeholder="当前登录密码"
                  autoComplete="current-password"
                  className="pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPwd ? '隐藏密码' : '显示密码'}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPwd">新密码</Label>
              <Input
                id="newPwd"
                type={showPwd ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="至少 6 位"
                autoComplete="new-password"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPwd">确认新密码</Label>
              <Input
                id="confirmPwd"
                type={showPwd ? 'text' : 'password'}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="再输入一次"
                autoComplete="new-password"
                className="h-11"
              />
            </div>

            <Button
              type="button"
              onClick={changePassword}
              disabled={savingPwd || !oldPwd || !newPwd || !confirmPwd}
              className="h-10 rounded-full bg-gradient-to-r from-primary to-emerald-600"
            >
              {savingPwd ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />修改中…</>
              ) : (
                <><Shield className="mr-1.5 h-4 w-4" />修改密码</>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* 没设过密码 — 设初始密码 (走 SMS + reset, V1.1b 砍注册设密环节后才有这条路径) */
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="font-bold">设置登录密码</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              你目前用短信验证码登录,未设置密码。在此处设置后,也可以用「手机号 + 密码」登录
            </p>

            {/* 验证码 + 新密码 + 确认密码 */}
            <div className="space-y-1.5">
              <Label htmlFor="setCode">短信验证码</Label>
              <div className="flex gap-2">
                <Input
                  id="setCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={setCode}
                  onChange={(e) => setSetCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6 位验证码"
                  className="h-11"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendSetCode}
                  disabled={setCooldown > 0 || setSending}
                  className="shrink-0 h-11 px-4 whitespace-nowrap"
                >
                  {setSending ? '发送中…' : setCooldown > 0 ? `${setCooldown}s 后重试` : '获取验证码'}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPwd2">新密码</Label>
              <Input
                id="newPwd2"
                type={showPwd ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="至少 6 位"
                autoComplete="new-password"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPwd2">确认新密码</Label>
              <Input
                id="confirmPwd2"
                type={showPwd ? 'text' : 'password'}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="再输入一次"
                autoComplete="new-password"
                className="h-11"
              />
            </div>

            <Button
              type="button"
              onClick={setInitialPassword}
              disabled={settingPwd || !setCode || !newPwd || !confirmPwd}
              className="h-10 rounded-full bg-gradient-to-r from-primary to-emerald-600"
            >
              {settingPwd ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />设置中…</>
              ) : (
                <><Shield className="mr-1.5 h-4 w-4" />设置密码</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 忘记密码引导 */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="text-xs space-y-1">
              <div className="font-bold">忘了密码?</div>
              <div className="text-muted-foreground">
                前往
                <Link href="/forgot-password" className="ml-1 text-primary hover:underline">忘记密码</Link>
                用手机号 + 验证码重置
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}