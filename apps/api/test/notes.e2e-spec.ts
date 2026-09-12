import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * Hierarquia de anotacoes e, principalmente, isolamento entre contas.
 * Requer os containers em execucao (pnpm db:up). Upload/download de anexos
 * fica de fora daqui porque depende de S3 configurado no ambiente; esse
 * fluxo foi validado manualmente (ver storage.service.ts).
 */
describe('Anotacoes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const marca = Date.now();
  const alice = {
    name: 'Alice Notas',
    email: `alice.notas.${marca}@teste.sinapse`,
    password: 'Sinapse@2026',
  };
  const bob = {
    name: 'Bob Notas',
    email: `bob.notas.${marca}@teste.sinapse`,
    password: 'Sinapse@2026',
  };

  let cookiesAlice: string[] = [];
  let cookiesBob: string[] = [];

  let grupoDaAlice = '';
  let secaoDaAlice = '';
  let paginaDaAlice = '';

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
  // Hierarquia
  // ---------------------------------------------------------------------------

  it('comeca com a arvore vazia', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/v1/tree')
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(resposta.body).toEqual([]);
  });

  it('cria grupo, secao e pagina', async () => {
    const grupo = await request(app.getHttpServer())
      .post('/api/v1/groups')
      .set('Cookie', cookiesAlice)
      .send({ name: 'Faculdade', color: 'indigo' })
      .expect(201);

    grupoDaAlice = grupo.body.id;
    expect(grupo.body.name).toBe('Faculdade');
    expect(grupo.body.secoes).toEqual([]);

    const secao = await request(app.getHttpServer())
      .post('/api/v1/sections')
      .set('Cookie', cookiesAlice)
      .send({ groupId: grupoDaAlice, name: 'Banco de Dados' })
      .expect(201);

    secaoDaAlice = secao.body.id;

    const pagina = await request(app.getHttpServer())
      .post('/api/v1/pages')
      .set('Cookie', cookiesAlice)
      .send({ sectionId: secaoDaAlice, title: 'Normalizacao' })
      .expect(201);

    paginaDaAlice = pagina.body.id;
    expect(pagina.body.caminho.grupo).toBe('Faculdade');
    expect(pagina.body.caminho.secao).toBe('Banco de Dados');
  });

  it('devolve a arvore montada', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/v1/tree')
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].secoes).toHaveLength(1);
    expect(resposta.body[0].secoes[0].paginas).toHaveLength(1);
    expect(resposta.body[0].secoes[0].paginas[0].title).toBe('Normalizacao');
  });

  it('aninha subpaginas na arvore', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/pages')
      .set('Cookie', cookiesAlice)
      .send({ sectionId: secaoDaAlice, parentPageId: paginaDaAlice, title: 'Resumo 3FN' })
      .expect(201);

    const resposta = await request(app.getHttpServer())
      .get('/api/v1/tree')
      .set('Cookie', cookiesAlice)
      .expect(200);

    const paginas = resposta.body[0].secoes[0].paginas;
    expect(paginas).toHaveLength(1);
    expect(paginas[0].subpaginas).toHaveLength(1);
    expect(paginas[0].subpaginas[0].title).toBe('Resumo 3FN');
  });

  it('conta as palavras ao salvar o conteudo', async () => {
    const resposta = await request(app.getHttpServer())
      .patch(`/api/v1/pages/${paginaDaAlice}`)
      .set('Cookie', cookiesAlice)
      .send({
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'uma frase com cinco palavras' }],
            },
          ],
        },
      })
      .expect(200);

    expect(resposta.body.wordCount).toBe(5);
    expect(resposta.body.contentText).toContain('cinco palavras');
  });

  it('duplica a pagina mantendo o conteudo', async () => {
    const copia = await request(app.getHttpServer())
      .post(`/api/v1/pages/${paginaDaAlice}/duplicar`)
      .set('Cookie', cookiesAlice)
      .expect(201);

    expect(copia.body.title).toBe('Normalizacao (copia)');
    expect(copia.body.wordCount).toBe(5);

    await request(app.getHttpServer())
      .delete(`/api/v1/pages/${copia.body.id}`)
      .set('Cookie', cookiesAlice)
      .expect(204);
  });

  it('recusa mover uma pagina para dentro da propria subpagina', async () => {
    const subpagina = await request(app.getHttpServer())
      .post('/api/v1/pages')
      .set('Cookie', cookiesAlice)
      .send({ sectionId: secaoDaAlice, parentPageId: paginaDaAlice, title: 'Filha' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/pages/${paginaDaAlice}/mover`)
      .set('Cookie', cookiesAlice)
      .send({ sectionId: secaoDaAlice, parentPageId: subpagina.body.id })
      .expect(400);
  });

  // ---------------------------------------------------------------------------
  // Isolamento entre contas
  // ---------------------------------------------------------------------------

  it('a arvore do Bob nao mostra nada da Alice', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/v1/tree')
      .set('Cookie', cookiesBob)
      .expect(200);

    expect(resposta.body).toEqual([]);
  });

  it('o Bob nao consegue ler uma pagina da Alice', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/pages/${paginaDaAlice}`)
      .set('Cookie', cookiesBob)
      .expect(404);
  });

  it('o Bob nao consegue alterar uma pagina da Alice', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/pages/${paginaDaAlice}`)
      .set('Cookie', cookiesBob)
      .send({ title: 'Invadida' })
      .expect(403);

    const original = await request(app.getHttpServer())
      .get(`/api/v1/pages/${paginaDaAlice}`)
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(original.body.title).toBe('Normalizacao');
  });

  it('o Bob nao consegue excluir um grupo da Alice', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/groups/${grupoDaAlice}`)
      .set('Cookie', cookiesBob)
      .expect(403);
  });

  it('o Bob nao consegue criar uma secao dentro do grupo da Alice', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/sections')
      .set('Cookie', cookiesBob)
      .send({ groupId: grupoDaAlice, name: 'Invasao' })
      .expect(403);
  });

  it('o Bob nao consegue reordenar paginas da Alice', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/pages/reorder')
      .set('Cookie', cookiesBob)
      .send({ itens: [{ id: paginaDaAlice, position: 99 }] })
      .expect(403);
  });

  it('o Bob nao consegue duplicar uma pagina da Alice', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/pages/${paginaDaAlice}/duplicar`)
      .set('Cookie', cookiesBob)
      .expect(404);
  });

  // ---------------------------------------------------------------------------
  // Etiquetas
  // ---------------------------------------------------------------------------

  it('cria etiqueta e vincula a uma pagina', async () => {
    const etiqueta = await request(app.getHttpServer())
      .post('/api/v1/tags')
      .set('Cookie', cookiesAlice)
      .send({ name: 'Revisar', color: 'amber' })
      .expect(201);

    // O nome e normalizado para minusculas pelo schema compartilhado.
    expect(etiqueta.body.name).toBe('revisar');

    const pagina = await request(app.getHttpServer())
      .post(`/api/v1/pages/${paginaDaAlice}/etiquetas`)
      .set('Cookie', cookiesAlice)
      .send({ tagIds: [etiqueta.body.id] })
      .expect(201);

    expect(pagina.body.tags).toHaveLength(1);
    expect(pagina.body.tags[0].name).toBe('revisar');
  });

  it('recusa etiqueta repetida', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/tags')
      .set('Cookie', cookiesAlice)
      .send({ name: 'revisar' })
      .expect(409);
  });

  it('as etiquetas do Bob sao independentes das da Alice', async () => {
    const daAlice = await request(app.getHttpServer())
      .get('/api/v1/tags')
      .set('Cookie', cookiesAlice)
      .expect(200);

    const doBob = await request(app.getHttpServer())
      .get('/api/v1/tags')
      .set('Cookie', cookiesBob)
      .expect(200);

    expect(daAlice.body.length).toBeGreaterThan(0);
    expect(doBob.body).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Anexos
  // ---------------------------------------------------------------------------

  it('informa se o envio de anexos esta configurado', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/v1/pages/anexos/disponivel')
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(typeof resposta.body.habilitado).toBe('boolean');
  });

  it('o Bob nao consegue gerar url de upload nem baixar/remover anexo de uma pagina da Alice', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/pages/${paginaDaAlice}/anexos/upload-url`)
      .set('Cookie', cookiesBob)
      .send({ fileName: 'invasao.pdf', mimeType: 'application/pdf', sizeBytes: 1024 })
      .expect(403);

    const anexoInexistente = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer())
      .get(`/api/v1/pages/${paginaDaAlice}/anexos/${anexoInexistente}/download-url`)
      .set('Cookie', cookiesBob)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/v1/pages/${paginaDaAlice}/anexos/${anexoInexistente}`)
      .set('Cookie', cookiesBob)
      .expect(404);
  });

  it('a Alice recebe 404 ao buscar download de um anexo que nao existe', async () => {
    const anexoInexistente = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer())
      .get(`/api/v1/pages/${paginaDaAlice}/anexos/${anexoInexistente}/download-url`)
      .set('Cookie', cookiesAlice)
      .expect(404);
  });

  // ---------------------------------------------------------------------------
  // Lixeira
  // ---------------------------------------------------------------------------

  it('exclui a pagina, mostra na lixeira e restaura com as subpaginas', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/pages/${paginaDaAlice}`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    const arvore = await request(app.getHttpServer())
      .get('/api/v1/tree')
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(arvore.body[0].secoes[0].paginas).toHaveLength(0);

    const lixeira = await request(app.getHttpServer())
      .get('/api/v1/trash')
      .set('Cookie', cookiesAlice)
      .expect(200);

    const naLixeira = lixeira.body.find((item: { id: string }) => item.id === paginaDaAlice);
    expect(naLixeira).toBeDefined();
    expect(naLixeira.tipo).toBe('pagina');

    // As subpaginas cairam junto e nao aparecem como linhas separadas (a
    // lixeira pode ter outras paginas de testes anteriores, como a copia
    // ja excluida no teste de duplicar).
    const nomesDePaginasNaLixeira = lixeira.body
      .filter((item: { tipo: string }) => item.tipo === 'pagina')
      .map((item: { nome: string }) => item.nome);

    expect(nomesDePaginasNaLixeira).toContain('Normalizacao');
    expect(nomesDePaginasNaLixeira).not.toContain('Resumo 3FN');
    expect(nomesDePaginasNaLixeira).not.toContain('Filha');

    await request(app.getHttpServer())
      .post(`/api/v1/trash/pagina/${paginaDaAlice}/restaurar`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    const depois = await request(app.getHttpServer())
      .get('/api/v1/tree')
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(depois.body[0].secoes[0].paginas).toHaveLength(1);
    expect(depois.body[0].secoes[0].paginas[0].subpaginas.length).toBeGreaterThan(0);
  });

  it('a lixeira do Bob nao mostra itens da Alice', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/pages/${paginaDaAlice}`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    const lixeira = await request(app.getHttpServer())
      .get('/api/v1/trash')
      .set('Cookie', cookiesBob)
      .expect(200);

    expect(lixeira.body).toEqual([]);

    await request(app.getHttpServer())
      .post(`/api/v1/trash/pagina/${paginaDaAlice}/restaurar`)
      .set('Cookie', cookiesBob)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/trash/pagina/${paginaDaAlice}/restaurar`)
      .set('Cookie', cookiesAlice)
      .expect(204);
  });

  it('excluir o grupo leva secoes e paginas, e restaurar traz tudo de volta', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/groups/${grupoDaAlice}`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    const vazia = await request(app.getHttpServer())
      .get('/api/v1/tree')
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(vazia.body).toEqual([]);

    // Uma unica linha na lixeira representa a exclusao inteira.
    const lixeira = await request(app.getHttpServer())
      .get('/api/v1/trash')
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(lixeira.body).toHaveLength(1);
    expect(lixeira.body[0].tipo).toBe('grupo');

    await request(app.getHttpServer())
      .post(`/api/v1/trash/grupo/${grupoDaAlice}/restaurar`)
      .set('Cookie', cookiesAlice)
      .expect(204);

    const restaurada = await request(app.getHttpServer())
      .get('/api/v1/tree')
      .set('Cookie', cookiesAlice)
      .expect(200);

    expect(restaurada.body).toHaveLength(1);
    expect(restaurada.body[0].secoes[0].paginas.length).toBeGreaterThan(0);
  });
});
