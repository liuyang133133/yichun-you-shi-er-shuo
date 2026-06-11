import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import { webcrypto } from 'crypto';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { join } from 'path';

// Node 18 兼容：`@nestjs/schedule` 在 Node 19+ 才有 global crypto
if (typeof (globalThis as any).crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3001);

  // 1. Helmet 安全响应头（MUST-6）
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // 兼容 <img crossOrigin>
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // 2. 静态资源：加 nosniff
  app.use('/uploads', (_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    next();
  });

  // 3. 静态资源服务
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // 4. 响应压缩 (SHOULD-6): 列表响应 200KB+ 节省 80% 带宽
  app.use(
    compression({
      threshold: 1024, // 仅压缩 > 1KB
      level: 6,        // 平衡 CPU 与压缩率
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
    }),
  );

  // 5. 全局前缀（排除静态资源）
  app.setGlobalPrefix('api/v1', {
    exclude: ['uploads/(.*)'],
  });

  // 6. CORS 白名单（MUST-4）
  // F-5 修复:空配置应拒绝跨域,而不是放行所有 origin
  const origins = (config.get<string>('CORS_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    new Logger('Bootstrap').warn(
      '⚠️  CORS_ORIGINS 为空:仅允许同源请求。生产环境必须在 .env 中显式设置。',
    );
  }

  app.enableCors({
    origin: (origin, callback) => {
      // 同源（无 Origin 头，如 Postman / curl / 同站请求）放行
      // 注意:F-5 修复后,空配置不再放行所有 origin
      if (!origin || origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // 7. 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 8. 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // 9. 全局响应拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 后端服务运行在: http://localhost:${port}/api/v1`);
  logger.log(`📁 静态资源: http://localhost:${port}/uploads/`);
  logger.log(`🔒 CORS 白名单: ${origins.join(', ') || '(空,仅同源)'}`);
}

bootstrap();
