import { AdminShell } from '@/components/layout/admin-shell';

export default function AiUsageLayout({ children }: { children: React.ReactNode }) {
  // [P2-006] 补齐 admin shell，与其他管理页保持一致的鉴权 / 导航 / 主题
  return <AdminShell>{children}</AdminShell>;
}