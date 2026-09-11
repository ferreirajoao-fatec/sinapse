import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { HealthService } from './health.service';

function criarPrismaFalso(resultado: {
  connected: boolean;
  latencyMs: number | null;
  error: string | null;
}) {
  return { checkConnection: vi.fn().mockResolvedValue(resultado) } as unknown as PrismaService;
}

describe('HealthService', () => {
  it('devolve status ok quando o banco responde', async () => {
    const service = new HealthService(
      criarPrismaFalso({ connected: true, latencyMs: 1.5, error: null }),
    );

    const resultado = await service.check();

    expect(resultado.status).toBe('ok');
    expect(resultado.app).toBe('Sinapse');
    expect(resultado.database.connected).toBe(true);
    expect(resultado.database.latencyMs).toBe(1.5);
  });

  it('devolve status degraded quando o banco falha', async () => {
    const service = new HealthService(
      criarPrismaFalso({ connected: false, latencyMs: null, error: 'conexao recusada' }),
    );

    const resultado = await service.check();

    expect(resultado.status).toBe('degraded');
    expect(resultado.database.connected).toBe(false);
    expect(resultado.database.error).toBe('conexao recusada');
  });

  it('inclui o horario e o tempo no ar', async () => {
    const service = new HealthService(
      criarPrismaFalso({ connected: true, latencyMs: 0.9, error: null }),
    );

    const resultado = await service.check();

    expect(new Date(resultado.timestamp).toString()).not.toBe('Invalid Date');
    expect(resultado.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
