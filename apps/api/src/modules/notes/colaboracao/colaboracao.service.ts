import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { ResetConnection } from '@hocuspocus/common';
import { Hocuspocus, type onAuthenticatePayload } from '@hocuspocus/server';
import {
  Injectable,
  NotFoundException,
  type BeforeApplicationShutdown,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { API_PREFIX, type PermissaoNaSecao } from '@sinapse/shared';
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { comoJson, contarPalavras, extrairTexto } from '../notes.helpers';
import { SharingService } from '../sharing.service';
import { CAMPO_DO_EDITOR, preencherYDoc, yDocParaJson, type NoJson } from './documento-yjs';

/** Caminho do WebSocket, junto das demais rotas da API. */
export const CAMINHO_DA_COLABORACAO = `/${API_PREFIX}/colaboracao`;

const PREFIXO_DO_DOCUMENTO = 'pagina:';
const FORMATO_DO_DOCUMENTO =
  /^pagina:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** O ticket so serve para abrir a conexao; depois ela segue aberta sozinha. */
const VALIDADE_DO_TICKET = '60s';
const PUBLICO_DO_TICKET = 'sinapse-colaboracao';

/** Uma pagina com imagens coladas nao chega perto disso; o limite barra abuso. */
const TAMANHO_MAXIMO_DA_MENSAGEM = 8 * 1024 * 1024;

interface ConteudoDoTicket {
  sub: string;
  pag: string;
}

/** O que cada conexao carrega consigo depois de autenticada. */
export interface ContextoDaConexao {
  userId: string;
  paginaId: string;
  secaoId: string;
  permissao: PermissaoNaSecao;
}

export interface TicketDeColaboracao {
  token: string;
  documento: string;
  permissao: PermissaoNaSecao;
}

/**
 * Edicao em tempo real das paginas (Yjs + Hocuspocus).
 *
 * O WebSocket fica no mesmo servidor HTTP da API, em /api/v1/colaboracao.
 * Em producao o navegador conecta direto no Railway (a Vercel nao repassa
 * WebSocket), onde os cookies de sessao nao chegam. Por isso a conexao se
 * autentica com um ticket curto, emitido por uma rota HTTP comum e valido
 * para uma unica pagina. O ticket e assinado com uma chave derivada, entao
 * nao serve como token de sessao em nenhuma outra rota.
 *
 * O documento Yjs e a fonte da verdade durante a edicao; ao gravar, a API
 * tambem atualiza pages.content, que continua alimentando busca, contagem de
 * palavras, duplicacao e a IA.
 */
@Injectable()
export class ColaboracaoService implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly servidorWs = new WebSocketServer({
    noServer: true,
    maxPayload: TAMANHO_MAXIMO_DA_MENSAGEM,
  });

  readonly hocuspocus: Hocuspocus;

  constructor(
    private readonly prisma: PrismaService,
    private readonly compartilhamento: SharingService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly adaptador: HttpAdapterHost,
  ) {
    this.hocuspocus = new Hocuspocus({
      name: 'sinapse-colaboracao',
      quiet: true,
      // Grava 2s depois da ultima alteracao, e no maximo a cada 10s durante
      // digitacao continua.
      debounce: Number(this.config.get<string>('COLABORACAO_DEBOUNCE_MS') ?? 2000),
      maxDebounce: 10_000,
      onAuthenticate: (dados) => this.autenticar(dados),
      onLoadDocument: ({ document, documentName }) => this.carregar(document, documentName),
      onStoreDocument: ({ document, documentName }) => this.gravar(document, documentName),
    });
  }

  // ---------------------------------------------------------------------------
  // Ciclo de vida
  // ---------------------------------------------------------------------------

  onApplicationBootstrap(): void {
    const servidorHttp = this.adaptador.httpAdapter?.getHttpServer() as
      import('node:http').Server | undefined;

    servidorHttp?.on('upgrade', (requisicao: IncomingMessage, socket: Duplex, inicio: Buffer) =>
      this.aoPedirUpgrade(requisicao, socket, inicio),
    );
  }

  /** Grava tudo o que estava pendente antes de a API desligar (deploy, reinicio). */
  async beforeApplicationShutdown(): Promise<void> {
    await this.gravarPendentes();
    this.hocuspocus.closeConnections();
    this.servidorWs.close();
  }

  async gravarPendentes(): Promise<void> {
    await Promise.all(
      [...this.hocuspocus.documents.keys()].map(
        (nome) =>
          this.hocuspocus.debouncer.executeNow(`onStoreDocument-${nome}`) as Promise<void> | void,
      ),
    );
  }

  private aoPedirUpgrade(requisicao: IncomingMessage, socket: Duplex, inicio: Buffer): void {
    const caminho = (requisicao.url ?? '').split('?')[0];

    if (caminho !== CAMINHO_DA_COLABORACAO) {
      socket.destroy();
      return;
    }

    // O navegador manda o Origin em todo WebSocket. Recusar origens estranhas
    // impede que outro site abra uma conexao em nome de quem o visita.
    if (!this.origemPermitida(requisicao.headers.origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    this.servidorWs.handleUpgrade(requisicao, socket, inicio, (conexao) => {
      this.hocuspocus.handleConnection(conexao, requisicao);
    });
  }

  private origemPermitida(origem: string | undefined): boolean {
    if (!origem) return false;

    const permitidas = (this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000')
      .split(',')
      .map((valor) => valor.trim().replace(/\/$/, ''))
      .filter(Boolean);

    return permitidas.includes(origem.replace(/\/$/, ''));
  }

  // ---------------------------------------------------------------------------
  // Ticket
  // ---------------------------------------------------------------------------

  async emitirTicket(userId: string, paginaId: string): Promise<TicketDeColaboracao> {
    const permissao = await this.permissaoNaPagina(userId, paginaId);

    if (!permissao) {
      throw new NotFoundException('Pagina nao encontrada.');
    }

    const token = await this.jwt.signAsync(
      { sub: userId, pag: paginaId } satisfies ConteudoDoTicket,
      {
        secret: this.segredoDoTicket(),
        expiresIn: VALIDADE_DO_TICKET,
        audience: PUBLICO_DO_TICKET,
      },
    );

    return { token, documento: `${PREFIXO_DO_DOCUMENTO}${paginaId}`, permissao };
  }

  private segredoDoTicket(): string {
    return `${this.config.get<string>('JWT_ACCESS_SECRET')}:colaboracao`;
  }

  private async permissaoNaPagina(
    userId: string,
    paginaId: string,
  ): Promise<PermissaoNaSecao | null> {
    const acesso = await this.acessoAPagina(userId, paginaId);
    return acesso?.permissao ?? null;
  }

  /** Permissao atual da conta na pagina, conferida no banco a cada conexao. */
  private async acessoAPagina(
    userId: string,
    paginaId: string,
  ): Promise<{ permissao: PermissaoNaSecao; secaoId: string } | null> {
    const pagina = await this.prisma.paraUsuario(userId, 'leitura').page.findFirst({
      where: { id: paginaId, deletedAt: null },
      select: { sectionId: true },
    });

    if (!pagina) return null;

    const permissao = await this.compartilhamento.permissaoNaSecao(userId, pagina.sectionId);
    return permissao ? { permissao, secaoId: pagina.sectionId } : null;
  }

  // ---------------------------------------------------------------------------
  // Ganchos do Hocuspocus
  // ---------------------------------------------------------------------------

  private async autenticar({
    token,
    documentName,
    connection,
  }: onAuthenticatePayload): Promise<ContextoDaConexao> {
    const paginaId = FORMATO_DO_DOCUMENTO.exec(documentName)?.[1];

    if (!paginaId) {
      throw new Error('Documento invalido.');
    }

    let ticket: ConteudoDoTicket;

    try {
      ticket = await this.jwt.verifyAsync<ConteudoDoTicket>(token, {
        secret: this.segredoDoTicket(),
        audience: PUBLICO_DO_TICKET,
      });
    } catch {
      throw new Error('Ticket de colaboracao invalido ou expirado.');
    }

    // O ticket vale para uma pagina so: nao pode ser reaproveitado em outra.
    if (ticket.pag !== paginaId) {
      throw new Error('Ticket emitido para outra pagina.');
    }

    // A permissao e conferida de novo aqui, e nao lida do ticket, para que
    // um acesso removido entre a emissao e a conexao ja valha.
    const acesso = await this.acessoAPagina(ticket.sub, paginaId);

    if (!acesso) {
      throw new Error('Sem acesso a esta pagina.');
    }

    // Leitor recebe as alteracoes dos outros ao vivo, mas o servidor descarta
    // qualquer alteracao que ele tente enviar.
    connection.readOnly = acesso.permissao === 'leitor';

    return { userId: ticket.sub, paginaId, secaoId: acesso.secaoId, permissao: acesso.permissao };
  }

  private async carregar(documento: Y.Doc, nome: string): Promise<Y.Doc> {
    const paginaId = nome.slice(PREFIXO_DO_DOCUMENTO.length);

    const pagina = await this.prisma.page.findFirst({
      where: { id: paginaId, deletedAt: null },
      select: { yjsState: true, content: true },
    });

    if (!pagina) {
      throw new Error('Pagina nao encontrada.');
    }

    if (pagina.yjsState && pagina.yjsState.length > 0) {
      Y.applyUpdate(documento, new Uint8Array(pagina.yjsState));
    } else {
      // Primeira abertura no editor colaborativo: parte do JSON ja salvo.
      preencherYDoc(documento, pagina.content as { content?: NoJson[] });
    }

    return documento;
  }

  private async gravar(documento: Y.Doc, nome: string): Promise<void> {
    const paginaId = nome.slice(PREFIXO_DO_DOCUMENTO.length);
    const conteudo = yDocParaJson(documento);
    const texto = extrairTexto(conteudo);

    await this.prisma.page.updateMany({
      where: { id: paginaId, deletedAt: null },
      data: {
        yjsState: Buffer.from(Y.encodeStateAsUpdate(documento)),
        content: comoJson(conteudo),
        contentText: texto,
        wordCount: contarPalavras(texto),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Integracao com o restante da API
  // ---------------------------------------------------------------------------

  /**
   * Chamado quando o conteudo e trocado fora do editor (PATCH com content).
   * Se a pagina esta aberta por alguem, a troca entra no documento ao vivo e
   * todos veem na hora; devolve false quando ninguem esta com ela aberta.
   */
  substituirConteudoAoVivo(paginaId: string, conteudo: { content?: NoJson[] }): boolean {
    const documento = this.hocuspocus.documents.get(`${PREFIXO_DO_DOCUMENTO}${paginaId}`);

    if (!documento || documento.isLoading) return false;

    const fragmento = documento.getXmlFragment(CAMPO_DO_EDITOR);

    documento.transact(() => {
      fragmento.delete(0, fragmento.length);
      preencherYDoc(documento, conteudo);
    });

    return true;
  }

  /**
   * Derruba as conexoes de uma conta numa secao, depois de o dono trocar o
   * papel dela ou remover o acesso. O editor reconecta sozinho com um ticket
   * novo, que ja reflete a permissao atual (ou e recusado).
   */
  revogar(userId: string, secaoId: string): void {
    this.encerrar((contexto) => contexto.userId === userId && contexto.secaoId === secaoId);
  }

  /** Fecha todas as conexoes de uma secao (secao excluida). */
  encerrarSecao(secaoId: string): void {
    this.encerrar((contexto) => contexto.secaoId === secaoId);
  }

  /** Fecha todas as conexoes das paginas (pagina excluida ou movida). */
  encerrarPaginas(paginaIds: string[]): void {
    const ids = new Set(paginaIds);
    this.encerrar((contexto) => ids.has(contexto.paginaId));
  }

  private encerrar(criterio: (contexto: ContextoDaConexao) => boolean): void {
    for (const documento of this.hocuspocus.documents.values()) {
      for (const conexao of documento.getConnections()) {
        const contexto = conexao.context as ContextoDaConexao | undefined;

        if (contexto && criterio(contexto)) {
          // ResetConnection faz o navegador reconectar e pedir um ticket novo. O
          // codigo Forbidden nao serve: o provider v2 desiste de reconectar com ele.
          conexao.close(ResetConnection);
        }
      }
    }
  }
}
