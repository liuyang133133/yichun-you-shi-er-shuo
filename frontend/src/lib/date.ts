// frontend/src/lib/date.ts
// 业务时区统一为 Asia/Shanghai(伊春 黑龙江 +8,无 DST)
// 零依赖,用原生 Intl API;不引入 dayjs/date-fns/luxon

const TZ = 'Asia/Shanghai';

export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString('zh-CN', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('zh-CN', { timeZone: TZ });
}

export function formatRelative(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return '刚刚';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} 小时前`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} 天前`;
  return formatDate(d);
}
