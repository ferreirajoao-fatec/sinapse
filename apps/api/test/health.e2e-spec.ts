import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

/**
 * Teste de integracao: sobe a aplicacao inteira e chama o endpoint de saude.
 * Requer o banco de dados em execucao (pnpm db:up).
 */
describe('GET /api/v1/health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  it('responde 200 com o status da aplicacao e do banco', async () => {
    const resposta = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(resposta.body.app).toBe('Sinapse');
    expect(['ok', 'degraded']).toContain(resposta.body.status);
    expect(resposta.body.database).toHaveProperty('connected');
  });
});
