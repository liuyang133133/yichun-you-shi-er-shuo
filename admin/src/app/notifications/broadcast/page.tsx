'use client';

/**
 * T-009: 通知群发
 * 路径: /admin/notifications/broadcast
 * 功能: 选事件 + 选角色 + 写标题正文 → 群发
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { Send, ArrowLeft, Users, AlertTriangle } from 'lucide-react';

export default function AdminBroadcastPage() {
  const router = useRouter();
  const [event, setEvent] = useState('system');
  const [role, setRole] = useState<'all' | 'user' | 'admin'>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState(3);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; target: number } | null>(null);

  async function submit() {
    if (!title.trim() || !body.trim()) {
      alert('标题和正文必填');
      return;
    }
    if (priority >= 4) {
      if (!confirm(`当前优先级 ${priority}（紧急），将绕过用户静默时段设置。确认发送？`)) {
        return;
      }
    } else {
      if (!confirm(`确认群发给 ${role === 'all' ? '所有' : role} 用户？`)) {
        return;
      }
    }
    setSending(true);
    try {
      const r = await apiFetch<any>('/admin/notifications/broadcast', {
        method: 'POST',
        body: {
          event,
          title,
          body,
          role: role === 'all' ? undefined : role,
          priority,
        },
      });
      setResult(r);
      setTimeout(() => {
        router.push('/admin/notifications/templates');
      }, 2000);
    } catch (e: any) {
      alert('发送失败：' + (e?.message || ''));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/notifications/templates"
          className="h-9 w-9 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Send className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">群发通知</h1>
            <p className="text-xs text-muted-foreground">向指定范围用户发送通知</p>
          </div>
        </div>
      </div>

      {result && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-emerald-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-700">
                发送成功！目标 {result.target} 人，成功 {result.sent} 人
              </p>
              <p className="text-xs text-muted-foreground">2 秒后自动跳回模板列表…</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">事件类型</label>
            <select
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded text-sm bg-background"
            >
              <option value="comment">💬 评论</option>
              <option value="audit">✅ 审核</option>
              <option value="order">🛒 订单</option>
              <option value="auth">🔐 认证</option>
              <option value="system">📢 系统（推荐群发）</option>
              <option value="appeal">⚖️ 申诉</option>
              <option value="follow">👥 关注</option>
              <option value="invite">🎁 邀请</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">接收者</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="mt-1 w-full px-3 py-2 border rounded text-sm bg-background"
            >
              <option value="all">所有用户（user + admin）</option>
              <option value="user">仅普通用户</option>
              <option value="admin">仅管理员</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">标题</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如: 伊春有事儿说 2026 升级通知"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">正文</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="例如: 平台新增了通知中心、登录日志、操作审计等功能，欢迎使用。"
              className="mt-1 w-full px-3 py-2 border rounded text-sm bg-background min-h-[120px] resize-y"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">优先级（1-5，5 最高，紧急）</label>
            <Input
              type="number"
              min={1}
              max={5}
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value, 10) || 1)}
              className="mt-1"
            />
            {priority >= 4 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                紧急通知会绕过用户静默时段设置
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link href="/admin/notifications/templates">
              <Button variant="outline" disabled={sending}>取消</Button>
            </Link>
            <Button onClick={submit} disabled={sending}>
              <Send className="h-4 w-4 mr-1" /> {sending ? '发送中…' : '确认群发'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}