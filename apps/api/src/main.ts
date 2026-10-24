import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/response/response.interceptor';
import { CORS_ORIGIN, getAppPort, getTrustProxyHops } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const trustProxyHops = getTrustProxyHops(configService);

  app.enableShutdownHooks();
  if (trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }
  app.enableCors({
    origin: getCorsOrigins(configService),
    credentials: false,
  });
  app.useGlobalFilters(new HttpExceptionFilter(nodeEnv));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Seven AI Search API')
      .setDescription('AI powered resource search platform')
      .setVersion('1.0')
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument);
  }

  const port = getAppPort(configService);
  await app.listen(port, configService.get<string>('APP_HOST') ?? '127.0.0.1');
}

void bootstrap();

function getCorsOrigins(configService: ConfigService): string[] | boolean {
  const origins = (configService.get<string>(CORS_ORIGIN) ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length > 0) {
    return origins;
  }

  return (configService.get<string>('NODE_ENV') ?? 'development') !== 'production';
}
