import 'reflect-metadata';
import path from 'node:path';
import dotenv from 'dotenv';

for (const candidate of ['.env', '../../.env']) {
  dotenv.config({ path: path.resolve(process.cwd(), candidate), override: false });
}

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { Logger } from '@nestjs/common';
import { getServerEnv } from '@frameforge/shared/server';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const env = getServerEnv();
  const logger = new Logger('Bootstrap');

  const adapter = new FastifyAdapter({
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024,
    requestIdHeader: 'x-request-id',
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: false,
    rawBody: true,
  });

  const fastify = app.getHttpAdapter().getInstance();

  await app.register(cookie as never);
  await app.register(helmet as never, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  await app.register(cors as never, {
    origin: [env.APP_URL, env.API_INTERNAL_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('FrameForge AI API')
    .setDescription('AI-native video creation and editing platform API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addServer(env.APP_URL, 'Web (proxied)')
    .addServer(env.API_INTERNAL_URL, 'Direct API')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs/json',
  });

  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  logger.log(`FrameForge API listening on http://localhost:${env.API_PORT}/api/v1`);
  logger.log(`OpenAPI docs at http://localhost:${env.API_PORT}/api/docs`);
  void fastify;
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start API', error);
  process.exit(1);
});
