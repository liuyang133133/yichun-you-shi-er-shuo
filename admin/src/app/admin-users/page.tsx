'use client';

/**
 * T-004: 管理员列表
 * 路径: /admin/admin-users
 * 功能: 仅显示 user.role='admin' 的用户，可分配/撤销 RBAC 角色
 */
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/date';
import { Search, UserCog, Plus, X, Shield, ShieldOff } from 'lucide-react';
import { clsx } from 'clsx';

interface AdminUser {
  id: string;
  phone: string;
  nickname: string | null;
  status: number;
  createdAt: string;
  // 扩展字段（后端填充）
  roles?: Array<{ roleId: string; code: string; name: string; expiresAt?: string | null }>;
}

interface Role {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
}

export default function AdminUsersPage() {
  const [list, setList] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [assigning, setAssigning] = useState<AdminUser | null>(null);

  async function load() {
    setLoading(true);
    try {
      // T-004: withRoles=true 一次性返回 RBAC 角色（避免 N+1）
      const r = await apiFetch<any>('/admin/users', {
        params: { role: 'admin', keyword: keyword || undefined, page, pageSize: 20, withRoles: 'true' },
      });
      setList(r?.list || []);
      setTotal(r?.total || 0);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [keyword, page]);

  async function handleRevoke(userId: string, roleId: string, roleName: string) {
    if (!confirm(`确认撤销「${roleName}」角色？`)) return;
    try {
      await apiFetch(`/admin/users/${userId}/roles/${roleId}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      alert('撤销失败：' + (e?.message || ''));
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" /> 管理员列表
          </h1>
          <p className="text-sm text-muted-foreground mt-1">共 {total} 个管理员</p>
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
          <CardContent className="p-12 text-center text-muted-foreground">暂无管理员</CardContent>
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
                  <th className="text-left px-4 py-2.5 font-medium">状态</th>
                  <th className="text-left px-4 py-2.5 font-medium">RBAC 角色</th>
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
                          u.status === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
                        )}
                      >
                        {u.status === 0 ? '正常' : '已封禁'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(u.roles || []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">无</span>
                        ) : (
                          (u.roles || []).map((r) => (
                            <span
                              key={r.roleId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-primary/10 text-primary"
                            >
                              {r.name}
                              <button
                                onClick={() => handleRevoke(u.id, r.roleId, r.name)}
                                className="hover:text-destructive"
                                title="撤销"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => setAssigning(u)} className="h-7 text-xs">
                        <Plus className="h-3 w-3 mr-1" /> 分配角色
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {assigning && (
        <AssignRoleModal
          user={assigning}
          onClose={() => setAssigning(null)}
          onSaved={async () => {
            setAssigning(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

/* ---------- 分配角色 ---------- */
function AssignRoleModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [pickedRoleId, setPickedRoleId] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<any>('/admin/roles', { params: { pageSize: 50 } })
      .then((r) => {
        const all = r?.list || [];
        const ownedIds = new Set((user.roles || []).map((x) => x.roleId));
        // 只显示未拥有的角色
        setAllRoles(all.filter((x: Role) => !ownedIds.has(x.id)));
      })
      .catch(() => setAllRoles([]));
  }, [user]);

  async function submit() {
    if (!pickedRoleId) {
      alert('请选择角色');
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/admin/users/${user.id}/roles`, {
        method: 'POST',
        body: {
          roleId: pickedRoleId,
          expiresAt: expiresAt || null,
        },
      });
      await onSaved();
    } catch (e: any) {
      alert('分配失败：' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> 分配角色
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              用户：<span className="font-mono">{user.phone}</span>
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">选择角色</label>
            <select
              value={pickedRoleId}
              onChange={(e) => setPickedRoleId(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="">-- 请选择 --</option>
              {allRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code}){r.isSystem ? ' [系统]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">过期时间（可选）</label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">不填 = 永久有效；填了 = 到期自动撤销</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              取消
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? '分配中…' : '确认分配'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}