'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { Check, X, Eye } from 'lucide-react';
import { clsx } from 'clsx';

const REASON_LABELS: Record<string, string> = {
  spam: '垃圾广告',
  fake: '虚假信息',
  illegal: '违法违规',
  duplicate: '重复发布',
  other: '其他',
};

export default function AdminReportsPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'handled' | 'ignored' | ''>('');

  useEffect(() => {
    setLoading(true);
    const params: any = { pageSize: 50 };
    if (filter) params.status = filter;
    apiFetch<any>('/admin/reports', { params })
      .then((r) => setList(r?.list || r || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [filter]);

  async function handle(reportId: string, action: 'ignore' | 'handle') {
    setActing(reportId);
    try {
      await apiFetch(`/admin/reports/${reportId}/handle`, {
        method: 'POST',
        body: { action },
      });
      setList((l) => l.filter((r) => String(r.id) !== reportId));
    } catch (e: any) {
      alert('操作失败：' + (e?.message || ''));
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">举报处理</h1>
          <p className="text-sm text-muted-foreground mt-1">处理用户提交的举报</p>
        </div>
        <div className="flex gap-2">
          {[
            { v: '', l: '全部' },
            { v: 'pending', l: '待处理' },
            { v: 'handled', l: '已处理' },
            { v: 'ignored', l: '已忽略' },
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => setFilter(t.v as any)}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md border',
                filter === t.v ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-secondary',
              )}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中…</div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">暂无举报</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded text-xs',
                          r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-secondary text-muted-foreground',
                        )}
                      >
                        {r.status === 'pending' ? '待处理' : r.status === 'handled' ? '已处理' : '已忽略'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        原因：{REASON_LABELS[r.reason] || r.reason}
                      </span>
                    </div>
                    {r.description && (
                      <p className="text-sm text-foreground/90 mb-2">{r.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>👤 举报人：{r.user?.nickname || r.user?.phone || '-'}</span>
                      <span>⏰ {new Date(r.createdAt).toLocaleString('zh-CN')}</span>
                      {r.postId && (
                        <a
                          href={`http://localhost:3000/posts/${r.postId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> 查看被举报信息
                        </a>
                      )}
                    </div>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handle(r.id, 'handle')}
                        disabled={acting === r.id}
                      >
                        <Check className="h-3 w-3 mr-1" /> 已处理
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handle(r.id, 'ignore')}
                        disabled={acting === r.id}
                      >
                        <X className="h-3 w-3 mr-1" /> 忽略
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
