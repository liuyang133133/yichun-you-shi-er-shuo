'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BusinessType = 'recruiter' | 'agent' | 'wholesaler';

interface Props {
  isBusiness: boolean;
  businessType?: BusinessType | null;
  businessConfidence?: number;
}

const TYPE_LABEL: Record<BusinessType, string> = {
  recruiter: '招聘方',
  agent: '房产中介',
  wholesaler: '二手批发商',
};

const CONFIDENCE_THRESHOLD = 0.7;

/**
 * 商家识别提示组件
 * - 当 isBusiness=true 且 confidence >= 0.7 时,在页面顶部弹出自定义 toast
 * - 自定义 toast 实现 (不依赖 sonner)
 * - 组件本身返回 null,通过 useEffect 触发副作用
 */
export function BusinessDetector({
  isBusiness,
  businessType,
  businessConfidence,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<string>('');
  const triggeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isBusiness) return;
    if (!businessConfidence || businessConfidence < CONFIDENCE_THRESHOLD) return;
    if (!businessType) return;

    // 用 type+confidence 作为去重 key,避免同一次结果重复触发
    const key = `${businessType}:${businessConfidence}`;
    if (triggeredRef.current === key) return;
    triggeredRef.current = key;

    setLabel(TYPE_LABEL[businessType] || '商家');
    setVisible(true);

    const timer = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timer);
  }, [isBusiness, businessType, businessConfidence]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md
                 bg-white border border-emerald-200 shadow-lg rounded-lg p-4
                 animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 font-medium text-sm">
            检测到您可能是 {label}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            申请商家主页可获得 V 标和专属展示位
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="default" disabled>
              申请 (即将上线)
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setVisible(false)}>
              暂不
            </Button>
          </div>
        </div>
        <button
          aria-label="关闭"
          onClick={() => setVisible(false)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}