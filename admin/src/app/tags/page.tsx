'use client';

/**
 * T-015: 标签管理
 * 路径: /admin/tags
 * 功能: 标签列表 + 创建 + 编辑 + 停用/启用 + 合并 + 删除
 */
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminTagApi, type AdminTag } from '@/lib/api';
import { formatDateTime } from '@/lib/date';
import {
  Plus,
  Edit2,
  Trash2,
  Tag as TagIcon,
  Power,
  PowerOff,
  GitMerge,
  Search,
  Star,
  X,
  Hash,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function AdminTagsPage() {
  const [list, setList] = useState<AdminTag[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [includeDisabled, setIncludeDisabled] = useState(true);

  // 创建/编辑 模态
  const [editing, setEditing] = useState<AdminTag | null>(null);
  const [creating, setCreating] = useState(false);

  // 合并 模态
  const [merging, setMerging] = useState<AdminTag | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await adminTagApi.list({
        q: q || undefined,
        includeDeleted,
        includeDisabled,
        page: 1,
        pageSize: 100,
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
  }, [includeDeleted, includeDisabled]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function handleDelete(tag: AdminTag) {
    if (tag.deletedAt) return;
    if (
      !confirm(
        `确认删除标签「${tag.name}」？\n（软删，可在「包含已删除」查看）`,
      )
    )
      return;
    try {
      await adminTagApi.remove(tag.id);
      await load();
    } catch (e: any) {
      alert('删除失败：' + (e?.message || ''));
    }
  }

  async function handleToggleStatus(tag: AdminTag) {
    if (tag.deletedAt) {
      alert('已删除标签无法修改状态，请先恢复');
      return;
    }
    const next = tag.status === 1 ? 0 : 1;
    const action = next === 1 ? '启用' : '停用';
    if (
      !confirm(
        `确认${action}标签「${tag.name}」？\n${
          next === 0 ? '停用后前端 /tags 列表将不再展示此标签' : '启用后前端可见'
        }`,
      )
    )
      return;
    try {
      await adminTagApi.update(tag.id, { status: next });
      await load();
    } catch (e: any) {
      alert(`${action}失败：${e?.message || ''}`);
    }
  }

  async function handleToggleHot(tag: AdminTag) {
    try {
      await adminTagApi.update(tag.id, { isHot: !tag.isHot });
      await load();
    } catch (e: any) {
      alert('更新失败：' + (e?.message || ''));
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TagIcon className="h-6 w-6" /> 标签管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {total} 个标签（T-013 seed 30 个本地标签）
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> 新建标签
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
              placeholder="搜索标签名 / slug / 别名…"
              className="pl-8"
            />
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
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={includeDisabled}
              onChange={(e) => setIncludeDisabled(e.target.checked)}
              className="rounded"
            />
            包含已停用
          </label>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中…</div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            暂无标签
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">ID</th>
                  <th className="text-left px-4 py-2.5 font-medium">Slug</th>
                  <th className="text-left px-4 py-2.5 font-medium">名称</th>
                  <th className="text-left px-4 py-2.5 font-medium">别名</th>
                  <th className="text-right px-4 py-2.5 font-medium">使用数</th>
                  <th className="text-right px-4 py-2.5 font-medium">排序</th>
                  <th className="text-center px-4 py-2.5 font-medium">热门</th>
                  <th className="text-center px-4 py-2.5 font-medium">状态</th>
                  <th className="text-left px-4 py-2.5 font-medium">创建时间</th>
                  <th className="text-left px-4 py-2.5 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => {
                  const isDeleted = !!t.deletedAt;
                  const isDisabled = !isDeleted && t.status === 0;
                  return (
                    <tr
                      key={t.id}
                      className={clsx(
                        'border-t hover:bg-secondary/30',
                        isDeleted && 'opacity-50',
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{t.id}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {t.slug}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          {t.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">
                        {t.aliases || '-'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {t.useCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {t.sortOrder}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {t.isHot ? (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500 inline" />
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusChip
                          isDeleted={isDeleted}
                          isDisabled={isDisabled}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDateTime(t.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleHot(t)}
                            disabled={isDeleted}
                            className="h-7 text-xs"
                            title={t.isHot ? '取消热门' : '设为热门'}
                          >
                            <Star
                              className={clsx(
                                'h-3 w-3',
                                t.isHot && 'fill-amber-500 text-amber-500',
                              )}
                            />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing(t)}
                            disabled={isDeleted}
                            className="h-7 text-xs"
                            title="编辑"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleStatus(t)}
                            disabled={isDeleted}
                            className="h-7 text-xs"
                            title={isDisabled ? '启用' : '停用'}
                          >
                            {isDisabled ? (
                              <Power className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <PowerOff className="h-3 w-3 text-gray-500" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setMerging(t)}
                            disabled={isDeleted || isDisabled}
                            className="h-7 text-xs"
                            title="合并到其他标签"
                          >
                            <GitMerge className="h-3 w-3" />
                          </Button>
                          {!isDeleted && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(t)}
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              title="删除"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(creating || editing) && (
        <TagFormModal
          tag={editing}
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

      {merging && (
        <MergeTagModal
          source={merging}
          onClose={() => setMerging(null)}
          onSaved={async () => {
            setMerging(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

/* ---------- 状态 chip ---------- */
function StatusChip({
  isDeleted,
  isDisabled,
}: {
  isDeleted: boolean;
  isDisabled: boolean;
}) {
  if (isDeleted) {
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
        已删除
      </span>
    );
  }
  if (isDisabled) {
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
        已停用
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700">
      启用
    </span>
  );
}

/* ---------- 创建 / 编辑 标签 ---------- */
function TagFormModal({
  tag,
  onClose,
  onSaved,
}: {
  tag: AdminTag | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [slug, setSlug] = useState(tag?.slug || '');
  const [name, setName] = useState(tag?.name || '');
  const [description, setDescription] = useState(tag?.description || '');
  const [aliases, setAliases] = useState(tag?.aliases || '');
  const [isHot, setIsHot] = useState(tag?.isHot ?? false);
  const [sortOrder, setSortOrder] = useState(tag?.sortOrder ?? 0);
  const [status, setStatus] = useState<number>(tag?.status ?? 1);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!slug.trim() || !name.trim()) {
      alert('slug 和名称必填');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        name,
        description: description || undefined,
        aliases: aliases || undefined,
        isHot,
        sortOrder,
        status,
      };
      if (tag) {
        await adminTagApi.update(tag.id, body);
      } else {
        await adminTagApi.create({ ...body, slug });
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
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <TagIcon className="h-5 w-5" />
              {tag ? '编辑标签' : '新建标签'}
            </h2>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Slug（URL 唯一标识，不可改）
            </label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="例如: shanlin"
              disabled={!!tag}
              className="mt-1 font-mono"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">名称</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 山林特产"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">描述</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选，详情页 + SEO"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              别名（逗号分隔，用于搜索联想）
            </label>
            <Input
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="例如: 山野菜,野菜,山菜"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">
                排序（数字小=靠前）
              </label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(parseInt(e.target.value, 10) || 0)
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">状态</label>
              <select
                value={status}
                onChange={(e) => setStatus(parseInt(e.target.value, 10))}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value={1}>启用</option>
                <option value={0}>停用</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isHot}
              onChange={(e) => setIsHot(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">设为热门（首页标签云展示）</span>
          </label>

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

/* ---------- 合并标签 ---------- */
function MergeTagModal({
  source,
  onClose,
  onSaved,
}: {
  source: AdminTag;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [targetQuery, setTargetQuery] = useState('');
  const [candidates, setCandidates] = useState<AdminTag[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<AdminTag | null>(null);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  // 搜索目标标签
  useEffect(() => {
    const t = setTimeout(async () => {
      if (targetQuery.length === 0) {
        setCandidates([]);
        return;
      }
      setSearching(true);
      try {
        const r = await adminTagApi.list({
          q: targetQuery,
          includeDeleted: false,
          includeDisabled: false,
          pageSize: 10,
        });
        // 排除 source
        setCandidates((r?.list || []).filter((c) => c.id !== source.id));
      } catch {
        setCandidates([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [targetQuery, source.id]);

  async function submit() {
    if (!selectedTarget) {
      alert('请选择目标标签');
      return;
    }
    if (
      !confirm(
        `确认将标签「${source.name}」合并到「${selectedTarget.name}」？\n\n` +
          `操作：${source.name} 的所有 PostTag (共 ${source.useCount} 条) 将转到 ${selectedTarget.name}，` +
          `${source.name} 将被软删+停用。\n\n此操作不可撤销。`,
      )
    )
      return;
    setSaving(true);
    try {
      await adminTagApi.merge(source.id, selectedTarget.id);
      await onSaved();
    } catch (e: any) {
      alert('合并失败：' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <GitMerge className="h-5 w-5" /> 合并标签
            </h2>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-3 bg-secondary/30 rounded-md text-sm">
            <div className="text-xs text-muted-foreground mb-1">源标签</div>
            <div className="flex items-center gap-2">
              <Hash className="h-3 w-3" />
              <span className="font-medium">{source.name}</span>
              <span className="text-xs text-muted-foreground font-mono">
                ({source.slug})
              </span>
              <span className="ml-auto text-xs">
                {source.useCount} 条 PostTag
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              目标标签（接收 PostTag）
            </label>
            <div className="relative mt-1">
              <Input
                value={targetQuery}
                onChange={(e) => {
                  setTargetQuery(e.target.value);
                  setSelectedTarget(null);
                }}
                placeholder="搜索目标标签…"
                className="mt-0"
              />
            </div>
            {targetQuery.length > 0 && !selectedTarget && (
              <div className="mt-2 max-h-48 overflow-y-auto border rounded-md">
                {searching ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    搜索中…
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    无匹配标签
                  </div>
                ) : (
                  candidates.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedTarget(c);
                        setTargetQuery(c.name);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-secondary/50 flex items-center gap-2 text-sm"
                    >
                      <Hash className="h-3 w-3" />
                      <span>{c.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ({c.slug})
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {c.useCount}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedTarget && (
              <div className="mt-2 p-2 bg-emerald-50 text-emerald-700 rounded text-sm flex items-center gap-2">
                <Hash className="h-3 w-3" />
                <span className="font-medium">{selectedTarget.name}</span>
                <span className="text-xs font-mono">
                  ({selectedTarget.slug})
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedTarget(null);
                    setTargetQuery('');
                  }}
                  className="ml-auto h-6 px-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground bg-amber-50 text-amber-800 p-2 rounded">
            ⚠ 合并后源标签将被软删+停用，不可恢复。
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              取消
            </Button>
            <Button onClick={submit} disabled={saving || !selectedTarget}>
              {saving ? '合并中…' : '确认合并'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
