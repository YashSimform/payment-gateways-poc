import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import * as express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // disable NestJS default body parser
  });

  // Stripe webhook needs raw body
  app.use('/api/webhook', express.raw({ type: 'application/json' }));
  app.use('/api/webhook/failed', express.raw({ type: 'application/json' }));

  // Enable JSON parsing for other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Global API prefix
  app.setGlobalPrefix('api');

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;

  await app.listen(port);

  logger.log(`Server running on http://localhost:${port}`);
  logger.log(`Stripe webhook endpoint → http://localhost:${port}/api/webhook`);
}

bootstrap();