import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * Secoes compartilhadas: a dona convida, o editor edita, o leitor so le,
 * e quem nao foi convidado continua sem enxergar nada.
 * Requer os containers em execucao (pnpm db:up).
 */
describe('Compartilhamento de secoes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const marca = Date.now();
  const conta = (nome: string) => ({
    name: nome,
    email: `${nome.toLowerCase()}.compartilha.${marca}@teste.sinapse`,
    password: 'Sinapse@2026',
  });

  const dona = conta('Dona');
  const editor = conta('Editor');
  const leitor = conta('Leitor');
  const estranho = conta('Estranho');

  const cookies: Record<string, string[]> = {};
  const ids: Record<string, string> = {};

  let secao = '';
  let outraSecaoDaDona = '';
  let pagina = '';

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    for (const pessoa of [dona, editor, leitor, estranho]) {
      const resposta = await api().post('/api/v1/auth/cadastrar').send(pessoa).expect(201);
      cookies[pessoa.name] = resposta.headers['set-cookie'] as unknown as string[];
    }

    // O id vem do banco para nao depender do formato da resposta do cadastro.
    const usuarios = await prisma.user.findMany({
      where: { email: { in: [dona.email, editor.email, leitor.email, estranho.email] } },
      select: { id: true, name: true },
    });
    for (const usuario of usuarios) ids[usuario.name] = usuario.id;

    const grupo = await api()
      .post('/api/v1/groups')
      .set('Cookie', cookies.Dona!)
      .send({ name: 'Projeto', color: 'teal' })
      .expect(201);

    const criada = await api()
      .post('/api/v1/sections')
      .set('Cookie', cookies.Dona!)
      .send({ groupId: grupo.body.id, name: 'TCC' })
      .expect(201);
    secao = criada.body.id;

    const outra = await api()
      .post('/api/v1/sections')
      .set('Cookie', cookies.Dona!)
      .send({ groupId: grupo.body.id, name: 'Particular' })
      .expect(201);
    outraSecaoDaDona = outra.body.id;

    const criadaPagina = await api()
      .post('/api/v1/pages')
      .set('Cookie', cookies.Dona!)
      .send({ sectionId: secao, title: 'Introducao' })
      .expect(201);
    pagina = criadaPagina.body.id;
  }, 60_000);

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [dona.email, editor.email, leitor.email, estranho.email] } },
    });
    await app?.close();
  });

  // ---------------------------------------------------------------------------
  // Gestao de membros
  // ---------------------------------------------------------------------------

  it('a dona convida um editor e um leitor pelo e-mail', async () => {
    await api()
      .post(`/api/v1/sections/${secao}/membros`)
      .set('Cookie', cookies.Dona!)
      .send({ email: editor.email, role: 'editor' })
      .expect(201);

    const resposta = await api()
      .post(`/api/v1/sections/${secao}/membros`)
      .set('Cookie', cookies.Dona!)
      .send({ email: leitor.email.toUpperCase() })
      .expect(201);

    expect(resposta.body.podeGerenciar).toBe(true);
    expect(resposta.body.membros.map((m: { role: string }) => m.role)).toEqual([
      'owner',
      'editor',
      'viewer',
    ]);
  });

  it('recusa convidar o mesmo e-mail duas vezes, a propria dona ou um e-mail sem conta', async () => {
    await api()
      .post(`/api/v1/sections/${secao}/membros`)
      .set('Cookie', cookies.Dona!)
      .send({ email: editor.email })
      .expect(409);

    await api()
      .post(`/api/v1/sections/${secao}/membros`)
      .set('Cookie', cookies.Dona!)
      .send({ email: dona.email })
      .expect(400);

    await api()
      .post(`/api/v1/sections/${secao}/membros`)
      .set('Cookie', cookies.Dona!)
      .send({ email: `ninguem.${marca}@teste.sinapse` })
      .expect(404);
  });

  it('so a dona gerencia: o editor nao convida nem troca papeis', async () => {
    await api()
      .post(`/api/v1/sections/${secao}/membros`)
      .set('Cookie', cookies.Editor!)
      .send({ email: estranho.email })
      .expect(403);

    await api()
      .patch(`/api/v1/sections/${secao}/membros/${ids.Leitor}`)
      .set('Cookie', cookies.Editor!)
      .send({ role: 'editor' })
      .expect(403);

    await api()
      .delete(`/api/v1/sections/${secao}/membros/${ids.Leitor}`)
      .set('Cookie', cookies.Editor!)
      .expect(403);
  });

  it('membros veem a lista, mas sem poder gerenciar; estranhos nao veem', async () => {
    const resposta = await api()
      .get(`/api/v1/sections/${secao}/membros`)
      .set('Cookie', cookies.Leitor!)
      .expect(200);

    expect(resposta.body.podeGerenciar).toBe(false);
    expect(resposta.body.membros).toHaveLength(3);

    await api()
      .get(`/api/v1/sections/${secao}/membros`)
      .set('Cookie', cookies.Estranho!)
      .expect(404);
  });

  it('a secao aparece em "Compartilhadas comigo" com a permissao certa', async () => {
    const doEditor = await api()
      .get('/api/v1/sections/compartilhadas')
      .set('Cookie', cookies.Editor!)
      .expect(200);

    expect(doEditor.body).toHaveLength(1);
    expect(doEditor.body[0].name).toBe('TCC');
    expect(doEditor.body[0].permissao).toBe('editor');
    expect(doEditor.body[0].dono.nome).toBe('Dona');
    expect(doEditor.body[0].paginas[0].title).toBe('Introducao');

    const doLeitor = await api()
      .get('/api/v1/sections/compartilhadas')
      .set('Cookie', cookies.Leitor!)
      .expect(200);
    expect(doLeitor.body[0].permissao).toBe('leitor');

    const doEstranho = await api()
      .get('/api/v1/sections/compartilhadas')
      .set('Cookie', cookies.Estranho!)
      .expect(200);
    expect(doEstranho.body).toEqual([]);
  });

  it('a arvore da dona mostra quantos membros a secao tem', async () => {
    const resposta = await api().get('/api/v1/tree').set('Cookie', cookies.Dona!).expect(200);
    const secoes = resposta.body[0].secoes as { id: string; totalDeMembros: number }[];

    expect(secoes.find((item) => item.id === secao)?.totalDeMembros).toBe(2);
    expect(secoes.find((item) => item.id === outraSecaoDaDona)?.totalDeMembros).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Permissoes nas paginas
  // ---------------------------------------------------------------------------

  it('cada um recebe a pagina com a propria permissao', async () => {
    for (const [nome, permissao] of [
      ['Dona', 'dono'],
      ['Editor', 'editor'],
      ['Leitor', 'leitor'],
    ] as const) {
      const resposta = await api()
        .get(`/api/v1/pages/${pagina}`)
        .set('Cookie', cookies[nome]!)
        .expect(200);
      expect(resposta.body.permissao).toBe(permissao);
    }

    await api().get(`/api/v1/pages/${pagina}`).set('Cookie', cookies.Estranho!).expect(404);
  });

  it('o editor edita o conteudo e cria paginas na secao', async () => {
    const editada = await api()
      .patch(`/api/v1/pages/${pagina}`)
      .set('Cookie', cookies.Editor!)
      .send({
        title: 'Introducao revisada',
        content: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'feito em equipe' }] }],
        },
      })
      .expect(200);

    expect(editada.body.title).toBe('Introducao revisada');
    expect(editada.body.wordCount).toBe(3);

    const nova = await api()
      .post('/api/v1/pages')
      .set('Cookie', cookies.Editor!)
      .send({ sectionId: secao, title: 'Metodologia' })
      .expect(201);
    expect(nova.body.permissao).toBe('editor');
  });

  it('o leitor le, mas nao edita, nao cria, nao exclui e nao duplica', async () => {
    await api()
      .patch(`/api/v1/pages/${pagina}`)
      .set('Cookie', cookies.Leitor!)
      .send({ title: 'Invadido' })
      .expect(403);

    await api()
      .post('/api/v1/pages')
      .set('Cookie', cookies.Leitor!)
      .send({ sectionId: secao, title: 'Nao deveria' })
      .expect(403);

    await api().delete(`/api/v1/pages/${pagina}`).set('Cookie', cookies.Leitor!).expect(403);

    await api().post(`/api/v1/pages/${pagina}/duplicar`).set('Cookie', cookies.Leitor!).expect(403);

    const resposta = await api()
      .get(`/api/v1/pages/${pagina}`)
      .set('Cookie', cookies.Dona!)
      .expect(200);
    expect(resposta.body.title).toBe('Introducao revisada');
  });

  it('favoritar e so da dona, porque vale para todos que veem a pagina', async () => {
    await api()
      .patch(`/api/v1/pages/${pagina}`)
      .set('Cookie', cookies.Editor!)
      .send({ isFavorite: true })
      .expect(403);
  });

  it('o editor nao alcanca as outras secoes nem o grupo da dona', async () => {
    await api()
      .post('/api/v1/pages')
      .set('Cookie', cookies.Editor!)
      .send({ sectionId: outraSecaoDaDona, title: 'Intruso' })
      .expect(403);

    await api()
      .patch(`/api/v1/sections/${secao}`)
      .set('Cookie', cookies.Editor!)
      .send({ name: 'Renomeada' })
      .expect(403);

    await api().delete(`/api/v1/sections/${secao}`).set('Cookie', cookies.Editor!).expect(403);

    const arvore = await api().get('/api/v1/tree').set('Cookie', cookies.Editor!).expect(200);
    expect(arvore.body).toEqual([]);
  });

  it('o editor nao move a pagina para uma secao propria', async () => {
    const grupo = await api()
      .post('/api/v1/groups')
      .set('Cookie', cookies.Editor!)
      .send({ name: 'Meu', color: 'rose' })
      .expect(201);
    const minha = await api()
      .post('/api/v1/sections')
      .set('Cookie', cookies.Editor!)
      .send({ groupId: grupo.body.id, name: 'Minha' })
      .expect(201);

    await api()
      .post(`/api/v1/pages/${pagina}/mover`)
      .set('Cookie', cookies.Editor!)
      .send({ sectionId: minha.body.id })
      .expect(403);
  });

  // ---------------------------------------------------------------------------
  // Troca de papel e saida
  // ---------------------------------------------------------------------------

  it('rebaixar o editor para leitor corta a edicao na hora', async () => {
    await api()
      .patch(`/api/v1/sections/${secao}/membros/${ids.Editor}`)
      .set('Cookie', cookies.Dona!)
      .send({ role: 'viewer' })
      .expect(200);

    await api()
      .patch(`/api/v1/pages/${pagina}`)
      .set('Cookie', cookies.Editor!)
      .send({ title: 'Depois de rebaixado' })
      .expect(403);
  });

  it('o leitor pode sair da secao e perde o acesso', async () => {
    await api()
      .delete(`/api/v1/sections/${secao}/membros/${ids.Leitor}`)
      .set('Cookie', cookies.Leitor!)
      .expect(204);

    await api().get(`/api/v1/pages/${pagina}`).set('Cookie', cookies.Leitor!).expect(404);
  });

  it('a secao na lixeira some para os membros', async () => {
    await api().delete(`/api/v1/sections/${secao}`).set('Cookie', cookies.Dona!).expect(204);

    const resposta = await api()
      .get('/api/v1/sections/compartilhadas')
      .set('Cookie', cookies.Editor!)
      .expect(200);
    expect(resposta.body).toEqual([]);

    await api().get(`/api/v1/pages/${pagina}`).set('Cookie', cookies.Editor!).expect(404);
  });
});
