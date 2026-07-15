// V1.0 页面合理性修复: AdminShell 已在 admin/src/app/layout.tsx (根) 统一包装
// 此处原 AdminShell 重复包装导致侧边栏菜单显示 2 份
// 改为透传 children (保留 layout 文件占位)
export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
