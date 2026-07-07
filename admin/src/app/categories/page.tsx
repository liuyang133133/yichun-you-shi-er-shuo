'use client';

/**
 * 分类管理 (T-P15-02b + P0 Bug Fix)
 * 路径: /admin/categories
 * 功能: 分类树 (顶级 + 子嵌套) + 创建 + 编辑 + 删除 + 启停切换 + SEO TDK
 *
 * 后端: /admin/categories (CRUD) + /admin/categories/tree (树形)
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminCategoryApi, type AdminCategory } from '@/lib/api';
import {
  Plus,
  Edit2,
  Trash2,
  FolderTree,
  ChevronRight,
  ChevronDown,
  Power,
  PowerOff,
  X,
  Search,
} from 'lucide-react';
import { clsx } from 'clsx';

interface CategoryNode extends AdminCategory {
  children: CategoryNode[];
}

export default function AdminCategoriesPage() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [flat, setFlat] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [codeFilter, setCodeFilter] = useState<string>('');

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [t, f] = await Promise.all([
        adminCategoryApi.tree(codeFilter ? { code: codeFilter } : {}),
        adminCategoryApi.list(codeFilter ? { code: codeFilter } : {}),
      ]);
      setTree((t as CategoryNode[]) || []);
      setFlat(f || []);
    } catch {
      setTree([]);
      setFlat([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFilter]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      // 仅触发 client 过滤 (树已经载入)
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  // 客户端过滤树
  const filteredTree = useMemo(() => {
    if (!q.trim()) return tree;
    const lower = q.trim().toLowerCase();
    const match = (n: CategoryNode): CategoryNode | null => {
      const hitSelf =
        n.name.toLowerCase().includes(lower) ||
        (n.code || '').toLowerCase().includes(lower) ||
        (n.slug || '').toLowerCase().includes(lower);
      const kids = (n.children || [])
        .map(match)
        .filter((c): c is CategoryNode => !!c);
      if (hitSelf || kids.length > 0) {
        return { ...n, children: kids };
      }
      return null;
    };
    return tree.map(match).filter((n): n is CategoryNode => !!n);
  }, [tree, q]);

  // 统计
  const totalTop = tree.length;
  const totalSub = tree.reduce(
    (acc, n) => acc + (n.children?.length || 0),
    0,
  );

  async function handleDelete(cat: AdminCategory) {
    if (
      !confirm(
        `确认删除分类「${cat.name}」？\n后端会校验是否仍有子分类/帖子。`,
      )
    )
      return;
    try {
      await adminCategoryApi.remove(cat.id);
      await load();
    } catch (e: any) {
      alert('删除失败：' + (e?.message || ''));
    }
  }

  async function handleToggleStatus(cat: AdminCategory) {
    const next = cat.status === 1 ? 0 : 1;
    const action = next === 1 ? '启用' : '停用';
    if (
      !confirm(
        `确认${action}分类「${cat.name}」？${
          next === 0 ? '\n停用后前端 /c/[code] 列表将不再展示此分类' : ''
        }`,
      )
    )
      return;
    try {
      await adminCategoryApi.update(cat.id, { status: next });
      await load();
    } catch (e: any) {
      alert(`${action}失败：${e?.message || ''}`);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderTree className="h-6 w-6" /> 分类管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {totalTop} 个顶级 / {totalSub} 个子分类 (T-P15-02 SEO TDK 已接入)
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> 新建分类
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
              placeholder="搜索分类名 / code / slug…"
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">按顶级过滤:</span>
            <select
              value={codeFilter}
              onChange={(e) => setCodeFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">全部</option>
              <option value="house">house 房屋出租</option>
              <option value="secondhand">secondhand 二手交易</option>
              <option value="job">job 招聘求职</option>
              <option value="lifebiz">lifebiz 便民信息</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中…</div>
      ) : filteredTree.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            {q ? '未搜索到匹配分类' : '暂无分类，请新建'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">名称</th>
                  <th className="text-left px-4 py-2.5 font-medium">Code</th>
                  <th className="text-left px-4 py-2.5 font-medium">Slug</th>
                  <th className="text-left px-4 py-2.5 font-medium">SEO Title</th>
                  <th className="text-right px-4 py-2.5 font-medium">排序</th>
                  <th className="text-center px-4 py-2.5 font-medium">状态</th>
                  <th className="text-left px-4 py-2.5 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredTree.map((top) => (
                  <CategoryRows
                    key={top.id}
                    node={top}
                    depth={0}
                    onEdit={setEditing}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(creating || editing) && (
        <CategoryFormModal
          category={editing}
          flat={flat}
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
    </div>
  );
}

/* ---------- 递归渲染分类树 ---------- */
function CategoryRows({
  node,
  depth,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  node: CategoryNode;
  depth: number;
  onEdit: (c: AdminCategory) => void;
  onDelete: (c: AdminCategory) => void;
  onToggleStatus: (c: AdminCategory) => void;
}) {
  const [open, setOpen] = useState(depth < 1); // 顶级默认展开
  const hasChildren = (node.children || []).length > 0;
  const isTop = depth === 0;

  return (
    <>
      <tr className="border-t hover:bg-secondary/30">
        <td className="px-4 py-3">
          <div
            className="flex items-center gap-1.5"
            style={{ paddingLeft: depth * 20 }}
          >
            {hasChildren ? (
              <button
                onClick={() => setOpen(!open)}
                className="p-0.5 hover:bg-secondary rounded"
                type="button"
              >
                {open ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            {isTop && (
              <span className="text-xs text-muted-foreground font-mono mr-1">
                ▶
              </span>
            )}
            <span
              className={clsx(
                'font-medium',
                isTop && 'text-base',
                node.status === 0 && 'text-muted-foreground',
              )}
            >
              {node.name}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 font-mono text-xs">
          {node.code || <span className="text-muted-foreground">-</span>}
        </td>
        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
          {node.slug || '-'}
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
          {node.seoTitle || '-'}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">
          {node.sortOrder}
        </td>
        <td className="px-4 py-3 text-center">
          <StatusChip status={node.status} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(node)}
              className="h-7 text-xs"
              title="编辑"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleStatus(node)}
              className="h-7 text-xs"
              title={node.status === 1 ? '停用' : '启用'}
            >
              {node.status === 1 ? (
                <PowerOff className="h-3 w-3 text-gray-500" />
              ) : (
                <Power className="h-3 w-3 text-emerald-600" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(node)}
              className="h-7 text-xs text-destructive hover:text-destructive"
              title="删除"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
      {open &&
        (node.children || []).map((child) => (
          <CategoryRows
            key={child.id}
            node={child as CategoryNode}
            depth={depth + 1}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
          />
        ))}
    </>
  );
}

/* ---------- 状态 chip ---------- */
function StatusChip({ status }: { status: number }) {
  if (status === 0) {
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

/* ---------- 创建 / 编辑分类 ---------- */
function CategoryFormModal({
  category,
  flat,
  onClose,
  onSaved,
}: {
  category: AdminCategory | null;
  flat: AdminCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!category;
  const isTopInit = !category || category.parentId === null;

  const [parentId, setParentId] = useState<string>(
    category?.parentId ? String(category.parentId) : '',
  );
  const [code, setCode] = useState<string>(category?.code || '');
  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon || '');
  const [sortOrder, setSortOrder] = useState<number>(category?.sortOrder ?? 0);
  const [status, setStatus] = useState<number>(category?.status ?? 1);
  const [slug, setSlug] = useState(category?.slug || '');
  const [seoTitle, setSeoTitle] = useState(category?.seoTitle || '');
  const [seoKeywords, setSeoKeywords] = useState(category?.seoKeywords || '');
  const [seoDescription, setSeoDescription] = useState(
    category?.seoDescription || '',
  );
  const [saving, setSaving] = useState(false);

  const isTop = !parentId; // parentId 为空 = 顶级

  // 候选 parent 下拉 — 仅顶级分类 (parentId === null)
  const topCandidates = useMemo(
    () =>
      flat
        .filter((c) => c.parentId === null && c.id !== category?.id)
        .sort(
          (a, b) =>
            (a.code || '').localeCompare(b.code || '') ||
            a.sortOrder - b.sortOrder,
        ),
    [flat, category?.id],
  );

  async function submit() {
    if (!name.trim()) {
      alert('名称必填');
      return;
    }
    if (isTop && !code.trim()) {
      alert('顶级分类 code 必填 (house/secondhand/job/lifebiz)');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        name,
        icon: icon || undefined,
        sortOrder,
        status,
        slug: slug || undefined,
        seoTitle: seoTitle || undefined,
        seoKeywords: seoKeywords || undefined,
        seoDescription: seoDescription || undefined,
      };

      if (isTop) {
        body.code = code;
        body.parentId = null;
      } else {
        // 子分类 — 不传 code, 由后端忽略 (Drizzle 必填, 但 service.create 用 ...data 透传)
        body.parentId = Number(parentId);
      }

      if (isEdit) {
        await adminCategoryApi.update(category!.id, body);
      } else {
        if (isTop) {
          await adminCategoryApi.create(body);
        } else {
          // 子分类: 不传 code (后端 DTO 必填会校验) — 但 category.service 不再要求
          // 检查 service.create: 没有 code 校验, 只检查 parentId/name 唯一 → 可不带 code
          await adminCategoryApi.create(body);
        }
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
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              {isEdit ? '编辑分类' : '新建分类'}
            </h2>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 顶级 vs 子分类 切换 */}
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={isTop}
                onChange={() => setParentId('')}
                disabled={isEdit && !isTopInit}
              />
              <span>顶级分类</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={!isTop}
                onChange={() => {
                  if (topCandidates.length > 0) {
                    setParentId(String(topCandidates[0].id));
                  }
                }}
                disabled={isEdit && isTopInit || topCandidates.length === 0}
              />
              <span>子分类</span>
            </label>
            {isEdit && (
              <span className="text-xs text-muted-foreground ml-2">
                (编辑时不可切换层级)
              </span>
            )}
          </div>

          {/* parent 选择 — 子分类才显示 */}
          {!isTop && (
            <div>
              <label className="text-sm text-muted-foreground">
                所属顶级分类 *
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                disabled={isEdit}
              >
                {topCandidates.length === 0 && (
                  <option value="">暂无顶级分类可选</option>
                )}
                {topCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* code — 顶级分类才显示 */}
          {isTop && (
            <div>
              <label className="text-sm text-muted-foreground">
                Code * (顶级唯一标识，不可改)
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="house / secondhand / job / lifebiz"
                disabled={isEdit}
                className="mt-1 font-mono"
              />
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground">名称 *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 整租 / 合租 / 二手房"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Icon (可选，URL 或 emoji)
            </label>
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="🏠 或 https://..."
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">
                排序 (数字小=靠前)
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

          {/* SEO TDK */}
          <div className="pt-2 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              SEO TDK (T-P15-02 V2 落地页用)
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">
                  Slug (URL 别名)
                </label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="例如: zufang-zhengzu"
                  disabled={isEdit}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  SEO Title
                </label>
                <Input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="伊春整租房屋出租 - 有事儿说"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  SEO Keywords (逗号分隔)
                </label>
                <Input
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  placeholder="伊春租房, 整租, 房屋出租"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  SEO Description
                </label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="伊春本地整租房源信息..."
                  rows={3}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
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