'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';

export default function AdminCompaniesPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<any>('/companies', { params: { pageSize: 50 } })
      .then((r) => setList(r?.list || r || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">公司管理</h1>
        <p className="text-sm text-muted-foreground mt-1">查看 / 审核公司入驻信息</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中…</div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">暂无公司</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{c.name}</h3>
                  {c.verified === 1 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">已认证</span>
                  )}
                </div>
                {c.industry && <div className="text-sm text-muted-foreground">行业：{c.industry}</div>}
                {c.scale && <div className="text-sm text-muted-foreground">规模：{c.scale}</div>}
                {c.address && <div className="text-xs text-muted-foreground">{c.address}</div>}
                {c.description && <p className="text-sm line-clamp-2">{c.description}</p>}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  创建：{new Date(c.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
