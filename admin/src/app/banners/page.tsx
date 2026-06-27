'use client';

/**
 * T-020: Banner 管理
 * 路径: /admin/banners
 * 功能: 列表 + 创建 + 编辑 + 启停 + 软删 + 恢复
 *
 * 设计要点 (T-020):
 * - 卡片→表格布局（仿 announcements/page.tsx 模式）
 * - 删除为软删（写 deletedAt/deletedBy/updatedBy）；新增 restore 按钮恢复
 * - "包含已删除"复选框切换 includeDeleted 参数
 * - 状态 chip 三态：启用（emerald）/ 停用（gray）/ 已删除（red opacity）
 * - 删除时间列仅 includeDeleted=true 时显示
 */
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminBannerApi, type AdminBanner } from '@/lib/api';
import { formatDateTime } from '@/lib/date';
import {
  Plus,
  Edit2,
  Trash2,
  ImageIcon,
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

const POSITION_LABEL: Record<string, { text: string; cls: string }> = {
  home_top: { text: '首页头部', cls: 'bg-primary/10 text-primary' },
  home_mid: { text: '首页中部', cls: 'bg-secondary text-secondary-foreground' },
  list_top: { text: '列表页头部', cls: 'bg-muted text-muted-foreground' },
};

// T-020: 状态 chip 三态（含已删除）
function StatusChip({ b }: { b: AdminBanner }) {
  if (b.deletedAt) {
    return (
      <span
        className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 opacity-60"
        title={`删除时间: ${formatDateTime(b.deletedAt)}`}
      >
        已删除
      </span>
    );
  }
  const sc = STATUS_LABEL[b.status] ?? STATUS_LABEL[0];
  return (
    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', sc.cls)}>
      {sc.text}
    </span>
  );
}

interface FormState {
  title: string;
  imageUrl: string;
  linkType: 'url' | 'post' | 'category' | 'search';
  linkTarget: string;
  position: 'home_top' | 'home_mid' | 'list_top';
  sortOrder: number;
  status: number;
  startsAt: string;
  endsAt: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  imageUrl: '',
  linkType: 'url',
  linkTarget: '',
  position: 'home_top',
  sortOrder: 0,
  status: 1,
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

export default function AdminBannersPage() {
  const [list, setList] = useState<AdminBanner[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [positionFilter, setPositionFilter] = useState<'all' | 'home_top' | 'home_mid' | 'list_top'>(
    'all',
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 0 | 1>('all');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [q, setQ] = useState('');

  const [editing, setEditing] = useState<AdminBanner | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await adminBannerApi.list({
        position: positionFilter === 'all' ? undefined : positionFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: 1,
        pageSize: 100,
        includeDeleted,
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
  }, [positionFilter, statusFilter, includeDeleted]);

  const filteredList = useMemo(() => {
    if (!q.trim()) return list;
    const kw = q.trim().toLowerCase();
    return list.filter((b) => b.title.toLowerCase().includes(kw));
  }, [list, q]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setError(null);
    setCreating(true);
  }

  function openEdit(b: AdminBanner) {
    setForm({
      title: b.title,
      imageUrl: b.imageUrl,
      linkType: b.linkType,
      linkTarget: b.linkTarget,
      position: b.position,
      sortOrder: b.sortOrder,
      status: b.status,
      startsAt: isoToLocal(b.startsAt),
      endsAt: isoToLocal(b.endsAt),
    });
    setEditing(b);
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
    if (!form.title.trim() || !form.imageUrl.trim()) {
      setError('标题和图片 URL 必填');
      return;
    }
    setSubmitting(true);
    setError(null);
    const body: any = {
      title: form.title.trim(),
      imageUrl: form.imageUrl.trim(),
      linkType: form.linkType,
      linkTarget: form.linkTarget,
      position: form.position,
      sortOrder: form.sortOrder,
      status: form.status,
      startsAt: localToIso(form.startsAt),
      endsAt: localToIso(form.endsAt),
    };
    try {
      if (editing) {
        await adminBannerApi.update(editing.id, body);
      } else {
        await adminBannerApi.create(body);
      }
      closeModal();
      await load();
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(b: AdminBanner) {
    if (
      !confirm(
        `确认删除 Banner「${b.title}」？\n\n删除后可勾选"包含已删除"恢复。`,
      )
    )
      return;
    try {
      await adminBannerApi.remove(b.id);
      await load();
    } catch (e: any) {
      alert('删除失败：' + (e?.message || ''));
    }
  }

  async function handleRestore(b: AdminBanner) {
    if (
      !confirm(
        `确认恢复 Banner「${b.title}」？\n\n恢复后该 Banner 将自动设为启用状态，可能立即在前台显示。`,
      )
    )
      return;
    try {
      await adminBannerApi.restore(b.id);
      await load();
    } catch (e: any) {
      alert('恢复失败：' + (e?.message || ''));
    }
  }

  async function handleToggleStatus(b: AdminBanner) {
    if (b.deletedAt) {
      alert('已删除的 Banner 无法修改状态，请先恢复');
      return;
    }
    const next = b.status === 1 ? 0 : 1;
    const action = next === 1 ? '启用' : '停用';
    if (
      !confirm(
        `确认${action}Banner「${b.title}」？\n${
          next === 0 ? '停用后前台 banner 不再显示' : '启用后前台 banner 显示'
        }`,
      )
    )
      return;
    try {
      await adminBannerApi.update(b.id, { status: next });
      await load();
    } catch (e: any) {
      alert(`${action}失败：${e?.message || ''}`);
    }
  }

  function formatTimeWindow(b: AdminBanner): string {
    const s = b.startsAt ? formatDateTime(b.startsAt).slice(0, 16) : '立即';
    const e = b.endsAt ? formatDateTime(b.endsAt).slice(0, 16) : '永久';
    return `${s} ~ ${e}`;
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6" /> Banner 运营位
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {total} 个 Banner · 仅 status=启用 + 生效时段内会在前台显示
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> 新建 Banner
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
              placeholder="搜索 Banner 标题…"
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground mr-1">位置：</span>
            {[
              { v: 'all' as const, label: '全部' },
              { v: 'home_top' as const, label: '首页头部' },
              { v: 'home_mid' as const, label: '首页中部' },
              { v: 'list_top' as const, label: '列表页头部' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setPositionFilter(opt.v)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs transition-colors',
                  positionFilter === opt.v
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
                )}
              >
                {opt.label}
              </button>
            ))}
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
                    <Edit2 className="h-4 w-4" /> 编辑 Banner
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> 新建 Banner
                  </>
                )}
              </h2>

              <div className="space-y-2">
                <label className="text-sm font-medium">标题 * (1-100 字)</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="如：本月最热房源 TOP10"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">图片 URL * (1-500 字)</label>
                <Input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://... 或 http://localhost:3001/uploads/..."
                  maxLength={500}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  建议尺寸 16:5（如 1280x400），先用 /upload/image 上传
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">链接类型</label>
                  <select
                    value={form.linkType}
                    onChange={(e) =>
                      setForm({ ...form, linkType: e.target.value as FormState['linkType'] })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="url">外链 URL</option>
                    <option value="post">帖子 ID</option>
                    <option value="category">分类（填 house/secondhand/job/lifebiz）</option>
                    <option value="search">站内搜索词</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">链接目标</label>
                  <Input
                    value={form.linkTarget}
                    onChange={(e) => setForm({ ...form, linkTarget: e.target.value })}
                    placeholder={
                      form.linkType === 'url'
                        ? 'https://...'
                        : form.linkType === 'search'
                        ? '搜索关键词'
                        : form.linkType === 'category'
                        ? 'house / secondhand / job / lifebiz'
                        : '帖子 ID'
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">位置</label>
                  <select
                    value={form.position}
                    onChange={(e) =>
                      setForm({ ...form, position: e.target.value as FormState['position'] })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="home_top">首页头部</option>
                    <option value="home_mid">首页中部</option>
                    <option value="list_top">列表页头部</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">排序（数字小=排前）</label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm({ ...form, sortOrder: Number(e.target.value) })
                    }
                  />
                </div>
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
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">
              {q.trim()
                ? `未找到包含「${q.trim()}」的 Banner`
                : includeDeleted
                ? '没有已删除的 Banner'
                : '还没有 Banner'}
            </p>
            {!q.trim() && !includeDeleted && (
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" /> 新建第一个
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
                    <th className="px-4 py-3 text-left font-medium">Banner</th>
                    <th className="px-4 py-3 text-left font-medium">位置</th>
                    <th className="px-4 py-3 text-left font-medium">状态</th>
                    <th className="px-4 py-3 text-left font-medium">排序</th>
                    <th className="px-4 py-3 text-left font-medium">生效时段</th>
                    <th className="px-4 py-3 text-left font-medium">创建时间</th>
                    {includeDeleted && (
                      <th className="px-4 py-3 text-left font-medium">删除时间</th>
                    )}
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((b) => {
                    const pc = POSITION_LABEL[b.position] ?? POSITION_LABEL['home_top'];
                    return (
                      <tr
                        key={b.id}
                        className={clsx(
                          'border-t border-border transition-colors',
                          b.deletedAt
                            ? 'opacity-60 bg-red-50/30 dark:bg-red-950/10'
                            : 'hover:bg-muted/30',
                        )}
                      >
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          #{b.id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={b.imageUrl}
                              alt={b.title}
                              className="h-10 w-16 object-cover rounded ring-1 ring-border flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate max-w-xs">{b.title}</div>
                              <div className="text-xs text-muted-foreground truncate mt-0.5">
                                {b.linkType}: {b.linkTarget || '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('px-2 py-0.5 rounded text-xs', pc.cls)}>
                            {pc.text}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip b={b} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          #{b.sortOrder}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimeWindow(b)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(b.createdAt)}
                        </td>
                        {includeDeleted && (
                          <td className="px-4 py-3 text-xs text-red-600 dark:text-red-400 whitespace-nowrap">
                            {b.deletedAt ? formatDateTime(b.deletedAt) : '—'}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {b.deletedAt ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRestore(b)}
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
                                  onClick={() => handleToggleStatus(b)}
                                  title={b.status === 1 ? '停用' : '启用'}
                                  className="rounded-full h-8 px-2"
                                >
                                  {b.status === 1 ? (
                                    <PowerOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Power className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(b)}
                                  title="编辑"
                                  className="rounded-full h-8 px-2"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(b)}
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
