import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger as PinoNestLogger } from 'nestjs-pino';
import { webcrypto } from 'crypto';
import helmet from 'helmet';
import compression from 'compression';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { join } from 'path';
// T-010: Redis Adapter 让 ws 广播跨实例生效
import { RedisIoAdapter } from './modules/ws/redis-io.adapter';

// Node 18 兼容：`@nestjs/schedule` 在 Node 19+ 才有 global crypto
if (typeof (globalThis as any).crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}

// T-P1-01: 启动期强校验关键环境变量 (MUST-1 + Phase 1 T-P1-01)
// 弱密钥/缺失密钥直接 process.exit(1) 防止部署到生产
function validateRequiredEnv(): void {
  const errors: string[] = [];

  // JWT_SECRET: ≥ 32 字符
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    errors.push(
      `JWT_SECRET is missing or too weak (length=${jwtSecret?.length ?? 0}, required ≥ 32). ` +
        `Generate with: openssl rand -hex 32`,
    );
  }
  // 弱密钥黑名单（防止 'change-in-production' 这种占位符混进生产）
  const weakSecrets = [
    'change-in-production',
    'change_in_production',
    'change-me',
    'secret',
    'dev-secret',
    'yichun-you-shi-er-shuo-jwt-secret-change-in-production', // 旧默认值
  ];
  if (jwtSecret && weakSecrets.some((w) => jwtSecret.toLowerCase().includes(w))) {
    errors.push(
      `JWT_SECRET contains a weak placeholder substring. ` +
        `Generate a new one with: openssl rand -hex 32`,
    );
  }

  // DATABASE_URL: 必须是 mysql://
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.startsWith('mysql://')) {
    errors.push(
      `DATABASE_URL is missing or invalid (must start with mysql://). ` +
        `Check backend/.env.`,
    );
  }

  // REDIS_URL: 必须是 redis://
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl || !redisUrl.startsWith('redis://')) {
    errors.push(
      `REDIS_URL is missing or invalid (must start with redis://). ` +
        `Check backend/.env.`,
    );
  }

  if (errors.length > 0) {
    // eslint-disable-next-line no-console
    console.error('========================================');
    // eslint-disable-next-line no-console
    console.error('❌ FATAL: Invalid or weak environment configuration');
    // eslint-disable-next-line no-console
    console.error('========================================');
    errors.forEach((e) => {
      // eslint-disable-next-line no-console
      console.error(`  - ${e}`);
    });
    // eslint-disable-next-line no-console
    console.error('========================================');
    process.exit(1);
  }
}
validateRequiredEnv();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // nestjs-pino 接管 NestJS 内部 Logger(SHOULD-41)
  // 注意:pinoHttp 中间件在 AppModule 中由 LoggerModule.forRoot() 自动注册,
  // 这里不能再 app.use(pinoHttp(...)),否则会注册两份导致 reqId 不共享
  app.useLogger(app.get(PinoNestLogger));

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
  // [P0-fix] body-parser 上限提到 1MB, 避免 70k+ 描述被 413 拦在 DTO 之前
  // 旧默认 100KB 太严, 实际业务有长 description/图片列表场景
  const express = require('express');
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

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

  // 10. WebSocket Redis Adapter (T-010): 跨实例广播
  // 必须先 await app.init() 触发 RedisService.onModuleInit()，否则 getClient() 返回 undefined
  await app.init();
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.init(app);
  app.useWebSocketAdapter(redisIoAdapter);

  // 11. Swagger 文档 (SHOULD-40)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('伊春有事儿说 API')
    .setDescription('V1.0 分类信息平台后端 API')
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('auth', '认证')
    .addTag('posts', '信息')
    .addTag('users', '用户')
    .addTag('categories', '分类')
    .addTag('areas', '区域')
    .addTag('favorites', '收藏')
    .addTag('comments', '留言')
    .addTag('reports', '举报')
    .addTag('messages', '站内信')
    .addTag('announcements', '公告')
    .addTag('admin', '管理后台')
    .addTag('health', '健康检查')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 后端服务运行在: http://localhost:${port}/api/v1`);
  logger.log(`📁 静态资源: http://localhost:${port}/uploads/`);
  logger.log(`📚 Swagger 文档: http://localhost:${port}/api/docs`);
  logger.log(`🔒 CORS 白名单: ${origins.join(', ') || '(空,仅同源)'}`);
}

bootstrap();
