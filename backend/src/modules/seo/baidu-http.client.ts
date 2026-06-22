import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export interface BaiduHttpResponse<T = any> {
  data: T;
  status: number;
}

/**
 * 极简 HTTP POST 客户端 - 专给百度站长推送用
 * - 不引入 @nestjs/axios 依赖 (项目未装)
 * - 支持 http/https, 仅返回响应体
 * - 默认超时 10s
 * - 测试时可被 { post: jest.fn() } mock 替换
 */
@Injectable()
export class BaiduHttpClient {
  private readonly logger = new Logger(BaiduHttpClient.name);

  async post<T = any>(url: string, body: string, headers: Record<string, string> = {}, timeoutMs = 10000): Promise<BaiduHttpResponse<T>> {
    return new Promise((resolve, reject) => {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch (e: any) {
        return reject(new Error(`BaiduHttp: 无效 URL ${url}: ${e?.message}`));
      }
      const isHttps = parsed.protocol === 'https:';
      const lib = isHttps ? https : http;
      const opts: http.RequestOptions = {
        method: 'POST',
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
        timeout: timeoutMs,
      };
      const req = lib.request(opts, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let data: any = text;
          try {
            data = JSON.parse(text);
          } catch {
            // not JSON, keep as string
          }
          resolve({ data, status: res.statusCode || 0 });
        });
      });
      req.on('timeout', () => {
        req.destroy(new Error(`BaiduHttp: 请求超时 ${timeoutMs}ms`));
      });
      req.on('error', (e) => reject(new Error(`BaiduHttp: ${e.message}`)));
      req.write(body);
      req.end();
    });
  }
}
