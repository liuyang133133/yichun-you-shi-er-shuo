import { cookies } from 'next/headers';

const ACCESS_COOKIE = 'access_token';

/** SSR: 读取 access token（用于 server component / middleware 不能直接用时的兜底） */
export async function getServerAccessToken(): Promise<string | undefined> {
  const c = (await cookies()).get(ACCESS_COOKIE);
  return c?.value ? decodeURIComponent(c.value) : undefined;
}

/** SSR: 判断当前是否已登录 */
export async function isServerLoggedIn(): Promise<boolean> {
  return Boolean(await getServerAccessToken());
}
