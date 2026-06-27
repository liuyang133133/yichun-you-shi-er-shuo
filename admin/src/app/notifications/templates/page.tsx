'use client';

/**
 * T-009: 通知模板管理
 * 路径: /admin/notifications/templates
 * 功能: 模板 CRUD + 启用/停用 + 预览（变量替换）
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/date';
import {
  Plus, Edit2, Trash2, FileText, Power, PowerOff, Send, Eye, Search, Filter,
} from 'lucide-react';
import { clsx } from 'clsx';

interface Template {
  id: string;
  event: string;
  channel: string;
  key: string;
  title: string;
  body: string;
  variables: any;
  enabled: boolean;
  priority: number;
  createdAt: string;
  deletedAt: string | null;
}

const EVENT_LABELS: Record<string, { label: string; emoji: string }> = {
  comment: { label: '评论', emoji: '💬' },
  audit: { label: '审核', emoji: '✅' },
  order: { label: '订单', emoji: '🛒' },
  auth: { label: '认证', emoji: '🔐' },
  system: { label: '系统', emoji: '📢' },
  appeal: { label: '申诉', emoji: '⚖️' },
  follow: { label: '关注', emoji: '👥' },
  invite: { label: '邀请', emoji: '🎁' },
};

export default function AdminNotificationTemplatesPage() {
  const [list, setList] = useState<Template[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState<Template | null>(null);

  const [filterEvent, setFilterEvent] = useState('');
  const [filterEnabled, setFilterEnabled] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch<any>('/admin/notifications/templates', {
        params: {
          event: filterEvent || undefined,
          enabled: filterEnabled || undefined,
          pageSize: 100,
        },
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
  }, [filterEvent, filterEnabled]);

  const filteredList = search
    ? list.filter((t) =>
        t.title.includes(search) ||
        t.body.includes(search) ||
        t.key.includes(search),
      )
    : list;

  async function handleToggle(t: Template) {
    try {
      await apiFetch(`/admin/notifications/templates/${t.id}/toggle`, { method: 'POST' });
      await load();
    } catch (e: any) {
      alert('操作失败：' + (e?.message || ''));
    }
  }

  async function handleDelete(t: Template) {
    if (!confirm(`确认删除模板「${t.title}」？`)) return;
    try {
      await apiFetch(`/admin/notifications/templates/${t.id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      alert('删除失败：' + (e?.message || ''));
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> 通知模板
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {total} 个模板（T-009 seed 预置 8 个，含 4 类事件 4 类通知）
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/notifications/broadcast">
            <Button variant="outline">
              <Send className="h-4 w-4 mr-1" /> 群发通知
            </Button>
          </Link>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" /> 新建模板
          </Button>
        </div>
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="p-4 flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="px-2 py-1.5 border rounded text-sm bg-background"
          >
            <option value="">全部事件</option>
            {Object.entries(EVENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
          </select>
          <select
            value={filterEnabled}
            onChange={(e) => setFilterEnabled(e.target.value)}
            className="px-2 py-1.5 border rounded text-sm bg-background"
          >
            <option value="">全部状态</option>
            <option value="true">启用</option>
            <option value="false">停用</option>
          </select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标题/正文/key"
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中…</div>
      ) : filteredList.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">暂无模板</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredList.map((t) => {
            const event = EVENT_LABELS[t.event] || { label: t.event, emoji: '📌' };
            return (
              <Card key={t.id} className={clsx(!t.enabled && 'opacity-50')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-xl shrink-0">
                      {event.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm truncate">{t.title}</span>
                        <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-secondary rounded">
                          {event.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          key: {t.key}
                        </span>
                        <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 border rounded">
                          {t.channel}
                        </span>
                        {t.priority >= 4 && (
                          <span className="text-[10px] text-red-600 px-1.5 py-0.5 bg-red-50 rounded">
                            紧急 P{t.priority}
                          </span>
                        )}
                        {t.deletedAt && (
                          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-gray-100 rounded">
                            已删除
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{t.body}</p>
                      <p className="text-[10px] text-muted-foreground/70">
                        创建：{formatDateTime(t.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewing(t)}
                        className="h-7 text-xs"
                        title="预览"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggle(t)}
                        className="h-7 text-xs"
                        title={t.enabled ? '停用' : '启用'}
                      >
                        {t.enabled ? (
                          <Power className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <PowerOff className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(t)}
                        className="h-7 text-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {!t.deletedAt && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(t)}
                          className="h-7 text-xs text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <TemplateFormModal
          template={editing}
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

      {previewing && (
        <PreviewModal template={previewing} onClose={() => setPreviewing(null)} />
      )}
    </div>
  );
}

/* ---------- 模板编辑模态 ---------- */
function TemplateFormModal({
  template, onClose, onSaved,
}: {
  template: Template | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [event, setEvent] = useState(template?.event || 'system');
  const [key, setKey] = useState(template?.key || '');
  const [channel, setChannel] = useState(template?.channel || 'site');
  const [title, setTitle] = useState(template?.title || '');
  const [body, setBody] = useState(template?.body || '');
  const [priority, setPriority] = useState(template?.priority ?? 3);
  const [enabled, setEnabled] = useState(template?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!key.trim() || !title.trim() || !body.trim()) {
      alert('key / 标题 / 正文必填');
      return;
    }
    setSaving(true);
    try {
      if (template) {
        await apiFetch(`/admin/notifications/templates/${template.id}`, {
          method: 'PATCH',
          body: { title, body, priority, enabled },
        });
      } else {
        await apiFetch('/admin/notifications/templates', {
          method: 'POST',
          body: { event, channel, key, title, body, priority, enabled },
        });
      }
      await onSaved();
    } catch (e: any) {
      alert('保存失败：' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" /> {template ? '编辑模板' : '新建模板'}
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">事件</label>
              <select
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                disabled={!!template}
                className="w-full px-2 py-1.5 border rounded text-sm bg-background mt-1"
              >
                {Object.entries(EVENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.emoji} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">渠道</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                disabled={!!template}
                className="w-full px-2 py-1.5 border rounded text-sm bg-background mt-1"
              >
                <option value="site">site（站内信）</option>
                <option value="email">email</option>
                <option value="sms">sms</option>
                <option value="push">push</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Key（不可改）</label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="例如: comment_received"
              disabled={!!template}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">标题（用 {'{{varName}}'} 插入变量）</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如: 你收到新评论"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">正文</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="例如: {{authorName}} 评论了你的帖子「{{postTitle}}」"
              className="mt-1 w-full px-3 py-2 border rounded text-sm bg-background min-h-[100px] resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">优先级（1-5，5 最高）</label>
              <Input
                type="number"
                min={1}
                max={5}
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10) || 1)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded"
                />
                启用
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>取消</Button>
            <Button onClick={submit} disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- 预览模态（变量替换）---------- */
function PreviewModal({ template, onClose }: { template: Template; onClose: () => void }) {
  const [vars, setVars] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ title: string; body: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // 自动提取 {{var}} 变量
  const varNames = Array.from(new Set([
    ...(template.title.match(/\{\{\s*(\w+)\s*\}\}/g) || []),
    ...(template.body.match(/\{\{\s*(\w+)\s*\}\}/g) || []),
  ].map((m) => m.replace(/[{}\s]/g, ''))));

  async function doPreview() {
    setLoading(true);
    try {
      const r = await apiFetch<any>(`/admin/notifications/templates/${template.id}/preview`, {
        method: 'POST',
        body: vars,
      });
      setResult(r);
    } catch (e: any) {
      alert('预览失败：' + (e?.message || ''));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5" /> 预览模板
          </h2>

          {varNames.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">填入变量值：</p>
              {varNames.map((vn) => (
                <div key={vn}>
                  <label className="text-xs text-muted-foreground font-mono">
                    {`{{${vn}}}`}
                  </label>
                  <Input
                    value={vars[vn] || ''}
                    onChange={(e) => setVars({ ...vars, [vn]: e.target.value })}
                    placeholder={`填入 ${vn}`}
                    className="mt-1"
                  />
                </div>
              ))}
              <Button onClick={doPreview} disabled={loading} className="w-full">
                {loading ? '渲染中…' : '生成预览'}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">该模板无变量</p>
          )}

          {result && (
            <div className="border rounded-lg p-3 bg-secondary/30">
              <p className="text-xs text-muted-foreground mb-1">预览：</p>
              <p className="font-semibold text-sm mb-1">{result.title}</p>
              <p className="text-sm text-muted-foreground">{result.body}</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>关闭</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}