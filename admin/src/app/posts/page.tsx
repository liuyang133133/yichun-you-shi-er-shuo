'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { Check, X, Eye, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_TABS = [
  { value: 'pending', label: '待审核' },
  { value: 'passed', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'active', label: '已发布' },
];

const TYPE_LABELS: Record<string, string> = {
  house: '房屋',
  secondhand: '二手',
  job: '招聘',
  lifebiz: '便民',
};

export default function AdminPostsPage() {
  const [tab, setTab] = useState('pending');
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<any>('/admin/posts', { params: { auditStatus: tab, page, pageSize: 20 } })
      .then((r) => {
        setList(r?.list || []);
        setTotal(r?.total || 0);
      })
      .catch(() => {
        setList([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [tab, page]);

  async function audit(postId: string, action: 'pass' | 'reject') {
    const reason = action === 'reject' ? prompt('拒绝理由：') : undefined;
    if (action === 'reject' && !reason) return;
    setActing(postId);
    try {
      await apiFetch(`/admin/posts/${postId}/audit`, {
        method: 'POST',
        body: { action, reason },
      });
      setList((l) => l.filter((p) => String(p.id) !== postId));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e: any) {
      alert('操作失败：' + (e?.message || ''));
    } finally {
      setActing(null);
    }
  }

  async function offline(postId: string) {
    const reason = prompt('下架理由：');
    if (!reason) return;
    setActing(postId);
    try {
      await apiFetch(`/admin/posts/${postId}/offline`, {
        method: 'POST',
        body: { reason },
      });
      setList((l) => l.filter((p) => String(p.id) !== postId));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e: any) {
      alert('操作失败：' + (e?.message || ''));
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">信息审核</h1>
        <p className="text-sm text-muted-foreground mt-1">管理用户发布的信息（{total} 条）</p>
      </div>

      {/* 状态 Tab */}
      <div className="flex gap-2 border-b">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setTab(t.value);
              setPage(1);
            }}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              tab === t.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中…</div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            暂无{STATUS_TABS.find((t) => t.value === tab)?.label}的信息
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                        {TYPE_LABELS[p.type] || p.type}
                      </span>
                      <h3 className="font-semibold truncate">{p.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {p.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>👤 {p.user?.nickname || p.user?.phone || '匿名'}</span>
                      <span>📍 {p.area?.name || '-'}</span>
                      <span>👁 {p.viewCount || 0}</span>
                      <span>⏰ {new Date(p.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                    {p.auditReason && (
                      <div className="mt-2 text-xs px-2 py-1 rounded bg-amber-50 text-amber-800">
                        审核备注：{p.auditReason}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <a
                      href={`http://localhost:3000/posts/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> 预览
                    </a>
                    {tab === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => audit(p.id, 'pass')}
                          disabled={acting === p.id}
                          className="h-7 text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" /> 通过
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => audit(p.id, 'reject')}
                          disabled={acting === p.id}
                          className="h-7 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" /> 拒绝
                        </Button>
                      </>
                    )}
                    {tab !== 'rejected' && tab !== 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => offline(p.id)}
                        disabled={acting === p.id}
                        className="h-7 text-xs"
                      >
                        下架
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page} 页 / 共 {Math.ceil(total / 20)} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * 20 >= total}
            onClick={() => setPage(p => p + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
