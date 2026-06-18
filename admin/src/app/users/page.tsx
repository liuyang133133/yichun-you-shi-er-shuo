'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/date';
import { Search, Shield, ShieldOff, Ban } from 'lucide-react';
import { clsx } from 'clsx';

export default function AdminUsersPage() {
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<any>('/admin/users', { params: { keyword: keyword || undefined, page, pageSize: 20 } })
      .then((r) => {
        setList(r?.list || r || []);
        setTotal(r?.total || (Array.isArray(r) ? r.length : 0));
      })
      .catch(() => {
        setList([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [keyword, page]);

  async function toggleStatus(userId: string, currentStatus: number) {
    const action = currentStatus === 0 ? 'ban' : 'unban';

    if (action === 'ban') {
      // 封禁需要理由（后端必填，用于审计）
      const reasonInput = window.prompt('请输入封禁理由（必填）:', '');
      if (reasonInput === null) return; // 用户取消
      const reason = reasonInput.trim();
      if (!reason) {
        alert('封禁理由不能为空');
        return;
      }
      if (!confirm(`确认封禁此用户？\n理由：${reason}`)) return;

      setActing(userId);
      try {
        await apiFetch(`/admin/users/${userId}/ban`, { method: 'POST', body: { reason } });
        setList((l) => l.map((u) => (String(u.id) === userId ? { ...u, status: 1 } : u)));
      } catch (e: any) {
        alert('操作失败：' + (e?.message || ''));
      } finally {
        setActing(null);
      }
    } else {
      // 解封：无需理由
      if (!confirm('确认解封？')) return;

      setActing(userId);
      try {
        await apiFetch(`/admin/users/${userId}/unban`, { method: 'POST' });
        setList((l) => l.map((u) => (String(u.id) === userId ? { ...u, status: 0 } : u)));
      } catch (e: any) {
        alert('操作失败：' + (e?.message || ''));
      } finally {
        setActing(null);
      }
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-sm text-muted-foreground mt-1">共 {total} 个用户</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="搜索手机号/昵称"
            className="pl-10 w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中…</div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">暂无用户</CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">ID</th>
                  <th className="text-left px-4 py-2.5 font-medium">手机号</th>
                  <th className="text-left px-4 py-2.5 font-medium">昵称</th>
                  <th className="text-left px-4 py-2.5 font-medium">角色</th>
                  <th className="text-left px-4 py-2.5 font-medium">状态</th>
                  <th className="text-left px-4 py-2.5 font-medium">注册时间</th>
                  <th className="text-left px-4 py-2.5 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-secondary/30">
                    <td className="px-4 py-3 font-mono text-xs">{u.id}</td>
                    <td className="px-4 py-3 font-mono">{u.phone}</td>
                    <td className="px-4 py-3">{u.nickname || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded text-xs',
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-secondary text-muted-foreground',
                        )}
                      >
                        {u.role === 'admin' ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded text-xs',
                          u.status === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
                        )}
                      >
                        {u.status === 0 ? '正常' : '已封禁'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTime(u.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {u.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant={u.status === 0 ? 'destructive' : 'outline'}
                          onClick={() => toggleStatus(u.id, u.status)}
                          disabled={acting === u.id}
                          className="h-7 text-xs"
                        >
                          {u.status === 0 ? (
                            <><Ban className="h-3 w-3 mr-1" /> 封禁</>
                          ) : (
                            <><Shield className="h-3 w-3 mr-1" /> 解封</>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {total > 20 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">第 {page} 页 / 共 {Math.ceil(total / 20)} 页</span>
          <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
