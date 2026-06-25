'use client';

/**
 * T-006: 后台登录日志查询
 * 路径: /admin/login-logs
 * 功能: 6 筛选 + 失败红色高亮 + 异常 IP 检测 + CSV 导出
 */
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/date';
import { Search, Download, Eye, LogIn, Filter as FilterIcon, X, Shield, ShieldOff, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

interface LoginLog {
  id: string;
  userId: string;
  userPhone: string;
  userNickname: string | null;
  userRole: string;
  userStatus: number;
  ip: string | null;
  userAgent: string | null;
  device: string | null;
  status: string;
  failReason: string | null;
  isFailed: boolean;
  createdAt: string;
}

interface OptionsData {
  statuses: Array<{ value: string; count: number }>;
}

export default function AdminLoginLogsPage() {
  const [list, setList] = useState<LoginLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState<OptionsData | null>(null);
  const [abnormalIps, setAbnormalIps] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<LoginLog | null>(null);

  const [filters, setFilters] = useState({
    userId: '',
    phone: '',
    ip: '',
    status: '',
    from: '',
    to: '',
  });

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: '20' };
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const r = await apiFetch<any>('/admin/login-logs', { params });
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
      const [opts, abnormal] = await Promise.all([
        apiFetch<OptionsData>('/admin/login-logs/options'),
        apiFetch<{ ips: string[] }>('/admin/login-logs/abnormal-ips'),
      ]);
      setOptions(opts);
      setAbnormalIps(new Set(abnormal.ips || []));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadOptions();
    // 每 60s 刷新异常 IP
    const timer = setInterval(loadOptions, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    load();
  }, [page]);

  function applyFilters() {
    setPage(1);
    load();
  }

  function resetFilters() {
    setFilters({ userId: '', phone: '', ip: '', status: '', from: '', to: '' });
    setPage(1);
    setTimeout(load, 0);
  }

  function exportCsv() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/admin/login-logs/export?${params.toString()}`;
    const token = localStorage.getItem('yichun_admin_token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `login-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
      })
      .catch(() => alert('导出失败'));
  }

  const failedCount = list.filter((l) => l.isFailed).length;

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LogIn className="h-6 w-6 text-primary" /> 登录日志
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {total} 条 · 当前页失败 {failedCount} 条 · 异常 IP {abnormalIps.size} 个
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1" /> 导出 CSV
        </Button>
      </div>

      {/* 异常 IP 提示 */}
      {abnormalIps.size > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-red-700">
              检测到 <strong>{abnormalIps.size}</strong> 个异常 IP（最近 1 小时失败 ≥ 5 次）：
            </span>
            <div className="flex flex-wrap gap-1">
              {Array.from(abnormalIps).slice(0, 5).map((ip) => (
                <code key={ip} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-mono">
                  {ip}
                </code>
              ))}
              {abnormalIps.size > 5 && <span className="text-xs text-red-600">+{abnormalIps.size - 5}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 筛选区 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">6 种筛选</span>
            {Object.values(filters).some(Boolean) && (
              <span className="text-xs text-primary">
                （{Object.values(filters).filter(Boolean).length} 项已应用）
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">用户 ID</label>
              <Input
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                placeholder="例如 1"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">手机号</label>
              <Input
                value={filters.phone}
                onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
                placeholder="138..."
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">IP</label>
              <Input
                value={filters.ip}
                onChange={(e) => setFilters({ ...filters, ip: e.target.value })}
                placeholder="127.0.0.1"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">状态</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-2 py-1.5 border rounded text-sm bg-background"
              >
                <option value="">全部</option>
                {(options?.statuses || []).map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.value} ({s.count})
                  </option>
                ))}
              </select>
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
                  <th className="text-left px-3 py-2.5 font-medium">用户</th>
                  <th className="text-left px-3 py-2.5 font-medium">IP</th>
                  <th className="text-left px-3 py-2.5 font-medium">状态</th>
                  <th className="text-left px-3 py-2.5 font-medium">失败原因</th>
                  <th className="text-left px-3 py-2.5 font-medium">设备</th>
                  <th className="text-left px-3 py-2.5 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((log) => {
                  const isAbnormal = log.ip && abnormalIps.has(log.ip);
                  return (
                    <tr
                      key={log.id}
                      className={clsx(
                        'border-t hover:bg-secondary/30',
                        log.isFailed && 'bg-red-50/50',
                        isAbnormal && 'ring-1 ring-red-300 ring-inset',
                      )}
                    >
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      <td className="px-3 py-2.5 text-xs">
                        <div>{log.userPhone}</div>
                        {log.userNickname && (
                          <div className="text-muted-foreground text-[10px]">{log.userNickname}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono">
                        {log.ip || '-'}
                        {isAbnormal && (
                          <AlertTriangle className="inline h-3 w-3 ml-1 text-red-600" />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {log.isFailed ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">
                            <ShieldOff className="h-3 w-3" /> 失败
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700">
                            <Shield className="h-3 w-3" /> 成功
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-red-600 max-w-xs truncate" title={log.failReason || ''}>
                        {log.failReason || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {log.device || '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        <Button size="sm" variant="ghost" onClick={() => setDetail(log)} className="h-7 text-xs">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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

      {detail && <DetailDrawer log={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function DetailDrawer({ log, onClose }: { log: LoginLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl bg-card shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">登录日志详情 #{log.id}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
          <DetailRow label="时间" value={formatDateTime(log.createdAt)} />
          <DetailRow label="用户" value={`${log.userPhone} (${log.userNickname || '-'}) · ID=${log.userId}`} />
          <DetailRow label="用户角色" value={log.userRole} />
          <DetailRow
            label="用户状态"
            value={log.userStatus === 0 ? '正常' : '已封禁'}
            danger={log.userStatus !== 0}
          />
          <DetailRow label="IP" value={log.ip || '-'} mono />
          <DetailRow label="User-Agent" value={log.userAgent || '-'} mono />
          <DetailRow label="设备" value={log.device || '-'} />
          <DetailRow
            label="登录状态"
            value={log.isFailed ? '失败' : '成功'}
            danger={log.isFailed}
          />
          {log.failReason && (
            <DetailRow label="失败原因" value={log.failReason} danger />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono, danger }: { label: string; value: string; mono?: boolean; danger?: boolean }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={clsx(
          'text-sm',
          mono && 'font-mono text-xs',
          danger && 'text-red-600 font-medium',
        )}
      >
        {value}
      </div>
    </div>
  );
}