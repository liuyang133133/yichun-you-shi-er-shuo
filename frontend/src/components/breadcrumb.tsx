import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  /** 当前页用 null 表示（不可点击） */
  href: string | null;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** 自定义根图标（默认 Home） */
  showHomeIcon?: boolean;
  className?: string;
}

/**
 * Breadcrumb — 面包屑导航
 *
 * 用法：
 *   <Breadcrumb items={[
 *     { label: '首页', href: '/' },
 *     { label: '房屋出租', href: '/?type=house' },
 *     { label: '帖子标题', href: null },
 *   ]} />
 *
 * - 末尾项（href === null）视为当前页，不加链接，加 aria-current="page"
 * - 使用语义化 <nav><ol> 结构（a11y 友好）
 */
export function Breadcrumb({
  items,
  showHomeIcon = true,
  className,
}: BreadcrumbProps) {
  if (!items || items.length === 0) return null;
  return (
    <nav
      aria-label="面包屑导航"
      className={cn(
        'flex items-center gap-1 text-sm text-muted-foreground',
        className,
      )}
    >
      <ol className="flex items-center gap-1 flex-wrap min-w-0">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isCurrent = item.href === null || isLast;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1 min-w-0">
              {isCurrent ? (
                <span
                  aria-current="page"
                  className="font-medium text-foreground truncate max-w-[260px] inline-flex items-center gap-1"
                  title={item.label}
                >
                  {i === 0 && showHomeIcon ? (
                    <Home className="h-3.5 w-3.5 flex-shrink-0" />
                  ) : null}
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href as string}
                  className="hover:text-foreground transition-colors inline-flex items-center gap-1 truncate max-w-[200px]"
                  title={item.label}
                >
                  {i === 0 && showHomeIcon ? (
                    <Home className="h-3.5 w-3.5 flex-shrink-0" />
                  ) : null}
                  {item.label}
                </Link>
              )}
              {!isLast && (
                <ChevronRight
                  className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}