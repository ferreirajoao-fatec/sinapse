import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HealthResponse } from '@sinapse/shared';
import { Publico } from '../../common/decorators/publico.decorator';
import { HealthService } from './health.service';

@ApiTags('Saude')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Publico()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verifica se a API esta no ar e se o banco de dados responde',
  })
  @ApiOkResponse({
    description: 'Estado atual da API e do banco de dados',
    schema: {
      example: {
        status: 'ok',
        app: 'Sinapse',
        version: '0.1.0',
        environment: 'development',
        timestamp: '2026-08-05T12:00:00.000Z',
        uptimeSeconds: 42,
        database: { connected: true, latencyMs: 1.23, error: null },
      },
    },
  })
  check(): Promise<HealthResponse> {
    return this.healthService.check();
  }
}
