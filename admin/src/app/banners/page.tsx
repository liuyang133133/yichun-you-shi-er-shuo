'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { Trash2, Plus, ImageIcon, ExternalLink } from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkType: 'url' | 'post' | 'category' | 'search';
  linkTarget: string;
  position: 'home_top' | 'home_mid' | 'list_top';
  sortOrder: number;
  status: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

const POSITIONS = [
  { value: 'home_top', label: '首页头部' },
  { value: 'home_mid', label: '首页中部' },
  { value: 'list_top', label: '列表页头部' },
];

const LINK_TYPES = [
  { value: 'url', label: '外链 URL' },
  { value: 'search', label: '站内搜索词' },
  { value: 'category', label: '分类（填 house/secondhand/job/lifebiz）' },
  { value: 'post', label: '帖子 ID' },
];

export default function AdminBannersPage() {
  const [list, setList] = useState<Banner[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    imageUrl: '',
    linkType: 'url',
    linkTarget: '',
    position: 'home_top',
    sortOrder: 0,
  });

  function load() {
    setLoading(true);
    apiFetch<any>('/admin/banners', { params: { page: 1, pageSize: 50 } })
      .then((r) => {
        setList(r?.list || []);
        setTotal(r?.total || 0);
      })
      .catch(() => {
        setList([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.imageUrl.trim()) {
      setError('标题和图片 URL 必填');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/admin/banners', { method: 'POST', body: form });
      setShowCreate(false);
      setForm({ title: '', imageUrl: '', linkType: 'url', linkTarget: '', position: 'home_top', sortOrder: 0 });
      load();
    } catch (e: any) {
      setError(e?.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('确定删除该 Banner？')) return;
    try {
      await apiFetch(`/admin/banners/${id}`, { method: 'DELETE' });
      load();
    } catch (e: any) {
      alert('删除失败：' + (e?.message || ''));
    }
  }

  async function toggleStatus(b: Banner) {
    const newStatus = b.status === 1 ? 0 : 1;
    try {
      await apiFetch(`/admin/banners/${b.id}`, { method: 'PATCH', body: { status: newStatus } });
      load();
    } catch (e: any) {
      alert('切换失败：' + (e?.message || ''));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Banner 运营位</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理首页 / 列表页 banner · 共 <span className="font-bold text-foreground">{total}</span> 个
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="rounded-full">
          <Plus className="mr-1 h-4 w-4" /> 新建 Banner
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-2.5">
          ⚠ {error}
        </div>
      )}

      {/* 新建表单 */}
      {showCreate && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={create} className="space-y-4">
              <h2 className="font-semibold text-lg">新建 Banner</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">标题 *</label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="如：本月最热房源 TOP10" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">图片 URL *</label>
                  <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://... 或 http://localhost:3001/uploads/..." />
                  <p className="text-xs text-muted-foreground">建议尺寸 16:5（如 1280x400），先用 /upload/image 上传</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">点击跳转类型</label>
                  <select value={form.linkType} onChange={(e) => setForm({ ...form, linkType: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {LINK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">跳转目标</label>
                  <Input value={form.linkTarget} onChange={(e) => setForm({ ...form, linkTarget: e.target.value })} placeholder={
                    form.linkType === 'url' ? 'https://...' :
                    form.linkType === 'search' ? '搜索关键词' :
                    form.linkType === 'category' ? 'house / secondhand / job / lifebiz' :
                    '帖子 ID'
                  } />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">位置</label>
                  <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">排序（数字小=排前）</label>
                  <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
                <Button type="submit" disabled={submitting}>{submitting ? '创建中…' : '创建'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">还没有 Banner</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 h-4 w-4" /> 新建第一个
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt={b.title} className="h-16 w-32 object-cover rounded-lg ring-1 ring-border" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{b.title}</span>
                      {b.status === 0 && (
                        <span className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">已停用</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>📍 {POSITIONS.find((p) => p.value === b.position)?.label}</span>
                      <span>🔗 {LINK_TYPES.find((t) => t.value === b.linkType)?.label}：{b.linkTarget || '—'}</span>
                      <span>#️⃣ {b.sortOrder}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => toggleStatus(b)} className="rounded-full">
                      {b.status === 1 ? '停用' : '启用'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => remove(b.id)} className="rounded-full text-destructive border-destructive/30">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        💡 提示：Banner 图可先到 <code className="px-1 bg-secondary rounded">/upload/image</code> 上传，拿到 URL 后填到这里。
        商用后这里就是金主 banner 投放入口。
      </p>
    </div>
  );
}