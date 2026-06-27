'use client';

/**
 * T-021: 公司管理
 * 路径: /admin/companies
 * 功能: 公司列表 + 认证/取消认证 + 软删 + 恢复
 *
 * 设计要点 (T-021):
 * - 删除为软删（写 deletedAt/deletedBy/updatedBy）；新增 restore 按钮恢复
 * - "包含已删除"复选框切换 includeDeleted 参数
 * - 认证 chip 三态：已认证（emerald）/ 未认证（gray）/ 已删除（red opacity）
 * - 删除时间列仅 includeDeleted=true 时显示
 *
 * T-021 范围（用户确认）：
 * - 不含创建/编辑公司模态
 * - operator 角色不绑任何 company.*（仅 super_admin）
 */
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminCompanyApi, type AdminCompany } from '@/lib/api';
import { formatDateTime } from '@/lib/date';
import {
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { clsx } from 'clsx';

const VERIFIED_LABEL: Record<number, { text: string; cls: string }> = {
  1: {
    text: '已认证',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  0: {
    text: '未认证',
    cls: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  },
};

// T-021: 认证 chip 三态（含已删除）
function VerifiedChip({ c }: { c: AdminCompany }) {
  if (c.deletedAt) {
    return (
      <span
        className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 opacity-60"
        title={`删除时间: ${formatDateTime(c.deletedAt)}`}
      >
        已删除
      </span>
    );
  }
  const vc = VERIFIED_LABEL[c.verified] ?? VERIFIED_LABEL[0];
  return (
    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', vc.cls)}>
      {vc.text}
    </span>
  );
}

export default function AdminCompaniesPage() {
  const [list, setList] = useState<AdminCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 0 | 1>('all');
  // T-021: "包含已删除" 复选框（默认 false — admin 默认只看到未删）
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await adminCompanyApi.list({
        verified: verifiedFilter === 'all' ? undefined : verifiedFilter,
        page: 1,
        pageSize: 100,
        includeDeleted, // T-021
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
  }, [verifiedFilter, includeDeleted]);

  // 客户端搜索防抖（name 模糊；后端已对 name/industry/address 做服务端搜索）
  const filteredList = useMemo(() => {
    if (!q.trim()) return list;
    const kw = q.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(kw) ||
        (c.industry || '').toLowerCase().includes(kw) ||
        (c.address || '').toLowerCase().includes(kw),
    );
  }, [list, q]);

  /**
   * T-021: 软删
   * - 后端 service.remove 写 deletedAt/deletedBy/updatedBy
   * - UI 仅显示"软删"提示（不再"不可恢复"）
   */
  async function handleDelete(c: AdminCompany) {
    if (!confirm(`确认删除公司「${c.name}」？\n\n删除后可勾选"包含已删除"恢复。`)) return;
    try {
      await adminCompanyApi.remove(c.id);
      await load();
    } catch (e: any) {
      alert('删除失败：' + (e?.message || ''));
    }
  }

  /**
   * T-021: 恢复已软删公司
   * - 后端 service.restore 事务双写 update + AuditLog
   * - 恢复后保留原 verified 状态（Company 无 status 字段）
   */
  async function handleRestore(c: AdminCompany) {
    if (
      !confirm(
        `确认恢复公司「${c.name}」？\n\n恢复后该公司将重新出现在列表，认证状态将保留为软删前状态。`,
      )
    )
      return;
    try {
      await adminCompanyApi.restore(c.id);
      await load();
    } catch (e: any) {
      alert('恢复失败：' + (e?.message || ''));
    }
  }

  /**
   * T-021: 切换认证状态
   * - 已认证 (1) → 取消认证 (unverify)
   * - 未认证 (0) → 认证 (verify)
   */
  async function handleToggleVerify(c: AdminCompany) {
    if (c.deletedAt) {
      alert('已删除的公司无法修改认证状态，请先恢复');
      return;
    }
    const next = c.verified === 1 ? 0 : 1;
    const action = next === 1 ? '认证' : '取消认证';
    if (
      !confirm(
        `确认${action}公司「${c.name}」？\n${
          next === 0
            ? '取消认证后前台将不再展示该公司认证标识'
            : '认证后该公司将在前台展示认证标识'
        }`,
      )
    )
      return;
    try {
      if (next === 1) {
        await adminCompanyApi.verify(c.id);
      } else {
        await adminCompanyApi.unverify(c.id);
      }
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
            <Building2 className="h-6 w-6" /> 公司管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {total} 家公司 · 已认证公司将在前台展示认证标识（P0-006）
          </p>
        </div>
      </div>

      {/* 工具条 */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索公司名 / 行业 / 地址…"
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground mr-1">认证：</span>
            {[
              { v: 'all' as const, label: '全部' },
              { v: 1 as const, label: '已认证' },
              { v: 0 as const, label: '未认证' },
            ].map((opt) => (
              <button
                key={String(opt.v)}
                onClick={() => setVerifiedFilter(opt.v)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs transition-colors',
                  verifiedFilter === opt.v
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* T-021: 包含已删除 复选框 */}
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
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">
              {q.trim()
                ? `未找到包含「${q.trim()}」的公司`
                : includeDeleted
                ? '没有已删除的公司'
                : '还没有公司'}
            </p>
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
                    <th className="px-4 py-3 text-left font-medium">公司</th>
                    <th className="px-4 py-3 text-left font-medium">认证</th>
                    <th className="px-4 py-3 text-left font-medium">规模</th>
                    <th className="px-4 py-3 text-left font-medium">职位数</th>
                    <th className="px-4 py-3 text-left font-medium">创建人</th>
                    <th className="px-4 py-3 text-left font-medium">创建时间</th>
                    {/* T-021: 仅 includeDeleted=true 时显示 */}
                    {includeDeleted && (
                      <th className="px-4 py-3 text-left font-medium">删除时间</th>
                    )}
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((c) => (
                    <tr
                      key={c.id}
                      className={clsx(
                        'border-t border-border transition-colors',
                        c.deletedAt
                          ? 'opacity-60 bg-red-50/30 dark:bg-red-950/10'
                          : 'hover:bg-muted/30',
                      )}
                    >
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        #{c.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3 max-w-md">
                          {c.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.logo}
                              alt={c.name}
                              className="h-9 w-9 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium truncate">{c.name}</div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {c.industry || '—'}
                              {c.address ? ` · ${c.address}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <VerifiedChip c={c} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {c.scale || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {c._count?.jobs ?? 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {c.creator?.nickname || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(c.createdAt)}
                      </td>
                      {includeDeleted && (
                        <td className="px-4 py-3 text-xs text-red-600 dark:text-red-400 whitespace-nowrap">
                          {c.deletedAt ? formatDateTime(c.deletedAt) : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {c.deletedAt ? (
                            // T-021: 已删状态只显示"恢复"
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(c)}
                              title="恢复"
                              className="rounded-full h-8 px-2 text-emerald-600 hover:text-emerald-700"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <>
                              {/* T-021: 切换认证（已认证→取消认证 / 未认证→认证） */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleVerify(c)}
                                title={c.verified === 1 ? '取消认证' : '认证'}
                                className="rounded-full h-8 px-2"
                              >
                                {c.verified === 1 ? (
                                  <XCircle className="h-3.5 w-3.5 text-gray-600" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                )}
                              </Button>
                              {/* T-021: 软删除 */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(c)}
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
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}