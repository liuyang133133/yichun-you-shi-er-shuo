/**
 * 上传 API wrapper
 *
 * 后端 /upload/image 端点(已在 V1 上线):
 *   - multipart/form-data, 字段名 file
 *   - 单文件 ≤ 5MB,jpg/png/webp/gif
 *   - sharp 重编码 webp 后返回 { url, size, mimeType, filename }
 *
 * 头像场景用法:
 *   const { url } = await uploadApi.uploadImage(file);
 *   await userApi.updateMe({ avatar: url });
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15301/api/v1';

export interface UploadImageResult {
  url: string;
  size: number;
  mimeType: string;
  filename: string;
  uploadedBy: string;
}

async function authHeader(): Promise<Record<string, string>> {
  // 动态 import 避免 SSR 访问 localStorage
  const { getAccessToken } = await import('./auth');
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const uploadApi = {
  /**
   * 上传单张图片
   * @throws Error 当后端 4xx/5xx 时抛错(带后端 message)
   */
  async uploadImage(file: File): Promise<UploadImageResult> {
    const fd = new FormData();
    fd.append('file', file);

    const res = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      body: fd,
      headers: await authHeader(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || `上传失败 (${res.status})`;
      const err = new Error(msg);
      (err as any).status = res.status;
      throw err;
    }
    return data as UploadImageResult;
  },
};
