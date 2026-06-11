import { redirect } from 'next/navigation';
import { getToken } from '@/lib/api';

export default function RootPage() {
  // 服务端无法直接读 localStorage，靠客户端判断
  // 这里用 redirect 让客户端处理
  redirect('/login');
}
