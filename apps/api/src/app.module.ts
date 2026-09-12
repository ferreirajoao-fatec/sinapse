import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'node:path';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PrismaModule } from './common/prisma/prisma.module';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mail/mail.module';
import { NotesModule } from './modules/notes/notes.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // O .env fica na raiz do monorepo e serve aos dois aplicativos.
      envFilePath: [join(process.cwd(), '../../.env'), join(process.cwd(), '.env')],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ name: 'padrao', ttl: 60_000, limit: 120 }]),
    JwtModule.register({ global: true }),
    PrismaModule,
    MailModule,
    HealthModule,
    AuthModule,
    UsersModule,
    NotesModule,
    TasksModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Ordem importa: o limite de requisicoes roda antes da autenticacao.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
