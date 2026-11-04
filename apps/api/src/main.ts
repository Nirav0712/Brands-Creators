import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { assertProductionSecrets } from './config/secrets.validator';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Phase 28: Fail-fast security validation in production
  assertProductionSecrets(process.env);

  const app = await NestFactory.create(AppModule, { rawBody: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 4000;
  const appUrl = configService.get<string>('appUrl') || 'http://localhost:3000';
  const adminUrl = configService.get<string>('adminUrl') || 'http://localhost:3001';

  // Security Headers via Helmet & Middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      contentSecurityPolicy: false, // Allows Swagger UI inline scripts on /api/docs
      hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false, // Strictly NO HSTS on local HTTP!
      frameguard: { action: 'sameorigin' },
      dnsPrefetchControl: { allow: false },
    }),
  );

  // Custom Permissions-Policy & Security Headers
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS Configuration
  app.enableCors({
    origin: [
      appUrl,
      adminUrl,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-razorpay-signature',
      'stripe-signature',
      'x-cron-secret',
      'x-bypass-rate-limit',
    ],
  });

  // Cookie Middleware
  app.use(require('cookie-parser')());

  // Global Validation Pipe with automatic sanitization
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

  // Global Filters & Interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Brands & Creators REST API')
    .setDescription('Production B2B Creative & Production Marketplace SaaS API Specification')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`🚀 Brands & Creators API is running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger API Docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
