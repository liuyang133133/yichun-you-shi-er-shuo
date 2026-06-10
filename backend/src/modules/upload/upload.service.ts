import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { randomBytes } from 'crypto';

/**
 * 文件存储服务（V1 本地存储，V1.1 切 OSS）
 *
 * 目录结构：
 *   uploads/
 *     yyyy/mm/
 *       {nanoid}.{ext}
 *
 * 返回的 URL 形如：
 *   http://host:port/uploads/2026/06/abc123.jpg
 */
@Injectable()
export class UploadService {
  /** 允许的图片 MIME */
  private readonly ALLOWED_MIMES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  /** 单文件最大 5MB */
  private readonly MAX_SIZE = 5 * 1024 * 1024;
  /** 上传根目录（相对 backend 工作目录） */
  private readonly UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

  constructor(private readonly config: ConfigService) {}

  /**
   * 校验 + 保存图片，返回公开 URL
   */
  async saveImage(file: Express.Multer.File): Promise<{
    url: string;
    size: number;
    mimeType: string;
    filename: string;
  }> {
    if (!file) {
      throw new BadRequestException('未收到文件');
    }
    if (!this.ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        `不支持的图片类型: ${file.mimetype}（仅允许 jpg/png/webp/gif）`,
      );
    }
    if (file.size > this.MAX_SIZE) {
      throw new BadRequestException(
        `文件超过 5MB 上限（实际 ${(file.size / 1024 / 1024).toFixed(2)}MB）`,
      );
    }

    // 按年月分目录
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const subdir = path.join(String(year), month);
    await fs.mkdir(path.join(this.UPLOAD_DIR, subdir), { recursive: true });

    // 随机文件名（保留扩展名）
    const ext = (extname(file.originalname) || this.extFromMime(file.mimetype)).toLowerCase();
    const filename = `${randomBytes(12).toString('hex')}${ext}`;
    const filepath = path.join(this.UPLOAD_DIR, subdir, filename);

    // 写入文件
    await fs.writeFile(filepath, file.buffer);

    // 公开 URL（开发环境后端 3001）
    const publicBase = this.config.get<string>('PUBLIC_BASE_URL', 'http://localhost:3001');
    const url = `${publicBase}/uploads/${year}/${month}/${filename}`;

    return {
      url,
      size: file.size,
      mimeType: file.mimetype,
      filename,
    };
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };
    return map[mime] || '.bin';
  }
}
