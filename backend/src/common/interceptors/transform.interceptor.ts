import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse {
  code: number;
  message: string;
  data: unknown;
  timestamp: string;
}

/**
 * 统一响应拦截器
 * 将所有成功响应包装为 { code, message, data, timestamp }
 *
 * ⚠️ Prisma 5 用 BigInt 表示 bigint 列，JSON.stringify 默认不识别。
 * 这里递归把 data 里的 BigInt 全部转成字符串（前端友好），
 * Date 转 ISO 字符串，避免序列化报错。
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor<unknown, ApiResponse> {
  intercept(_context: ExecutionContext, next: CallHandler<unknown>): Observable<ApiResponse> {
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'ok',
        data: this.serialize(data),
        timestamp: new Date().toISOString(),
      })),
    );
  }

  private serialize(value: unknown): unknown {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    // Prisma 的 Decimal 类型：调 toString() 输出 "5800.00" 这种
    if (
      value !== null &&
      typeof value === 'object' &&
      's' in value &&
      'e' in value &&
      'd' in value &&
      typeof (value as { toString: () => string }).toString === 'function'
    ) {
      return (value as { toString: () => string }).toString();
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.serialize(v));
    }
    if (value !== null && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = this.serialize(v);
      }
      return out;
    }
    return value;
  }
}
