import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * Eventos, recorrencia (via listagem de ocorrencias), vinculo com tarefa e,
 * principalmente, isolamento entre contas. Requer os containers em execucao
 * (pnpm db:up). O envio de e-mail do lembrete fica de fora daqui, porque
 * depende do agendamento do cron rodar de verdade; esse fluxo foi validado
 * manualmente (ver calendar-reminders.service.ts).
 */
describe('Calendario (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const marca = Date.now();
  const alice = {
    name: 'Alice Calendario',
    email: `alice.calendario.${marca}@teste.sinapse`,
    password: 'Sinapse@2026',
  };
  const bob = {
    name: 'Bob Calendario',
    email: `bob.calendario.${marca}@teste.sinapse`,
    password: 'Sinapse@2026',
  };

  let cookiesAlice: string[] = [];
  let cookiesBob: string[] = [];

  let eventoDaAlice = '';
  let eventoRecorrenteDaAlice = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    const cadastrar = async (dados: typeof alice) => {
      const resposta = await request(app.getHttpServer())
        .post('/api/v1/auth/cadastrar')
        .send(dados)
        .expect(201);

      return resposta.headers['set-cookie'] as unknown as string[];
    };

    cookiesAlice = await cadastrar(alice);
    cookiesBob = await cadastrar(bob);
  }, 40_000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [alice.email, bob.email] } } });
    await app?.close();
  });

  // ---------------------------------------------------------------------------
  // Eventos e ocorrencias
  // ---------------------------------------------------------------------------

  it('comeca sem nenhuma ocorrencia no mes', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/v1/calendar-events')
      .query({ from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T23:59:59.000Z' })
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(resposta.body).toEqual([]);
  });

  it('cria um evento simples', async () => {
    const evento = await request(app.getHttpServer())
      .post('/api/v1/calendar-events')
      .set('Cookie', cookiesAlice)
      .send({
        title: 'Prova de Banco de Dados',
        location: 'Sala 204',
        color: 'rose',
        startAt: '2026-01-10T14:00:00.000Z',
        endAt: '2026-01-10T16:00:00.000Z',
      })
      .expect(201);

    eventoDaAlice = evento.body.id;
    expect(evento.body.title).toBe('Prova de Banco de Dados');
    expect(evento.body.recurrenceFreq).toBe('none');
  });

  it('recusa evento com fim antes do inicio', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/calendar-events')
      .set('Cookie', cookiesAlice)
      .send({
        title: 'Invalido',
        startAt: '2026-01-10T16:00:00.000Z',
        endAt: '2026-01-10T14:00:00.000Z',
      })
      .expect(400);
  });

  it('cria um evento semanal recorrente', async () => {
    const evento = await request(app.getHttpServer())
      .post('/api/v1/calendar-events')
      .set('Cookie', cookiesAlice)
      .send({
        title: 'Aula de Redes',
        color: 'teal',
        startAt: '2026-01-05T18:00:00.000Z',
        endAt: '2026-01-05T20:00:00.000Z',
        recurrenceFreq: 'weekly',
        recurrenceInterval: 1,
      })
      .expect(201);

    eventoRecorrenteDaAlice = evento.body.id;
  });

  it('a listagem de ocorrencias expande o evento recorrente', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/v1/calendar-events')
      .query({ from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T23:59:59.000Z' })
      .set('Cookie', cookiesAlice)
      .expect(200);

    const doEventoUnico = resposta.body.filter(
      (item: { eventId: string }) => item.eventId === eventoDaAlice,
    );
    const doEventoRecorrente = resposta.body.filter(
      (item: { eventId: string }) => item.eventId === eventoRecorrenteDaAlice,
    );

    expect(doEventoUnico).toHaveLength(1);
    // A cada 7 dias a partir de 5/jan, dentro de janeiro: 5, 12, 19, 26.
    expect(doEventoRecorrente).toHaveLength(4);
    expect(doEventoRecorrente[0].recorrente).toBe(true);
  });

  it('atualiza o titulo e a cor do evento', async () => {
    const atualizado = await request(app.getHttpServer())
      .patch(`/api/v1/calendar-events/${eventoDaAlice}`)
      .set('Cookie', cookiesAlice)
      .send({ title: 'Prova final de Banco de Dados', color: 'amber' })
      .expect(200);

    expect(atualizado.body.title).toBe('Prova final de Banco de Dados');
    expect(atualizado.body.color).toBe('amber');
  });

  // ---------------------------------------------------------------------------
  // Vinculo com tarefa
  // ---------------------------------------------------------------------------

  it('vincula uma tarefa ao evento e o card da tarefa mostra o vinculo', async () => {
    const coluna = await request(app.getHttpServer())
      .post('/api/v1/task-columns')
      .set('Cookie', cookiesAlice)
      .send({ name: 'A Fazer' })
      .expect(201);

    const tarefa = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Cookie', cookiesAlice)
      .send({
        columnId: coluna.body.id,
        title: 'Estudar para a prova',
        calendarEventId: eventoDaAlice,
      })
      .expect(201);

    expect(tarefa.body.evento).toEqual({
      id: eventoDaAlice,
      title: 'Prova final de Banco de Dados',
      startAt: '2026-01-10T14:00:00.000Z',
    });
  });

  it('recusa vincular uma tarefa a um evento que nao existe', async () => {
    const coluna = await request(app.getHttpServer())
      .post('/api/v1/task-columns')
      .set('Cookie', cookiesAlice)
      .send({ name: 'Outra coluna' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Cookie', cookiesAlice)
      .send({
        columnId: coluna.body.id,
        title: 'Tarefa invalida',
        calendarEventId: '00000000-0000-0000-0000-000000000000',
      })
      .expect(403);
  });

  // ---------------------------------------------------------------------------
  // Isolamento entre contas
  // ---------------------------------------------------------------------------

  it('a listagem do Bob nao mostra nada da Alice', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/v1/calendar-events')
      .query({ from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T23:59:59.000Z' })
      .set('Cookie', cookiesBob)
      .expect(200);

    expect(resposta.body).toEqual([]);
  });

  it('o Bob nao consegue ler, alterar ou vincular tarefa a um evento da Alice', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/calendar-events/${eventoDaAlice}`)
      .set('Cookie', cookiesBob)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/calendar-events/${eventoDaAlice}`)
      .set('Cookie', cookiesBob)
      .send({ title: 'Invadido' })
      .expect(403);

    const coluna = await request(app.getHttpServer())
      .post('/api/v1/task-columns')
      .set('Cookie', cookiesBob)
      .send({ name: 'Coluna do Bob' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Cookie', cookiesBob)
      .send({
        columnId: coluna.body.id,
        title: 'Tentando vincular',
        calendarEventId: eventoDaAlice,
      })
      .expect(403);

    const original = await request(app.getHttpServer())
      .get(`/api/v1/calendar-events/${eventoDaAlice}`)
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(original.body.title).toBe('Prova final de Banco de Dados');
  });

  // ---------------------------------------------------------------------------
  // Lixeira
  // ---------------------------------------------------------------------------

  it('exclui o evento, mostra na lixeira e restaura', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/calendar-events/${eventoDaAlice}`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    const lixeira = await request(app.getHttpServer())
      .get('/api/v1/trash')
      .set('Cookie', cookiesAlice)
      .expect(200);

    const naLixeira = lixeira.body.find((item: { id: string }) => item.id === eventoDaAlice);
    expect(naLixeira).toBeDefined();
    expect(naLixeira.tipo).toBe('evento');

    await request(app.getHttpServer())
      .post(`/api/v1/trash/evento/${eventoDaAlice}/restaurar`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    const restaurado = await request(app.getHttpServer())
      .get(`/api/v1/calendar-events/${eventoDaAlice}`)
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(restaurado.body.id).toBe(eventoDaAlice);
  });

  it('a lixeira do Bob nao mostra o evento da Alice, e ele nao consegue restaurar', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/calendar-events/${eventoDaAlice}`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    const lixeira = await request(app.getHttpServer())
      .get('/api/v1/trash')
      .set('Cookie', cookiesBob)
      .expect(200);

    expect(lixeira.body.find((item: { id: string }) => item.id === eventoDaAlice)).toBeUndefined();

    await request(app.getHttpServer())
      .post(`/api/v1/trash/evento/${eventoDaAlice}/restaurar`)
      .set('Cookie', cookiesBob)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/trash/evento/${eventoDaAlice}/restaurar`)
      .set('Cookie', cookiesAlice)
      .expect(204);
  });
});
