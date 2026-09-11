import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX, APP_NAME } from '@sinapse/shared';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const logger = new Logger('Bootstrap');

  const porta = Number(process.env.API_PORT ?? 3333);
  const origemWeb = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

  app.setGlobalPrefix(API_PREFIX);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());

  app.enableCors({
    origin: origemWeb,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableShutdownHooks();

  const configuracaoSwagger = new DocumentBuilder()
    .setTitle(`${APP_NAME} API`)
    .setDescription('API da plataforma de estudos, anotacoes e organizacao')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup(
    `${API_PREFIX}/docs`,
    app,
    SwaggerModule.createDocument(app, configuracaoSwagger),
  );

  await app.listen(porta, '0.0.0.0');

  logger.log(`API no ar em http://localhost:${porta}/${API_PREFIX}`);
  logger.log(`Documentacao em http://localhost:${porta}/${API_PREFIX}/docs`);
  logger.log(`Saude em http://localhost:${porta}/${API_PREFIX}/health`);
}

void bootstrap();
