import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /api/v1/upload/image
   * 上传单张图片
   *
   * 表单字段名: file
   * Content-Type: multipart/form-data
   * 需登录
   */
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      // multer 用 memoryStorage 让 service 自己控制写入位置
      // （便于按年/月分目录 + 写入前校验 mime/size）
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请上传文件，表单字段名: file');
    }
    const result = await this.uploadService.saveImage(file);
    return {
      ...result,
      uploadedBy: user.sub,
    };
  }
}
