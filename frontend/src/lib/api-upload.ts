/**
 * 上传 API wrapper (single source of truth)
 *
 * 后端 /upload/image 端点(已在 V1 上线):
 *   - multipart/form-data, 字段名 file
 *   - 单文件 ≤ 5MB,jpg/png/webp/gif
 *   - sharp 重编码 webp 后返回 { url, size, mimeType, filename, uploadedBy }
 *
 * 头像场景用法:
 *   const { url } = await uploadApi.uploadImage(file);
 *   await userApi.updateMe({ avatar: url });
 */
import { getAccessToken } from './auth';
import { ApiError } from './api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface UploadImageResult {
  url: string;
  size: number;
  mimeType: string;
  filename: string;
  uploadedBy: string;
}

function authHeader(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function uploadImage(file: File): Promise<UploadImageResult> {
  const fd = new FormData();
  fd.append('file', file);

  const res = await fetch(`${API_BASE}/upload/image`, {
    method: 'POST',
    body: fd,
    headers: authHeader(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || `上传失败 (${res.status})`;
    throw new ApiError(msg, res.status, res.status, data);
  }
  return (data?.data ?? data) as UploadImageResult;
}

export const uploadApi = {
  /**
   * 上传单张图片
   * @throws {ApiError} 当后端 4xx/5xx 时抛错
   * @returns {Promise<UploadImageResult>}
   */
  uploadImage,
  /** @deprecated 请改用 uploadImage；保留以兼容现有发布页调用。 */
  image: uploadImage,
};
