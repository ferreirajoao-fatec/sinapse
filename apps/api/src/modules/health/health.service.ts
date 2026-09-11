import { Injectable } from '@nestjs/common';
import { APP_NAME, type HealthResponse } from '@sinapse/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Reune as informacoes de saude da aplicacao: identificacao, tempo no ar
 * e o resultado do teste de conexao com o banco de dados.
 */
@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    const database = await this.prisma.checkConnection();

    return {
      status: database.connected ? 'ok' : 'degraded',
      app: APP_NAME,
      version: process.env.npm_package_version ?? '0.1.0',
      environment: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      database,
    };
  }
}
