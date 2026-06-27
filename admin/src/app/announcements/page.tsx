'use client';

/**
 * T-016 + T-019: 公告管理
 * 路径: /admin/announcements
 * 功能: 公告列表 + 创建 + 编辑 + 启用/停用 + 软删 + 恢复
 *
 * 设计要点 (T-019):
 * - 删除为软删（写 deletedAt/deletedBy/updatedBy）；新增 restore 按钮恢复
 * - "包含已删除"复选框切换 includeDeleted 参数
 * - 状态 chip 三态：启用（emerald）/ 停用（gray）/ 已删除（red opacity）
 * - 删除时间列仅 includeDeleted=true 时显示
 */
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminAnnouncementApi, type AdminAnnouncement } from '@/lib/api';
import { formatDateTime } from '@/lib/date';
import {
  Plus,
  Edit2,
  Trash2,
  Megaphone,
  Power,
  PowerOff,
  Search,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_LABEL: Record<number, { text: string; cls: string }> = {
  1: { text: '启用', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  0: { text: '停用', cls: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
};

// T-019: 状态 chip 三态（含已删除）
function StatusChip({ a }: { a: AdminAnnouncement }) {
  if (a.deletedAt) {
    return (
      <span
        className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 opacity-60"
        title={`删除时间: ${formatDateTime(a.deletedAt)}`}
      >
        已删除
      </span>
    );
  }
  const sc = STATUS_LABEL[a.status] ?? STATUS_LABEL[0];
  return (
    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', sc.cls)}>
      {sc.text}
    </span>
  );
}

const PRIORITY_LABEL: Record<number, { text: string; cls: string }> = {
  1: { text: '置顶', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  0: { text: '普通', cls: 'bg-secondary text-secondary-foreground' },
};

interface FormState {
  title: string;
  content: string;
  status: number;
  priority: number;
  startsAt: string; // datetime-local: 'YYYY-MM-DDTHH:mm'
  endsAt: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  content: '',
  status: 1,
  priority: 0,
  startsAt: '',
  endsAt: '',
};

function isoToLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(local: string): string | null {
  if (!local) return null;
  return new Date(local).toISOString();
}

export default function AdminAnnouncementsPage() {
  const [list, setList] = useState<AdminAnnouncement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 0 | 1>('all');
  // T-019: "包含已删除" 复选框（默认 false — admin 默认只看到未删）
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [q, setQ] = useState('');

  // 模态状态
  const [editing, setEditing] = useState<AdminAnnouncement | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await adminAnnouncementApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: 1,
        pageSize: 100,
        includeDeleted, // T-019
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, includeDeleted]);

  // 客户端搜索防抖（title 模糊）
  const filteredList = useMemo(() => {
    if (!q.trim()) return list;
    const kw = q.trim().toLowerCase();
    return list.filter((a) => a.title.toLowerCase().includes(kw));
  }, [list, q]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setError(null);
    setCreating(true);
  }

  function openEdit(a: AdminAnnouncement) {
    setForm({
      title: a.title,
      content: a.content,
      status: a.status,
      priority: a.priority,
      startsAt: isoToLocal(a.startsAt),
      endsAt: isoToLocal(a.endsAt),
    });
    setEditing(a);
    setCreating(true);
    setError(null);
  }

  function closeModal() {
    setCreating(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError('标题和内容不能为空');
      return;
    }
    setSubmitting(true);
    setError(null);
    const body: any = {
      title: form.title.trim(),
      content: form.content.trim(),
      status: form.status,
      priority: form.priority,
      startsAt: localToIso(form.startsAt),
      endsAt: localToIso(form.endsAt),
    };
    try {
      if (editing) {
        await adminAnnouncementApi.update(editing.id, body);
      } else {
        await adminAnnouncementApi.create(body);
      }
      closeModal();
      await load();
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * T-019: 软删（不再硬删）
   * - 后端 service.remove 写 deletedAt/deletedBy/updatedBy
   * - UI 仅显示"软删"提示（不再"不可恢复"）
   * - 默认勾选 includeDeleted 让用户看到刚删的行（不勾选则隐藏）
   */
  async function handleDelete(a: AdminAnnouncement) {
    if (
      !confirm(
        `确认删除公告「${a.title}」？\n\n删除后可勾选"包含已删除"恢复。`,
      )
    )
      return;
    try {
      await adminAnnouncementApi.remove(a.id);
      await load();
    } catch (e: any) {
      alert('删除失败：' + (e?.message || ''));
    }
  }

  /**
   * T-019: 恢复已软删公告
   * - 后端 service.restore 事务双写 update + AuditLog
   * - 恢复后 status 自动 = 1（启用）
   */
  async function handleRestore(a: AdminAnnouncement) {
    if (
      !confirm(
        `确认恢复公告「${a.title}」？\n\n恢复后该公告将自动设为启用状态，可能立即在前台 banner 显示。`,
      )
    )
      return;
    try {
      await adminAnnouncementApi.restore(a.id);
      await load();
    } catch (e: any) {
      alert('恢复失败：' + (e?.message || ''));
    }
  }

  async function handleToggleStatus(a: AdminAnnouncement) {
    if (a.deletedAt) {
      alert('已删除的公告无法修改状态，请先恢复');
      return;
    }
    const next = a.status === 1 ? 0 : 1;
    const action = next === 1 ? '启用' : '停用';
    if (
      !confirm(
        `确认${action}公告「${a.title}」？\n${
          next === 0 ? '停用后前台 banner 不再显示' : '启用后前台 banner 显示'
        }`,
      )
    )
      return;
    try {
      await adminAnnouncementApi.update(a.id, { status: next });
      await load();
    } catch (e: any) {
      alert(`${action}失败：${e?.message || ''}`);
    }
  }

  function formatTimeWindow(a: AdminAnnouncement): string {
    const s = a.startsAt ? formatDateTime(a.startsAt).slice(0, 16) : '立即';
    const e = a.endsAt ? formatDateTime(a.endsAt).slice(0, 16) : '永久';
    return `${s} ~ ${e}`;
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" /> 公告管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {total} 条公告（SHOULD-30 seed）· 仅 status=启用 + 生效时段内会在前台 banner 显示
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> 新建公告
        </Button>
      </div>

      {/* 工具条 */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索公告标题…"
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground mr-1">状态：</span>
            {[
              { v: 'all' as const, label: '全部' },
              { v: 1 as const, label: '启用' },
              { v: 0 as const, label: '停用' },
            ].map((opt) => (
              <button
                key={String(opt.v)}
                onClick={() => setStatusFilter(opt.v)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs transition-colors',
                  statusFilter === opt.v
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* T-019: 包含已删除 复选框 */}
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
              className="rounded"
            />
            包含已删除
          </label>
        </CardContent>
      </Card>

      {/* 创建/编辑 模态 */}
      {creating && (
        <Card className="border-primary/30">
          <CardContent className="p-5">
            <form onSubmit={submit} className="space-y-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                {editing ? (
                  <>
                    <Edit2 className="h-4 w-4" /> 编辑公告
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> 新建公告
                  </>
                )}
              </h2>

              <div className="space-y-2">
                <label className="text-sm font-medium">标题 * (1-100 字)</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="如：系统升级通知"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">内容 * (1-2000 字)</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="公告详细内容…"
                  rows={6}
                  maxLength={2000}
                  required
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-xs text-muted-foreground">
                  当前 {form.content.length} / 2000 字
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">状态</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value={1}>启用</option>
                    <option value={0}>停用</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">优先级</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value={0}>普通</option>
                    <option value={1}>置顶</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    <Calendar className="inline h-3.5 w-3.5 mr-1" />
                    生效开始
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">空 = 立即生效</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    <Calendar className="inline h-3.5 w-3.5 mr-1" />
                    生效结束
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">空 = 永久</p>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-2.5">
                  ⚠ {error}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={closeModal}>
                  取消
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? '保存中…' : editing ? '保存修改' : '创建'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 表格列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredList.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">
              {q.trim()
                ? `未找到包含「${q.trim()}」的公告`
                : includeDeleted
                ? '没有已删除的公告'
                : '还没有公告'}
            </p>
            {!q.trim() && !includeDeleted && (
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" /> 新建第一条
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">ID</th>
                    <th className="px-4 py-3 text-left font-medium">标题</th>
                    <th className="px-4 py-3 text-left font-medium">状态</th>
                    <th className="px-4 py-3 text-left font-medium">优先级</th>
                    <th className="px-4 py-3 text-left font-medium">生效时段</th>
                    <th className="px-4 py-3 text-left font-medium">创建时间</th>
                    {/* T-019: 仅 includeDeleted=true 时显示 */}
                    {includeDeleted && (
                      <th className="px-4 py-3 text-left font-medium">删除时间</th>
                    )}
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((a) => {
                    const pc = PRIORITY_LABEL[a.priority] ?? PRIORITY_LABEL[0];
                    return (
                      <tr
                        key={a.id}
                        className={clsx(
                          'border-t border-border transition-colors',
                          a.deletedAt
                            ? 'opacity-60 bg-red-50/30 dark:bg-red-950/10'
                            : 'hover:bg-muted/30',
                        )}
                      >
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          #{a.id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-md">
                            <div className="font-medium truncate">{a.title}</div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {a.content}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip a={a} />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              pc.cls,
                            )}
                          >
                            {pc.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimeWindow(a)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(a.createdAt)}
                        </td>
                        {includeDeleted && (
                          <td className="px-4 py-3 text-xs text-red-600 dark:text-red-400 whitespace-nowrap">
                            {a.deletedAt ? formatDateTime(a.deletedAt) : '—'}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {a.deletedAt ? (
                              // T-019: 已删状态只显示"恢复"
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRestore(a)}
                                title="恢复"
                                className="rounded-full h-8 px-2 text-emerald-600 hover:text-emerald-700"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus(a)}
                                  title={a.status === 1 ? '停用' : '启用'}
                                  className="rounded-full h-8 px-2"
                                >
                                  {a.status === 1 ? (
                                    <PowerOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Power className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(a)}
                                  title="编辑"
                                  className="rounded-full h-8 px-2"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(a)}
                                  title="软删除（可在包含已删除中恢复）"
                                  className="rounded-full h-8 px-2 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
