'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Edit3, ArrowRight, Home, Briefcase, ShoppingBag, Megaphone } from 'lucide-react';
import AiPublishMode from './ai-mode';
import { AiPostType } from '@/lib/api-ai';

const TYPE_OPTIONS: Array<{ code: AiPostType; label: string; icon: any; gradient: string }> = [
  { code: 'house', label: '房屋出租/出售', icon: Home, gradient: 'from-blue-500 to-indigo-600' },
  { code: 'job', label: '招聘求职', icon: Briefcase, gradient: 'from-emerald-500 to-teal-600' },
  { code: 'secondhand', label: '二手交易', icon: ShoppingBag, gradient: 'from-pink-500 to-fuchsia-600' },
  { code: 'lifebiz', label: '便民信息', icon: Megaphone, gradient: 'from-amber-500 to-red-600' },
];

export default function PublishPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <PublishEntry />
    </Suspense>
  );
}

function PublishEntry() {
  const router = useRouter();
  const search = useSearchParams();
  const mode = search.get('mode');
  const type = (search.get('type') as AiPostType) || 'house';

  // 有 mode=manual 直接进 manual (AI 模式跳过来时)
  if (mode === 'manual') {
    const Manual = require('./manual-mode').default;
    return <Manual />;
  }

  // 默认: AI 模式优先
  return <AiPublishMode initialType={type} />;
}
