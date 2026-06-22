import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';
import * as tls from 'tls';

/**
 * 通过 SOCKS5 代理建立一个到目标 host:port 的 TLS 隧道
 * 返回 Promise<{ socket, close }>
 * - 无认证 (METHOD=0x00)
 * - 仅支持 DOMAIN (ATYP=0x03) CONNECT
 */
function socks5Tunnel(
  proxyHost: string,
  proxyPort: number,
  targetHost: string,
  targetPort: number,
  timeoutMs = 10000,
): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const sock = net.connect(proxyPort, proxyHost);
    const timer = setTimeout(() => {
      sock.destroy();
      reject(new Error(`SOCKS5 代理 ${proxyHost}:${proxyPort} 超时`));
    }, timeoutMs);

    let stage = 0;
    const cleanup = () => clearTimeout(timer);
    sock.once('error', (e) => {
      cleanup();
      reject(new Error(`SOCKS5 代理错误: ${e.message}`));
    });
    sock.once('connect', () => {
      // 阶段 0: SOCKS5 greeting
      sock.write(Buffer.from([0x05, 0x01, 0x00]));
    });
    sock.on('data', (chunk) => {
      try {
        if (stage === 0) {
          if (chunk[0] !== 0x05 || chunk[1] !== 0x00) {
            cleanup();
            sock.destroy();
            return reject(new Error(`SOCKS5: 代理拒绝方法 0x${chunk[1]?.toString(16)}`));
          }
          stage = 1;
          const hostBuf = Buffer.from(targetHost, 'utf8');
          sock.write(
            Buffer.concat([
              Buffer.from([0x05, 0x01, 0x00, 0x03, hostBuf.length]),
              hostBuf,
              Buffer.from([(targetPort >> 8) & 0xff, targetPort & 0xff]),
            ]),
          );
          return;
        }
        if (stage === 1) {
          if (chunk[0] !== 0x05 || chunk[1] !== 0x00) {
            cleanup();
            sock.destroy();
            return reject(new Error(`SOCKS5: CONNECT 失败 REP=0x${chunk[1]?.toString(16)}`));
          }
          stage = 2;
          sock.removeAllListeners('data');
          // 在已建立的隧道上做 TLS 握手
          const tlsSock = tls.connect({
            socket: sock,
            servername: targetHost,
            rejectUnauthorized: true,
          });
          tlsSock.once('error', (e) => {
            cleanup();
            reject(new Error(`TLS 握手失败: ${e.message}`));
          });
          tlsSock.once('secureConnect', () => {
            cleanup();
            resolve(tlsSock);
          });
        }
      } catch (e: any) {
        cleanup();
        sock.destroy();
        reject(e);
      }
    });
  });
}

export interface GlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GlmCallOptions {
  system?: string;
  messages: GlmMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface GlmCallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  latencyMs: number;
}

/**
 * 智谱 GLM 客户端（OpenAI 兼容协议）
 * - baseURL: https://open.bigmodel.cn/api/paas/v4/
 * - 直接通过 SOCKS5 隧道 + 裸 HTTPS, 避开 OpenAI SDK + node-fetch
 *   (它们要么不支持 SOCKS5, 要么绑死 agentkeepalive 与 DNS 解析)
 * - 启动期校验 API key 存在
 * - 统一超时控制 (默认 15s)
 * - 错误结构化, 上层可捕获
 */
@Injectable()
export class GlmClient implements OnModuleInit {
  private readonly logger = new Logger(GlmClient.name);
  private apiKey: string | null = null;
  private baseUrl = 'https://open.bigmodel.cn/api/paas/v4/';
  private model = 'glm-4-air';
  /** socks5://host:port 或 null */
  private proxyUrl: string | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const apiKey = this.config.get<string>('GLM_API_KEY');
    if (apiKey && !apiKey.includes('PLACEHOLDER')) {
      this.apiKey = apiKey;
      const baseURL =
        this.config.get<string>('GLM_BASE_URL') ?? 'https://open.bigmodel.cn/api/paas/v4/';
      this.baseUrl = baseURL;
      const m = this.config.get<string>('GLM_MODEL');
      if (m) this.model = m;
      this.proxyUrl = this.config.get<string>('GLM_PROXY_URL') ?? null;
      this.logger.log(
        `GLM client initialized (model=${this.model}, baseURL=${baseURL}, ` +
          `proxy=${this.proxyUrl ?? 'none'})`,
      );
    } else {
      this.logger.warn(
        'GLM_API_KEY not configured or is placeholder, AI endpoints will return 503',
      );
    }
  }

  isAvailable(): boolean {
    return this.apiKey !== null;
  }

  /**
   * 调用智谱 GLM API
   * 抛出错误时上层应捕获并降级
   */
  async call(opts: GlmCallOptions): Promise<GlmCallResult> {
    if (!this.apiKey) {
      throw new Error(
        'AI_UNAVAILABLE: GLM client not initialized, please check GLM_API_KEY',
      );
    }

    const start = Date.now();
    const maxTokens = opts.maxTokens ?? 1024;
    const temperature = opts.temperature ?? 0.2;
    // 60s 默认: 15s/30s 都不够, suggest-title 经 SOCKS5 代理 偶尔 50s+;
    // 短 call (suggest-title) 实际 ~6s, 60s 留充足容错
    const timeoutMs = opts.timeoutMs ?? 60000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // OpenAI/GLM: 'system' 作为第一条消息 role
      const messages: Array<Record<string, string>> = opts.system
        ? [{ role: 'system', content: opts.system }, ...opts.messages]
        : opts.messages;

      const body = JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        messages,
      });

      const url = new URL(this.baseUrl);
      const targetHost = url.hostname;
      const targetPort = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
      const path = url.pathname.replace(/\/$/, '') + '/chat/completions';

      let tlsSock: tls.TLSSocket;
      if (this.proxyUrl) {
        const u = new URL(this.proxyUrl);
        if (u.protocol !== 'socks5:' && u.protocol !== 'socks:') {
          throw new Error(`GLM_PROXY_URL 仅支持 socks5://, 当前 ${u.protocol}`);
        }
        tlsSock = await socks5Tunnel(
          u.hostname,
          Number(u.port || 1080),
          targetHost,
          targetPort,
          Math.max(timeoutMs - 200, 1000),
        );
      } else {
        // 直连 (依赖系统 DNS)
        tlsSock = await this.directTlsConnect(targetHost, targetPort, timeoutMs - 200);
      }

      controller.signal.addEventListener('abort', () => tlsSock.destroy());

      // 构造 HTTP/1.1 请求
      const req =
        `POST ${path} HTTP/1.1\r\n` +
        `Host: ${targetHost}\r\n` +
        `Content-Type: application/json\r\n` +
        `Authorization: Bearer ${this.apiKey}\r\n` +
        `Content-Length: ${Buffer.byteLength(body)}\r\n` +
        `Connection: close\r\n` +
        `\r\n` +
        body;

      const response = await this.writeAndRead(tlsSock, req, controller.signal);
      tlsSock.destroy();

      // 解析响应
      const headerEnd = response.indexOf('\r\n\r\n');
      if (headerEnd < 0) throw new Error('GLM: 响应格式异常 (无 header 终止符)');
      const headerPart = response.slice(0, headerEnd);
      const bodyPart = response.slice(headerEnd + 4);
      const statusLine = headerPart.split('\r\n')[0];
      const m = statusLine.match(/^HTTP\/1\.[01] (\d+)/);
      const status = m ? Number(m[1]) : 0;
      if (status < 200 || status >= 300) {
        throw new Error(`HTTP ${status}: ${bodyPart.slice(0, 300)}`);
      }
      const data = JSON.parse(bodyPart) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const choice = data.choices?.[0];
      const text = choice?.message?.content ?? '';
      const usage = data.usage;

      return {
        text,
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        model: this.model,
        latencyMs: Date.now() - start,
      };
    } catch (e: any) {
      const code = e?.status || e?.code || e?.name || 'UNKNOWN';
      throw new Error(`GLM_${code}: ${e?.message ?? String(e)}`);
    } finally {
      clearTimeout(timer);
    }
  }

  private directTlsConnect(host: string, port: number, timeoutMs: number): Promise<tls.TLSSocket> {
    return new Promise((resolve, reject) => {
      const sock = tls.connect({ host, port, servername: host, rejectUnauthorized: true });
      const t = setTimeout(() => {
        sock.destroy();
        reject(new Error(`直连 ${host}:${port} 超时`));
      }, timeoutMs);
      sock.once('error', (e) => {
        clearTimeout(t);
        reject(e);
      });
      sock.once('secureConnect', () => {
        clearTimeout(t);
        resolve(sock);
      });
    });
  }

  private writeAndRead(sock: tls.TLSSocket, req: string, signal: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
      let buf = '';
      let done = false;
      const onAbort = () => {
        if (done) return;
        done = true;
        sock.destroy();
        reject(new Error('aborted'));
      };
      signal.addEventListener('abort', onAbort);

      sock.setEncoding('utf8');
      sock.on('data', (chunk) => {
        buf += chunk;
        // 检查是否已收到完整响应 (Connection: close, 服务端会主动关闭)
      });
      sock.on('end', () => {
        if (done) return;
        done = true;
        signal.removeEventListener('abort', onAbort);
        resolve(buf);
      });
      sock.on('error', (e) => {
        if (done) return;
        done = true;
        signal.removeEventListener('abort', onAbort);
        reject(e);
      });
      sock.write(req);
    });
  }
}
