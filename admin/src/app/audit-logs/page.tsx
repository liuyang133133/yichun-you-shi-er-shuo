'use client';

/**
 * T-005: 后台操作日志查询
 * 路径: /admin/audit-logs
 * 功能: 7 种筛选 + 详情抽屉 + CSV 导出
 */
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/date';
import { Search, Download, Eye, FileText, Filter as FilterIcon, X } from 'lucide-react';
import { clsx } from 'clsx';

interface AuditLog {
  id: string;
  adminUserId: string;
  adminPhone: string;
  adminNickname: string | null;
  module: string;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  metadata: any;
  beforeSnapshot: any;
  afterSnapshot: any;
  requestId: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface OptionsData {
  modules: Array<{ value: string; count: number }>;
  actions: Array<{ value: string; count: number }>;
  targetTypes: Array<{ value: string; count: number }>;
}

export default function AdminAuditLogsPage() {
  const [list, setList] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState<OptionsData | null>(null);
  const [detail, setDetail] = useState<AuditLog | null>(null);

  // 7 筛选条件
  const [filters, setFilters] = useState({
    module: '',
    action: '',
    adminUserId: '',
    targetType: '',
    targetId: '',
    from: '',
    to: '',
  });

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: '20',
      };
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const r = await apiFetch<any>('/admin/audit-logs', { params });
      setList(r?.list || []);
      setTotal(r?.total || 0);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadOptions() {
    try {
      const r = await apiFetch<OptionsData>('/admin/audit-logs/options');
      setOptions(r);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    load();
  }, [page]);

  function applyFilters() {
    setPage(1);
    load();
  }

  function resetFilters() {
    setFilters({
      module: '', action: '', adminUserId: '', targetType: '',
      targetId: '', from: '', to: '',
    });
    setPage(1);
    setTimeout(load, 0);
  }

  function exportCsv() {
    // 直接通过浏览器下载（带 token）
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/admin/audit-logs/export?${params.toString()}`;
    const token = localStorage.getItem('yichun_admin_token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
      })
      .catch(() => alert('导出失败'));
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> 操作日志
          </h1>
          <p className="text-sm text-muted-foreground mt-1">共 {total} 条记录（T-005: 含 diff / ip / userAgent / requestId）</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1" /> 导出 CSV
        </Button>
      </div>

      {/* 筛选区 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">7 种筛选</span>
            {(Object.values(filters).some(Boolean)) && (
              <span className="text-xs text-primary">（{Object.values(filters).filter(Boolean).length} 项已应用）</span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">模块</label>
              <select
                value={filters.module}
                onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                className="w-full px-2 py-1.5 border rounded text-sm bg-background"
              >
                <option value="">全部</option>
                {(options?.modules || []).map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.value} ({m.count})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">动作</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full px-2 py-1.5 border rounded text-sm bg-background"
              >
                <option value="">全部</option>
                {(options?.actions || []).map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.value} ({a.count})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">管理员 ID</label>
              <Input
                value={filters.adminUserId}
                onChange={(e) => setFilters({ ...filters, adminUserId: e.target.value })}
                placeholder="例如 1"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">目标类型</label>
              <select
                value={filters.targetType}
                onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
                className="w-full px-2 py-1.5 border rounded text-sm bg-background"
              >
                <option value="">全部</option>
                {(options?.targetTypes || []).map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.value} ({t.count})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">目标 ID</label>
              <Input
                value={filters.targetId}
                onChange={(e) => setFilters({ ...filters, targetId: e.target.value })}
                placeholder="例如 123"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">起始时间</label>
              <Input
                type="datetime-local"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">截止时间</label>
              <Input
                type="datetime-local"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={applyFilters}>
              <Search className="h-3 w-3 mr-1" /> 应用筛选
            </Button>
            <Button size="sm" variant="ghost" onClick={resetFilters}>
              <X className="h-3 w-3 mr-1" /> 重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中…</div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">暂无记录</CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium">时间</th>
                  <th className="text-left px-3 py-2.5 font-medium">管理员</th>
                  <th className="text-left px-3 py-2.5 font-medium">模块</th>
                  <th className="text-left px-3 py-2.5 font-medium">动作</th>
                  <th className="text-left px-3 py-2.5 font-medium">目标</th>
                  <th className="text-left px-3 py-2.5 font-medium">IP</th>
                  <th className="text-left px-3 py-2.5 font-medium">理由</th>
                  <th className="text-left px-3 py-2.5 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-secondary/30">
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <div>{log.adminPhone}</div>
                      {log.adminNickname && (
                        <div className="text-muted-foreground text-[10px]">{log.adminNickname}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{log.action}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <div className="text-muted-foreground">{log.targetType}</div>
                      {log.targetId && <div className="font-mono">#{log.targetId}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">
                      {log.ip || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-xs max-w-xs truncate" title={log.reason || ''}>
                      {log.reason || '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      <Button size="sm" variant="ghost" onClick={() => setDetail(log)} className="h-7 text-xs">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 分页 */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page} 页 / 共 {Math.ceil(total / 20)} 页
          </span>
          <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>
            下一页
          </Button>
        </div>
      )}

      {/* 详情抽屉 */}
      {detail && <DetailDrawer log={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

/* ---------- 详情抽屉 ---------- */
function DetailDrawer({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl bg-card shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">操作日志详情 #{log.id}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
          <DetailRow label="时间" value={formatDateTime(log.createdAt)} />
          <DetailRow label="管理员" value={`${log.adminPhone} (${log.adminNickname || '-'}) · ID=${log.adminUserId}`} />
          <DetailRow label="模块" value={log.module} />
          <DetailRow label="动作" value={log.action} mono />
          <DetailRow label="目标" value={`${log.targetType}${log.targetId ? ' #' + log.targetId : ''}`} />
          <DetailRow label="IP" value={log.ip || '-'} mono />
          <DetailRow label="User-Agent" value={log.userAgent || '-'} mono />
          <DetailRow label="Request ID" value={log.requestId || '-'} mono />
          <DetailRow label="理由" value={log.reason || '-'} />

          {log.metadata && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Metadata</div>
              <pre className="bg-secondary/30 p-2 rounded text-xs overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}

          {log.beforeSnapshot && (
            <div>
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                Before Snapshot
                <span className="text-[10px] text-amber-600">(变更前)</span>
              </div>
              <pre className="bg-amber-50 p-2 rounded text-xs overflow-x-auto border border-amber-200">
                {JSON.stringify(log.beforeSnapshot, null, 2)}
              </pre>
            </div>
          )}

          {log.afterSnapshot && (
            <div>
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                After Snapshot
                <span className="text-[10px] text-emerald-600">(变更后)</span>
              </div>
              <pre className="bg-emerald-50 p-2 rounded text-xs overflow-x-auto border border-emerald-200">
                {JSON.stringify(log.afterSnapshot, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={clsx('text-sm', mono && 'font-mono text-xs')}>{value}</div>
    </div>
  );
}