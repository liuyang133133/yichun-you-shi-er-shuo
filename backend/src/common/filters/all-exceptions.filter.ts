import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 统一异常过滤器
 * 捕获所有异常，返回统一格式的 JSON
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = '服务器内部错误';
    let error: string = 'Internal Server Error';
    let data: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as any;
        message = obj.message || obj.error || message;
        error = obj.error || error;
        // 保留调用方传入的 data 字段(让 health 端点的 503 能带详细 checks)
        // 兼容多种位置:HttpException 构造时的第二参数 / 直接放在 res.data
        if (obj.data !== undefined) {
          data = obj.data;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;

      // [P0-fix] 显式处理 body-parser / express 已知错误, 避免统一返 500
      // 1. PayloadTooLargeError (默认 100KB) → 413 Request Entity Too Large
      // 2. SyntaxError from bodyParser (JSON.parse 失败) → 400 Bad Request
      if (exception.name === 'PayloadTooLargeError' || (exception as any).type === 'entity.too.large') {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        message = '请求体过大（默认限制 100KB）';
        error = 'Payload Too Large';
      } else if (exception.name === 'SyntaxError' && (exception as any).type === 'entity.parse.failed') {
        status = HttpStatus.BAD_REQUEST;
        message = '请求体 JSON 解析失败';
        error = 'Bad Request';
      } else if (exception.name === 'BadRequestError' && /request size|body-parser/i.test(exception.message)) {
        // 部分 body-parser 版本抛 BadRequestError
        status = HttpStatus.BAD_REQUEST;
        message = '请求体格式错误';
        error = 'Bad Request';
      }
    }

    // 5xx 错误记录到日志
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      code: status,
      message,
      data,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
