import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { join } from 'path';

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

  // 4. 全局前缀（排除静态资源）
  app.setGlobalPrefix('api/v1', {
    exclude: ['uploads/(.*)'],
  });

  // 5. CORS 白名单（MUST-4）
  const origins = (config.get<string>('CORS_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // 同源 / Postman / curl（无 origin 头）允许
      if (!origin || origins.length === 0 || origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // 6. 全局验证管道
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

  // 7. 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // 8. 全局响应拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 后端服务运行在: http://localhost:${port}/api/v1`);
  logger.log(`📁 静态资源: http://localhost:${port}/uploads/`);
  logger.log(`🔒 CORS 白名单: ${origins.join(', ') || '(空，允许所有)'}`);
}

bootstrap();
