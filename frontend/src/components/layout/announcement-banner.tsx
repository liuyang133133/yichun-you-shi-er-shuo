'use client';

import { useEffect, useState } from 'react';
import { X, Megaphone } from 'lucide-react';
import { announcementApi, type Announcement } from '@/lib/api';

const DISMISSED_KEY = 'announcement_dismissed_ids';

export function AnnouncementBanner() {
  const [list, setList] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    announcementApi.active()
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]));
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      if (raw) setDismissed(new Set(JSON.parse(raw)));
    } catch { /* noop */ }
  }, []);

  const visible = list.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const handleDismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])); } catch { /* noop */ }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-2 space-y-1">
        {visible.map((a) => (
          <div key={a.id} className="flex items-start gap-2 text-sm text-amber-900">
            <Megaphone className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold">{a.title}</span>
              {a.priority === 1 && (
                <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-200 rounded">置顶</span>
              )}
              <span className="ml-2 text-amber-800">{a.content}</span>
            </div>
            <button
              onClick={() => handleDismiss(a.id)}
              className="shrink-0 p-0.5 hover:bg-amber-100 rounded"
              aria-label="关闭"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
