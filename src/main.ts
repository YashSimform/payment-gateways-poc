import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Payment Gateway API')
    .setDescription(
      'REST API for user authentication and Stripe-powered payment processing. ' +
      'Register and log in to obtain a JWT token, then use it to create payments. ' +
      'Payment status is updated automatically via Stripe webhooks.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .addTag('Auth', 'User registration and login')
    .addTag('Payments', 'Create and retrieve payments (JWT required)')
    .addTag('Webhook', 'Stripe webhook event handlers (called by Stripe only)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;

  await app.listen(port);

  logger.log(`Server running on http://localhost:${port}`);
  logger.log(`Swagger docs  → http://localhost:${port}/docs`);
  logger.log(`Stripe webhook endpoint → http://localhost:${port}/api/webhook`);
}

bootstrap();