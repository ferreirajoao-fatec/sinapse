import type { AddressInfo } from 'node:net';
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import * as Y from 'yjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  CAMINHO_DA_COLABORACAO,
  ColaboracaoService,
} from '../src/modules/notes/colaboracao/colaboracao.service';
import { CAMPO_DO_EDITOR, yDocParaJson } from '../src/modules/notes/colaboracao/documento-yjs';

/**
 * Edicao em tempo real: conexoes WebSocket de verdade, com o mesmo provider
 * que o navegador usa, contra a API escutando numa porta aleatoria.
 * Requer os containers em execucao (pnpm db:up).
 */

const ORIGEM_DO_WEB = process.env.WEB_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:3000';

/** O navegador sempre manda Origin; o ws do Node so manda se pedirmos. */
function socketComOrigem(origem: string) {
  return class extends WebSocket {
    constructor(url: string, protocolos?: string | string[]) {
      super(url, protocolos, { headers: { Origin: origem } });
      // No Node, fechar um socket que ainda esta conectando (fim do teste
      // durante uma reconexao) emite 'error'; o provider ja soltou os proprios
      // handlers nessa hora. O navegador nao faz isso, entao aqui so ignoramos.
      this.on('error', () => undefined);
    }
  };
}

interface Sessao {
  provider: HocuspocusProvider;
  socket: HocuspocusProviderWebsocket;
  ydoc: Y.Doc;
  fechada: () => boolean;
}

async function esperar(condicao: () => boolean, limiteMs = 5000): Promise<void> {
  const inicio = Date.now();

  while (!condicao()) {
    if (Date.now() - inicio > limiteMs) {
      throw new Error('Tempo esgotado esperando a condicao');
    }
    await new Promise((resolver) => setTimeout(resolver, 25));
  }
}

function textoDo(ydoc: Y.Doc): string {
  return JSON.stringify(yDocParaJson(ydoc));
}

function escreverParagrafo(ydoc: Y.Doc, texto: string): void {
  const paragrafo = new Y.XmlElement('paragraph');
  const conteudo = new Y.XmlText();
  conteudo.insert(0, texto);
  paragrafo.insert(0, [conteudo]);
  ydoc.getXmlFragment(CAMPO_DO_EDITOR).push([paragrafo]);
}

describe('Colaboracao em tempo real (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let colaboracao: ColaboracaoService;
  let urlDoWs = '';

  const marca = Date.now();
  const conta = (nome: string) => ({
    name: nome,
    email: `${nome.toLowerCase()}.colab.${marca}@teste.sinapse`,
    password: 'Sinapse@2026',
  });

  const dona = conta('Dona');
  const editor = conta('Editor');
  const leitor = conta('Leitor');
  const estranho = conta('Estranho');
  const pessoas = [dona, editor, leitor, estranho];

  const cookies: Record<string, string[]> = {};
  const ids: Record<string, string> = {};
  const abertas: Sessao[] = [];

  let secao = '';
  let pagina = '';
  let outraPagina = '';

  const api = () => request(app.getHttpServer());

  async function ticket(nome: string, paginaId = pagina) {
    const resposta = await api()
      .post(`/api/v1/pages/${paginaId}/colaboracao`)
      .set('Cookie', cookies[nome]!)
      .expect(201);

    return resposta.body as { token: string; documento: string; permissao: string };
  }

  /** Abre uma sessao e resolve quando sincroniza ou quando a autenticacao falha. */
  async function conectar(
    token: string,
    documento: string,
    origem = ORIGEM_DO_WEB,
  ): Promise<Sessao & { autenticada: boolean }> {
    const ydoc = new Y.Doc();
    let fechada = false;

    const socket = new HocuspocusProviderWebsocket({
      url: urlDoWs,
      WebSocketPolyfill: socketComOrigem(origem),
      // Nos testes, uma tentativa basta; a reconexao e do navegador.
      maxAttempts: 1,
    });

    const resultado = await new Promise<boolean>((resolver) => {
      const provider = new HocuspocusProvider({
        websocketProvider: socket,
        name: documento,
        token,
        document: ydoc,
        onSynced: () => resolver(true),
        onAuthenticationFailed: () => resolver(false),
        onClose: () => {
          fechada = true;
          resolver(false);
        },
      });

      abertas.push({ provider, socket, ydoc, fechada: () => fechada });
    });

    const sessao = abertas[abertas.length - 1]!;
    return { ...sessao, autenticada: resultado };
  }

  /** Pede o ticket como a pessoa e abre a pagina principal no editor. */
  async function abrir(nome: string) {
    const { token, documento } = await ticket(nome);
    return conectar(token, documento);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0, '127.0.0.1');

    const { port } = app.getHttpServer().address() as AddressInfo;
    urlDoWs = `ws://127.0.0.1:${port}${CAMINHO_DA_COLABORACAO}`;

    prisma = app.get(PrismaService);
    colaboracao = app.get(ColaboracaoService);

    for (const pessoa of pessoas) {
      const resposta = await api().post('/api/v1/auth/cadastrar').send(pessoa).expect(201);
      cookies[pessoa.name] = resposta.headers['set-cookie'] as unknown as string[];
    }

    const usuarios = await prisma.user.findMany({
      where: { email: { in: pessoas.map((pessoa) => pessoa.email) } },
      select: { id: true, name: true },
    });
    for (const usuario of usuarios) ids[usuario.name] = usuario.id;

    const grupo = await api()
      .post('/api/v1/groups')
      .set('Cookie', cookies.Dona!)
      .send({ name: 'Equipe', color: 'violet' })
      .expect(201);

    const criada = await api()
      .post('/api/v1/sections')
      .set('Cookie', cookies.Dona!)
      .send({ groupId: grupo.body.id, name: 'Relatorio' })
      .expect(201);
    secao = criada.body.id;

    const paginaCriada = await api()
      .post('/api/v1/pages')
      .set('Cookie', cookies.Dona!)
      .send({ sectionId: secao, title: 'Rascunho' })
      .expect(201);
    pagina = paginaCriada.body.id;

    const outra = await api()
      .post('/api/v1/pages')
      .set('Cookie', cookies.Dona!)
      .send({ sectionId: secao, title: 'Outra' })
      .expect(201);
    outraPagina = outra.body.id;

    // Conteudo salvo antes da colaboracao existir: e dele que o documento parte.
    await api()
      .patch(`/api/v1/pages/${pagina}`)
      .set('Cookie', cookies.Dona!)
      .send({
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'texto de antes', marks: [{ type: 'bold' }] }],
            },
          ],
        },
      })
      .expect(200);

    for (const [email, role] of [
      [editor.email, 'editor'],
      [leitor.email, 'viewer'],
    ] as const) {
      await api()
        .post(`/api/v1/sections/${secao}/membros`)
        .set('Cookie', cookies.Dona!)
        .send({ email, role })
        .expect(201);
    }
  }, 60_000);

  afterEach(() => {
    while (abertas.length > 0) {
      const sessao = abertas.pop()!;
      sessao.provider.destroy();
      sessao.socket.destroy();
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: pessoas.map((pessoa) => pessoa.email) } },
    });
    await app?.close();
  });

  // ---------------------------------------------------------------------------
  // Ticket
  // ---------------------------------------------------------------------------

  it('emite o ticket com a permissao de cada um e recusa quem nao tem acesso', async () => {
    expect((await ticket('Dona')).permissao).toBe('dono');
    expect((await ticket('Editor')).permissao).toBe('editor');
    expect((await ticket('Leitor')).permissao).toBe('leitor');

    await api()
      .post(`/api/v1/pages/${pagina}/colaboracao`)
      .set('Cookie', cookies.Estranho!)
      .expect(404);

    await api().post(`/api/v1/pages/${pagina}/colaboracao`).expect(401);
  });

  it('o ticket nao serve como token de sessao nas outras rotas', async () => {
    const { token } = await ticket('Dona');

    await api().get('/api/v1/tree').set('Authorization', `Bearer ${token}`).expect(401);
  });

  // ---------------------------------------------------------------------------
  // Conexao
  // ---------------------------------------------------------------------------

  it('ao conectar, o documento parte do conteudo que ja estava salvo', async () => {
    const { token, documento } = await ticket('Dona');
    const sessao = await conectar(token, documento);

    expect(sessao.autenticada).toBe(true);
    expect(yDocParaJson(sessao.ydoc)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'texto de antes', marks: [{ type: 'bold' }] }],
        },
      ],
    });
  });

  it('o que o editor escreve aparece na hora para a dona e para o leitor', async () => {
    const daDona = await abrir('Dona');
    const doEditor = await abrir('Editor');
    const doLeitor = await abrir('Leitor');

    expect([daDona.autenticada, doEditor.autenticada, doLeitor.autenticada]).toEqual([
      true,
      true,
      true,
    ]);

    escreverParagrafo(doEditor.ydoc, 'escrito pelo editor');

    await esperar(() => textoDo(daDona.ydoc).includes('escrito pelo editor'));
    await esperar(() => textoDo(doLeitor.ydoc).includes('escrito pelo editor'));
  });

  it('o servidor descarta o que o leitor tenta escrever', async () => {
    const daDona = await abrir('Dona');
    const doLeitor = await abrir('Leitor');

    escreverParagrafo(doLeitor.ydoc, 'tentativa do leitor');
    escreverParagrafo(daDona.ydoc, 'marcador da dona');

    // Quando o marcador da dona chega ao leitor, a escrita dele ja teria
    // chegado a dona se o servidor a tivesse aceitado.
    await esperar(() => textoDo(doLeitor.ydoc).includes('marcador da dona'));
    await new Promise((resolver) => setTimeout(resolver, 300));

    expect(textoDo(daDona.ydoc)).not.toContain('tentativa do leitor');

    await colaboracao.gravarPendentes();
    const salva = await api()
      .get(`/api/v1/pages/${pagina}`)
      .set('Cookie', cookies.Dona!)
      .expect(200);
    expect(salva.body.contentText).not.toContain('tentativa do leitor');
  });

  it('grava o documento e atualiza o conteudo, o texto e a contagem de palavras', async () => {
    const doEditor = await abrir('Editor');

    escreverParagrafo(doEditor.ydoc, 'persistido no banco');
    await esperar(() =>
      colaboracao.hocuspocus.debouncer.isDebounced(`onStoreDocument-pagina:${pagina}`),
    );
    await colaboracao.gravarPendentes();

    const salva = await api()
      .get(`/api/v1/pages/${pagina}`)
      .set('Cookie', cookies.Dona!)
      .expect(200);

    expect(salva.body.contentText).toContain('persistido no banco');
    expect(salva.body.contentText).toContain('escrito pelo editor');
    expect(salva.body.wordCount).toBeGreaterThan(5);

    const noBanco = await prisma.page.findFirst({
      where: { id: pagina },
      select: { yjsState: true },
    });
    expect(noBanco?.yjsState?.length).toBeGreaterThan(0);
  });

  it('reabrir depois de gravado carrega o estado Yjs salvo', async () => {
    await colaboracao.gravarPendentes();
    await esperar(() => !colaboracao.hocuspocus.documents.has(`pagina:${pagina}`));

    const nova = await abrir('Dona');

    expect(textoDo(nova.ydoc)).toContain('persistido no banco');
    expect(textoDo(nova.ydoc)).toContain('texto de antes');
  });

  // ---------------------------------------------------------------------------
  // Seguranca
  // ---------------------------------------------------------------------------

  it('recusa ticket invalido ou emitido para outra pagina', async () => {
    const invalido = await conectar('nao-e-um-token', `pagina:${pagina}`);
    expect(invalido.autenticada).toBe(false);

    const { token } = await ticket('Dona', outraPagina);
    const trocado = await conectar(token, `pagina:${pagina}`);
    expect(trocado.autenticada).toBe(false);
  });

  it('recusa conexoes vindas de outro site', async () => {
    const recusada = await new Promise<number>((resolver) => {
      const socket = new WebSocket(urlDoWs, {
        headers: { Origin: 'https://site-malicioso.exemplo' },
      });
      socket.on('unexpected-response', (_requisicao, resposta) =>
        resolver(resposta.statusCode ?? 0),
      );
      socket.on('open', () => resolver(101));
      socket.on('error', () => resolver(-1));
    });

    expect(recusada).toBe(403);
  });

  it('rebaixar o editor derruba a conexao, e ela volta sozinha em modo leitura', async () => {
    // Como no navegador: cada tentativa de conexao pede um ticket novo.
    const ydoc = new Y.Doc();
    let escopo: string | undefined;
    let quedas = 0;
    const socket = new HocuspocusProviderWebsocket({
      url: urlDoWs,
      WebSocketPolyfill: socketComOrigem(ORIGEM_DO_WEB),
      delay: 50,
      minDelay: 50,
    });
    const provider = new HocuspocusProvider({
      websocketProvider: socket,
      name: `pagina:${pagina}`,
      document: ydoc,
      token: async () => (await ticket('Editor')).token,
      onAuthenticated: () => {
        escopo = provider.authorizedScope;
      },
      onDisconnect: () => {
        quedas += 1;
      },
    });
    abertas.push({ provider, socket, ydoc, fechada: () => quedas > 0 });

    await esperar(() => escopo === 'read-write');

    await api()
      .patch(`/api/v1/sections/${secao}/membros/${ids.Editor}`)
      .set('Cookie', cookies.Dona!)
      .send({ role: 'viewer' })
      .expect(200);

    await esperar(() => quedas > 0);
    await esperar(() => escopo === 'readonly', 10_000);
  });

  it('remover o acesso derruba a conexao e o ticket deixa de ser emitido', async () => {
    const doLeitor = await abrir('Leitor');
    expect(doLeitor.autenticada).toBe(true);

    await api()
      .delete(`/api/v1/sections/${secao}/membros/${ids.Leitor}`)
      .set('Cookie', cookies.Dona!)
      .expect(204);

    await esperar(() => doLeitor.fechada());

    await api()
      .post(`/api/v1/pages/${pagina}/colaboracao`)
      .set('Cookie', cookies.Leitor!)
      .expect(404);
  });

  it('conteudo trocado pela API entra ao vivo para quem esta com a pagina aberta', async () => {
    const daDona = await abrir('Dona');

    await api()
      .patch(`/api/v1/pages/${pagina}`)
      .set('Cookie', cookies.Dona!)
      .send({
        content: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'substituido pela api' }] },
          ],
        },
      })
      .expect(200);

    await esperar(() => textoDo(daDona.ydoc).includes('substituido pela api'));
    expect(textoDo(daDona.ydoc)).not.toContain('persistido no banco');
  });

  it('excluir a pagina fecha as conexoes abertas', async () => {
    const daDona = await abrir('Dona');

    await api().delete(`/api/v1/pages/${pagina}`).set('Cookie', cookies.Dona!).expect(204);

    await esperar(() => daDona.fechada());
  });
});
