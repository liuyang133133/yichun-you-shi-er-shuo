import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { fromBuffer as fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

/**
 * 文件存储服务（V1 本地存储，V1.1 切 OSS）
 *
 * 安全加固（MUST-5）：
 * - 用 file-type 嗅探真实 magic number（不信 client MIME）
 * - 拒绝 SVG/HTML/PHP 等可执行文件
 * - sharp 重新编码为 webp（剥离 EXIF/注释/恶意 payload）
 * - 输出文件名固定为 .webp（不再信任 originalname）
 *
 * 目录结构：
 *   uploads/yyyy/mm/{nanoid}.webp
 */
@Injectable()
export class UploadService {
  /** 允许的图片格式（按嗅探结果） */
  private readonly ALLOWED_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
  /** 单文件最大 5MB */
  private readonly MAX_SIZE = 5 * 1024 * 1024;
  /** 上传根目录 */
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
    if (file.size > this.MAX_SIZE) {
      throw new BadRequestException(
        `文件超过 5MB 上限（实际 ${(file.size / 1024 / 1024).toFixed(2)}MB）`,
      );
    }

    // 1. 真实嗅探（不信 client mimetype / originalname）
    const type = await fileTypeFromBuffer(file.buffer);
    if (!type || !this.ALLOWED_FORMATS.has(type.ext)) {
      throw new BadRequestException(
        `不支持的文件类型（仅允许 jpg/png/webp/gif）。` +
        `嗅探结果: ${type ? `${type.ext}/${type.mime}` : 'unknown'}`,
      );
    }
    // 2. 二次校验：mime 必须以 image/ 开头
    if (!type.mime.startsWith('image/')) {
      throw new BadRequestException('Not an image file');
    }
    // 3. 显式拒绝 svg（即使 mimetype 伪装）
    if ((type.ext as string) === 'svg' || type.mime.includes('svg')) {
      throw new BadRequestException('SVG files are not allowed (XSS risk)');
    }

    // 4. 按年月分目录
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const subdir = path.join(String(year), month);
    await fs.mkdir(path.join(this.UPLOAD_DIR, subdir), { recursive: true });

    // 5. sharp 重新编码为 webp（剥离 EXIF / 注释 / 潜在 payload）
    //    输出固定为 .webp — 不再信任 originalname 扩展名
    const filename = `${randomBytes(12).toString('hex')}.webp`;
    const filepath = path.join(this.UPLOAD_DIR, subdir, filename);

    let encoded: Buffer;
    try {
      encoded = await sharp(file.buffer)
        .rotate() // 按 EXIF 旋转方向修正
        .webp({ quality: 85 })
        .toBuffer();
    } catch (e) {
      throw new BadRequestException(
        `图片处理失败: ${(e as Error).message}。` +
        `请确保上传的是有效的 jpg/png/webp/gif 图片`,
      );
    }

    await fs.writeFile(filepath, encoded);

    // 6. 公开 URL
    const publicBase = this.config.get<string>('PUBLIC_BASE_URL', 'http://localhost:3001');
    const url = `${publicBase}/uploads/${year}/${month}/${filename}`;

    return {
      url,
      size: encoded.length,
      mimeType: 'image/webp', // 固定 webp
      filename,
    };
  }
}
