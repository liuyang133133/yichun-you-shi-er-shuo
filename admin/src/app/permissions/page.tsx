'use client';

/**
 * T-004: 权限管理（只读视图）
 * 路径: /admin/permissions
 * 功能: 按模块分组展示所有权限码（不可编辑）
 *       权限分配请前往「角色管理 → 权限」抽屉
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { Search, KeyRound } from 'lucide-react';

interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  action: string;
  description?: string | null;
}

export default function AdminPermissionsPage() {
  const [all, setAll] = useState<Permission[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<any>('/admin/permissions', { params: { pageSize: 200 } })
      .then((r) => setAll(r?.list || []))
      .catch(() => setAll([]))
      .finally(() => setLoading(false));
  }, []);

  // 按 module 分组
  const grouped = useMemo(() => {
    const filtered = keyword
      ? all.filter(
          (p) =>
            p.code.toLowerCase().includes(keyword.toLowerCase()) ||
            p.name.includes(keyword) ||
            p.module.toLowerCase().includes(keyword.toLowerCase()),
        )
      : all;
    const map: Record<string, Permission[]> = {};
    for (const p of filtered) {
      (map[p.module] ||= []).push(p);
    }
    // 按 module 名字排序
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [all, keyword]);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">权限管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {all.length} 个权限码，按 {grouped.length} 个模块分组（只读视图）
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索 code / name / module"
            className="pl-10 w-72"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {grouped.map(([moduleName, perms]) => (
            <Card key={moduleName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  {moduleName}
                  <span className="text-xs text-muted-foreground font-normal">({perms.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {perms.map((p) => (
                  <div key={p.code} className="flex items-start gap-3 p-2 rounded hover:bg-secondary/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                          {p.code}
                        </span>
                        <span className="text-sm">{p.name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        action: {p.action}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && grouped.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">没有匹配的权限码</CardContent>
        </Card>
      )}
    </div>
  );
}