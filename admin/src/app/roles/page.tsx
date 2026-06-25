'use client';

/**
 * T-004: 角色管理
 * 路径: /admin/roles
 * 功能: 角色列表 + 创建 + 编辑 + 删除 + 权限分配
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/date';
import { Plus, Edit2, Trash2, Shield, KeyRound, Lock, X } from 'lucide-react';
import { clsx } from 'clsx';

interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  sortOrder: number;
  status: number;
  permissionCount?: number;
  createdAt: string;
}

interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
}

export default function AdminRolesPage() {
  const [list, setList] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // 创建/编辑 模态
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);

  // 权限分配 抽屉
  const [permEditing, setPermEditing] = useState<Role | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch<any>('/admin/roles', {
        params: { page: 1, pageSize: 100, includeDeleted: includeDeleted ? 'true' : 'false' },
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
  }, [includeDeleted]);

  async function handleDelete(role: Role) {
    if (role.isSystem) {
      alert('系统预置角色不可删除');
      return;
    }
    if (!confirm(`确认删除角色「${role.name}」？\n（软删，可在「包含已删除」查看）`)) return;
    try {
      await apiFetch(`/admin/roles/${role.id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      alert('删除失败：' + (e?.message || ''));
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">角色管理</h1>
          <p className="text-sm text-muted-foreground mt-1">共 {total} 个角色（T-002 已 seed 5 个预置）</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
              className="rounded"
            />
            包含已删除
          </label>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" /> 新建角色
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中…</div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">暂无角色</CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">ID</th>
                  <th className="text-left px-4 py-2.5 font-medium">Code</th>
                  <th className="text-left px-4 py-2.5 font-medium">名称</th>
                  <th className="text-left px-4 py-2.5 font-medium">描述</th>
                  <th className="text-left px-4 py-2.5 font-medium">属性</th>
                  <th className="text-left px-4 py-2.5 font-medium">排序</th>
                  <th className="text-left px-4 py-2.5 font-medium">状态</th>
                  <th className="text-left px-4 py-2.5 font-medium">创建时间</th>
                  <th className="text-left px-4 py-2.5 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr
                    key={r.id}
                    className={clsx('border-t hover:bg-secondary/30', r.status === 0 && 'opacity-50')}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                    <td className="px-4 py-3 font-mono">{r.code}</td>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.description || '-'}</td>
                    <td className="px-4 py-3">
                      {r.isSystem ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                          <Lock className="h-3 w-3" /> 系统
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-secondary text-muted-foreground">自定义</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{r.sortOrder}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded text-xs',
                          r.status === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500',
                        )}
                      >
                        {r.status === 1 ? '启用' : '已删除'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPermEditing(r)}
                          className="h-7 text-xs"
                        >
                          <KeyRound className="h-3 w-3 mr-1" /> 权限
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(r)}
                          className="h-7 text-xs"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        {!r.isSystem && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(r)}
                            className="h-7 text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(creating || editing) && (
        <RoleFormModal
          role={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await load();
          }}
        />
      )}

      {permEditing && (
        <PermissionAssignDrawer
          role={permEditing}
          onClose={() => setPermEditing(null)}
          onSaved={async () => {
            setPermEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

/* ---------- 创建 / 编辑 角色 ---------- */
function RoleFormModal({
  role,
  onClose,
  onSaved,
}: {
  role: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(role?.code || '');
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [sortOrder, setSortOrder] = useState(role?.sortOrder ?? 10);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!code.trim() || !name.trim()) {
      alert('Code 和名称必填');
      return;
    }
    setSaving(true);
    try {
      if (role) {
        await apiFetch(`/admin/roles/${role.id}`, {
          method: 'PATCH',
          body: { name, description, sortOrder },
        });
      } else {
        await apiFetch('/admin/roles', {
          method: 'POST',
          body: { code, name, description, sortOrder, isSystem: false },
        });
      }
      await onSaved();
    } catch (e: any) {
      alert('保存失败：' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> {role ? '编辑角色' : '新建角色'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Code（唯一标识，不可改）</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="例如: moderator"
              disabled={!!role}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">名称</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如: 内容审核员" className="mt-1" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">描述</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="可选" className="mt-1" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">排序（数字小=靠前）</label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              取消
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- 权限分配 抽屉 ---------- */
function PermissionAssignDrawer({
  role,
  onClose,
  onSaved,
}: {
  role: Role;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 加载所有权限码
        const permsR = await apiFetch<any>('/admin/permissions', { params: { pageSize: 200 } });
        const all = permsR?.list || [];
        setAllPerms(all);

        // 加载当前角色已有权限
        const myR = await apiFetch<any>(`/admin/roles/${role.id}/permissions`);
        const codes: string[] = myR?.permissionCodes || [];
        setChecked(new Set(codes));
      } catch (e: any) {
        alert('加载权限失败：' + (e?.message || ''));
      } finally {
        setLoading(false);
      }
    })();
  }, [role.id]);

  function toggle(code: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleModule(moduleName: string) {
    const modulePerms = allPerms.filter((p) => p.module === moduleName);
    const allOn = modulePerms.every((p) => checked.has(p.code));
    setChecked((prev) => {
      const next = new Set(prev);
      if (allOn) {
        modulePerms.forEach((p) => next.delete(p.code));
      } else {
        modulePerms.forEach((p) => next.add(p.code));
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const selectedIds = allPerms.filter((p) => checked.has(p.code)).map((p) => p.id);
      await apiFetch(`/admin/roles/${role.id}/permissions`, {
        method: 'PUT',
        body: { permissionIds: selectedIds },
      });
      await onSaved();
    } catch (e: any) {
      alert('保存失败：' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  }

  const grouped = allPerms.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.module] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl bg-card shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> 分配权限
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              角色：<span className="font-mono">{role.code}</span> · {role.name}（已选 {checked.size} / {allPerms.length}）
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中…</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([moduleName, perms]) => {
                const allOn = perms.every((p) => checked.has(p.code));
                const someOn = perms.some((p) => checked.has(p.code));
                return (
                  <div key={moduleName} className="border rounded-lg p-3">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={allOn}
                        ref={(el) => {
                          if (el) el.indeterminate = !allOn && someOn;
                        }}
                        onChange={() => toggleModule(moduleName)}
                        className="rounded"
                      />
                      <span className="font-semibold text-sm">
                        {moduleName} <span className="text-xs text-muted-foreground">({perms.length})</span>
                      </span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-6">
                      {perms.map((p) => (
                        <label key={p.code} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/30 px-2 py-1 rounded">
                          <input
                            type="checkbox"
                            checked={checked.has(p.code)}
                            onChange={() => toggle(p.code)}
                            className="rounded"
                          />
                          <span className="font-mono text-xs">{p.code}</span>
                          <span className="text-xs text-muted-foreground truncate" title={p.name}>
                            {p.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? '保存中…' : `保存 ${checked.size} 项权限`}
          </Button>
        </div>
      </div>
    </div>
  );
}