import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cors from 'cors';
import { AppModule } from './app.module';
import { BigIntSerializerInterceptor } from './common/interceptors/bigint-serializer.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers & CORS
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: '*', credentials: true }));

  // Global Interceptors & Validation
  app.useGlobalInterceptors(new BigIntSerializerInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Personal Money Manager REST API')
    .setDescription(
      'Type-safe REST API for Personal Money Manager Web & Mobile (iOS / Android) Applications.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Personal Money Manager REST API running on http://localhost:${port}`);
  console.log(`📚 Interactive Swagger API Documentation at http://localhost:${port}/api/docs`);
}
bootstrap();
