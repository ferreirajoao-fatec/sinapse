import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * Colunas, tarefas, checklist e, principalmente, isolamento entre contas.
 * Requer os containers em execucao (pnpm db:up). Upload/download de anexos
 * fica de fora daqui porque depende de S3 configurado no ambiente; esse
 * fluxo foi validado manualmente (ver storage.service.ts).
 */
describe('Tarefas (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const marca = Date.now();
  const alice = {
    name: 'Alice Tarefas',
    email: `alice.tarefas.${marca}@teste.sinapse`,
    password: 'Sinapse@2026',
  };
  const bob = {
    name: 'Bob Tarefas',
    email: `bob.tarefas.${marca}@teste.sinapse`,
    password: 'Sinapse@2026',
  };

  let cookiesAlice: string[] = [];
  let cookiesBob: string[] = [];

  let colunaDaAlice = '';
  let outraColunaDaAlice = '';
  let tarefaDaAlice = '';

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
  // Colunas e tarefas
  // ---------------------------------------------------------------------------

  it('comeca com o quadro vazio', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/v1/task-columns')
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(resposta.body).toEqual([]);
  });

  it('cria coluna e tarefa', async () => {
    const coluna = await request(app.getHttpServer())
      .post('/api/v1/task-columns')
      .set('Cookie', cookiesAlice)
      .send({ name: 'A Fazer', color: 'indigo' })
      .expect(201);

    colunaDaAlice = coluna.body.id;
    expect(coluna.body.name).toBe('A Fazer');
    expect(coluna.body.tarefas).toEqual([]);

    const outraColuna = await request(app.getHttpServer())
      .post('/api/v1/task-columns')
      .set('Cookie', cookiesAlice)
      .send({ name: 'Feito', color: 'emerald' })
      .expect(201);

    outraColunaDaAlice = outraColuna.body.id;

    const tarefa = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Cookie', cookiesAlice)
      .send({ columnId: colunaDaAlice, title: 'Ler capitulo 1', priority: 'high' })
      .expect(201);

    tarefaDaAlice = tarefa.body.id;
    expect(tarefa.body.priority).toBe('high');
    expect(tarefa.body.completedAt).toBeNull();
  });

  it('devolve o quadro com a tarefa aninhada', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/v1/task-columns')
      .set('Cookie', cookiesAlice)
      .expect(200);

    const coluna = resposta.body.find((item: { id: string }) => item.id === colunaDaAlice);
    expect(coluna.tarefas).toHaveLength(1);
    expect(coluna.tarefas[0].title).toBe('Ler capitulo 1');
  });

  it('move a tarefa para outra coluna', async () => {
    const movida = await request(app.getHttpServer())
      .post(`/api/v1/tasks/${tarefaDaAlice}/mover`)
      .set('Cookie', cookiesAlice)
      .send({ columnId: outraColunaDaAlice, position: 0 })
      .expect(201);

    expect(movida.body.columnId).toBe(outraColunaDaAlice);
  });

  it('conclui a tarefa e depois reabre', async () => {
    const concluida = await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${tarefaDaAlice}`)
      .set('Cookie', cookiesAlice)
      .send({ completed: true })
      .expect(200);

    expect(concluida.body.completedAt).not.toBeNull();

    const reaberta = await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${tarefaDaAlice}`)
      .set('Cookie', cookiesAlice)
      .send({ completed: false })
      .expect(200);

    expect(reaberta.body.completedAt).toBeNull();
  });

  it('recusa vincular uma pagina que nao existe', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${tarefaDaAlice}`)
      .set('Cookie', cookiesAlice)
      .send({ pageId: '00000000-0000-0000-0000-000000000000' })
      .expect(400);
  });

  // ---------------------------------------------------------------------------
  // Checklist
  // ---------------------------------------------------------------------------

  it('adiciona, marca e remove um item do checklist', async () => {
    const comItem = await request(app.getHttpServer())
      .post(`/api/v1/tasks/${tarefaDaAlice}/checklist`)
      .set('Cookie', cookiesAlice)
      .send({ label: 'Reler as notas' })
      .expect(201);

    expect(comItem.body.totalDeChecklist).toBe(1);
    const itemId = comItem.body.checklist[0].id;

    const marcado = await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${tarefaDaAlice}/checklist/${itemId}`)
      .set('Cookie', cookiesAlice)
      .send({ done: true })
      .expect(200);

    expect(marcado.body.checklistConcluidos).toBe(1);

    await request(app.getHttpServer())
      .delete(`/api/v1/tasks/${tarefaDaAlice}/checklist/${itemId}`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    const semItem = await request(app.getHttpServer())
      .get(`/api/v1/tasks/${tarefaDaAlice}`)
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(semItem.body.totalDeChecklist).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Isolamento entre contas
  // ---------------------------------------------------------------------------

  it('o quadro do Bob nao mostra nada da Alice', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/v1/task-columns')
      .set('Cookie', cookiesBob)
      .expect(200);

    expect(resposta.body).toEqual([]);
  });

  it('o Bob nao consegue ler, alterar ou mover uma tarefa da Alice', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/tasks/${tarefaDaAlice}`)
      .set('Cookie', cookiesBob)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${tarefaDaAlice}`)
      .set('Cookie', cookiesBob)
      .send({ title: 'Invadida' })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${tarefaDaAlice}/mover`)
      .set('Cookie', cookiesBob)
      .send({ columnId: outraColunaDaAlice, position: 0 })
      .expect(403);

    const original = await request(app.getHttpServer())
      .get(`/api/v1/tasks/${tarefaDaAlice}`)
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(original.body.title).toBe('Ler capitulo 1');
  });

  it('o Bob nao consegue criar tarefa numa coluna da Alice, nem excluir a coluna', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Cookie', cookiesBob)
      .send({ columnId: colunaDaAlice, title: 'Invasao' })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/v1/task-columns/${colunaDaAlice}`)
      .set('Cookie', cookiesBob)
      .expect(403);
  });

  // ---------------------------------------------------------------------------
  // Lixeira
  // ---------------------------------------------------------------------------

  it('exclui a tarefa, mostra na lixeira e restaura', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/tasks/${tarefaDaAlice}`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    const lixeira = await request(app.getHttpServer())
      .get('/api/v1/trash')
      .set('Cookie', cookiesAlice)
      .expect(200);

    const naLixeira = lixeira.body.find((item: { id: string }) => item.id === tarefaDaAlice);
    expect(naLixeira).toBeDefined();
    expect(naLixeira.tipo).toBe('tarefa');

    await request(app.getHttpServer())
      .post(`/api/v1/trash/tarefa/${tarefaDaAlice}/restaurar`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    const restaurada = await request(app.getHttpServer())
      .get(`/api/v1/tasks/${tarefaDaAlice}`)
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(restaurada.body.id).toBe(tarefaDaAlice);
  });

  it('a lixeira do Bob nao mostra a tarefa da Alice, e ele nao consegue restaurar', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/tasks/${tarefaDaAlice}`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    const lixeira = await request(app.getHttpServer())
      .get('/api/v1/trash')
      .set('Cookie', cookiesBob)
      .expect(200);

    expect(lixeira.body).toEqual([]);

    await request(app.getHttpServer())
      .post(`/api/v1/trash/tarefa/${tarefaDaAlice}/restaurar`)
      .set('Cookie', cookiesBob)
      .expect(403);
  });

  it('excluir a coluna leva a tarefa junto, e restaurar traz tudo de volta', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/trash/tarefa/${tarefaDaAlice}/restaurar`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${tarefaDaAlice}/mover`)
      .set('Cookie', cookiesAlice)
      .send({ columnId: colunaDaAlice, position: 0 })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/task-columns/${colunaDaAlice}`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    const quadro = await request(app.getHttpServer())
      .get('/api/v1/task-columns')
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(quadro.body.find((item: { id: string }) => item.id === colunaDaAlice)).toBeUndefined();

    const lixeira = await request(app.getHttpServer())
      .get('/api/v1/trash')
      .set('Cookie', cookiesAlice)
      .expect(200);

    // Uma unica linha representa a exclusao inteira: a tarefa caiu junto.
    expect(
      lixeira.body.filter((item: { tipo: string }) => item.tipo === 'coluna_de_tarefas'),
    ).toHaveLength(1);
    expect(lixeira.body.filter((item: { tipo: string }) => item.tipo === 'tarefa')).toHaveLength(0);

    await request(app.getHttpServer())
      .post(`/api/v1/trash/coluna_de_tarefas/${colunaDaAlice}/restaurar`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    const restaurado = await request(app.getHttpServer())
      .get('/api/v1/task-columns')
      .set('Cookie', cookiesAlice)
      .expect(200);

    const coluna = restaurado.body.find((item: { id: string }) => item.id === colunaDaAlice);
    expect(coluna.tarefas).toHaveLength(1);
  });
});
