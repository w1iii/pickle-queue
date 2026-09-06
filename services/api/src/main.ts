import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '../../.env') });
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: ['http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
