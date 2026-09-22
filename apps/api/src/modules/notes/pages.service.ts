import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ActivityAction, ActivityEntity, type EntityColor } from '@prisma/client';
import type {
  AtualizarPaginaInput,
  ConfirmarUploadInput,
  CriarPaginaInput,
  CriarUrlDeUploadInput,
  DefinirEtiquetasInput,
  MoverPaginaInput,
  PaginaCompleta,
  PaginaResumida,
  PermissaoNaSecao,
  ReordenarInput,
  UrlAssinada,
  UrlDeUpload,
} from '@sinapse/shared';
import { StorageService } from '../files/storage.service';
import type { NivelDeAcesso } from '../../common/prisma/escopo-do-usuario';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  comoJson,
  contarPalavras,
  DOCUMENTO_VAZIO,
  exigirEncontrado,
  extrairTexto,
  montarAnexo,
  montarEtiqueta,
} from './notes.helpers';
import { ColaboracaoService } from './colaboracao/colaboracao.service';
import type { NoJson } from './colaboracao/documento-yjs';
import { SharingService } from './sharing.service';

const INCLUIR_CAMINHO = {
  section: { select: { id: true, name: true, group: { select: { id: true, name: true } } } },
  tags: { include: { tag: true } },
  attachments: { orderBy: { createdAt: 'asc' } },
} as const;

interface AnexoDoBanco {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
  storageKey: string;
  createdAt: Date;
}

interface PaginaDoBanco {
  id: string;
  sectionId: string;
  parentPageId: string | null;
  title: string;
  icon: string | null;
  content: unknown;
  contentText: string;
  wordCount: number;
  isFavorite: boolean;
  isPinned: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  section: { id: string; name: string; group: { id: string; name: string } };
  tags: { tag: { id: string; name: string; color: EntityColor } }[];
  attachments: AnexoDoBanco[];
}

interface PaginaParaResumo {
  id: string;
  title: string;
  icon: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  updatedAt: Date;
  lastOpenedAt: Date | null;
  section: { name: string; group: { name: string } };
}

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly compartilhamento: SharingService,
    private readonly colaboracao: ColaboracaoService,
  ) {}

  /** Usado pelo front para esconder a secao de anexos quando nao ha S3 configurado. */
  get anexosHabilitados(): boolean {
    return this.storage.habilitado;
  }

  private formatar(pagina: PaginaDoBanco, permissao: PermissaoNaSecao): PaginaCompleta {
    return {
      id: pagina.id,
      sectionId: pagina.sectionId,
      parentPageId: pagina.parentPageId,
      title: pagina.title,
      icon: pagina.icon,
      content: pagina.content as PaginaCompleta['content'],
      contentText: pagina.contentText,
      wordCount: pagina.wordCount,
      isFavorite: pagina.isFavorite,
      isPinned: pagina.isPinned,
      archivedAt: pagina.archivedAt?.toISOString() ?? null,
      createdAt: pagina.createdAt.toISOString(),
      updatedAt: pagina.updatedAt.toISOString(),
      tags: pagina.tags.map((vinculo) => montarEtiqueta(vinculo.tag)),
      anexos: pagina.attachments.map(montarAnexo),
      caminho: {
        grupoId: pagina.section.group.id,
        grupo: pagina.section.group.name,
        secaoId: pagina.section.id,
        secao: pagina.section.name,
      },
      permissao,
    };
  }

  async buscar(
    userId: string,
    paginaId: string,
    registrarAbertura = true,
  ): Promise<PaginaCompleta> {
    // Leitura inclui as secoes compartilhadas com a conta.
    const db = this.prisma.paraUsuario(userId, 'leitura');

    const pagina = await db.page.findFirst({
      where: { id: paginaId, deletedAt: null },
      include: INCLUIR_CAMINHO,
    });

    const encontrada = exigirEncontrado(pagina, 'Pagina nao encontrada.');
    const permissao =
      (await this.compartilhamento.permissaoNaSecao(userId, encontrada.sectionId)) ?? 'leitor';

    // lastOpenedAt alimenta os recentes do dono; a visita de um membro nao conta.
    if (registrarAbertura && permissao === 'dono') {
      // Fora do await: abrir a pagina nao pode esperar a gravacao do carimbo.
      void db.page
        .updateMany({ where: { id: paginaId }, data: { lastOpenedAt: new Date() } })
        .catch(() => undefined);
    }

    return this.formatar(encontrada as PaginaDoBanco, permissao);
  }

  async criar(userId: string, dados: CriarPaginaInput): Promise<PaginaCompleta> {
    const db = this.prisma.paraUsuario(userId, 'edicao');

    const secao = await db.section.findFirst({
      where: { id: dados.sectionId, deletedAt: null },
      select: { id: true },
    });

    if (!secao) {
      throw new ForbiddenException('Secao nao encontrada ou nao pertence a sua conta.');
    }

    if (dados.parentPageId) {
      const pai = await db.page.findFirst({
        where: { id: dados.parentPageId, sectionId: dados.sectionId, deletedAt: null },
        select: { id: true },
      });

      if (!pai) {
        throw new BadRequestException('A pagina superior precisa estar na mesma secao.');
      }
    }

    const ultima = await db.page.findFirst({
      where: {
        sectionId: dados.sectionId,
        parentPageId: dados.parentPageId ?? null,
        deletedAt: null,
      },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const pagina = await this.prisma.page.create({
      data: {
        sectionId: dados.sectionId,
        parentPageId: dados.parentPageId ?? null,
        title: dados.title || 'Sem titulo',
        icon: dados.icon ?? null,
        content: comoJson(DOCUMENTO_VAZIO),
        position: (ultima?.position ?? -1) + 1,
      },
      select: { id: true },
    });

    await this.registrar(userId, ActivityAction.created, pagina.id);

    return this.buscar(userId, pagina.id, false);
  }

  async atualizar(
    userId: string,
    paginaId: string,
    dados: AtualizarPaginaInput,
  ): Promise<PaginaCompleta> {
    // Favorito e fixado ficam gravados na propria pagina e valem para todos
    // que a veem, entao so o dono decide. O resto e trabalho de editor.
    const soDoDono = dados.isFavorite !== undefined || dados.isPinned !== undefined;
    const db = this.prisma.paraUsuario(userId, soDoDono ? 'dono' : 'edicao');

    const texto = dados.content ? extrairTexto(dados.content) : undefined;

    // Conteudo trocado fora do editor (integracoes, IA): se alguem esta com a
    // pagina aberta, a troca entra no documento ao vivo. Se nao, o estado Yjs
    // antigo e descartado e a proxima abertura parte do JSON novo.
    let aoVivo = false;
    if (dados.content !== undefined) {
      const editavel = await db.page.findFirst({
        where: { id: paginaId, deletedAt: null },
        select: { id: true },
      });
      aoVivo =
        editavel !== null &&
        this.colaboracao.substituirConteudoAoVivo(
          paginaId,
          dados.content as unknown as { content?: NoJson[] },
        );
    }

    const alteradas = await db.page.updateMany({
      where: { id: paginaId, deletedAt: null },
      data: {
        ...(dados.title !== undefined ? { title: dados.title || 'Sem titulo' } : {}),
        ...(dados.icon !== undefined ? { icon: dados.icon } : {}),
        ...(dados.content !== undefined
          ? {
              content: comoJson(dados.content),
              contentText: texto ?? '',
              wordCount: contarPalavras(texto ?? ''),
              ...(aoVivo ? {} : { yjsState: null }),
            }
          : {}),
        ...(dados.isFavorite !== undefined ? { isFavorite: dados.isFavorite } : {}),
        ...(dados.isPinned !== undefined ? { isPinned: dados.isPinned } : {}),
        ...(dados.archived !== undefined ? { archivedAt: dados.archived ? new Date() : null } : {}),
      },
    });

    if (alteradas.count === 0) {
      throw new ForbiddenException('Pagina nao encontrada ou voce nao pode edita-la.');
    }

    return this.buscar(userId, paginaId, false);
  }

  async excluir(userId: string, paginaId: string): Promise<void> {
    const db = this.prisma.paraUsuario(userId, 'edicao');
    const agora = new Date();

    const alteradas = await db.page.updateMany({
      where: { id: paginaId, deletedAt: null },
      data: { deletedAt: agora },
    });

    if (alteradas.count === 0) {
      throw new ForbiddenException('Pagina nao encontrada ou voce nao pode edita-la.');
    }

    // Subpaginas acompanham a pagina superior na lixeira, com o mesmo carimbo.
    const descendentes = await this.listarDescendentes(userId, paginaId, 'edicao');

    if (descendentes.length > 0) {
      await db.page.updateMany({
        where: { id: { in: descendentes }, deletedAt: null },
        data: { deletedAt: agora },
      });
    }

    this.colaboracao.encerrarPaginas([paginaId, ...descendentes]);

    await this.registrar(userId, ActivityAction.deleted, paginaId);
  }

  /** Percorre a arvore para baixo, nivel a nivel, sem recursao no banco. */
  private async listarDescendentes(
    userId: string,
    paginaId: string,
    acesso: NivelDeAcesso,
  ): Promise<string[]> {
    const db = this.prisma.paraUsuario(userId, acesso);
    const todos: string[] = [];
    let nivel = [paginaId];

    while (nivel.length > 0) {
      const filhas = await db.page.findMany({
        where: { parentPageId: { in: nivel }, deletedAt: null },
        select: { id: true },
      });

      if (filhas.length === 0) break;

      const ids = filhas.map((filha) => filha.id);
      todos.push(...ids);
      nivel = ids;
    }

    return todos;
  }

  async mover(userId: string, paginaId: string, dados: MoverPaginaInput): Promise<PaginaCompleta> {
    const db = this.prisma.paraUsuario(userId, 'edicao');

    const pagina = await db.page.findFirst({
      where: { id: paginaId, deletedAt: null },
      select: { id: true, section: { select: { group: { select: { userId: true } } } } },
    });

    if (!pagina) {
      throw new ForbiddenException('Pagina nao encontrada ou voce nao pode edita-la.');
    }

    const secao = await db.section.findFirst({
      where: { id: dados.sectionId, deletedAt: null },
      select: { id: true, group: { select: { userId: true } } },
    });

    if (!secao) {
      throw new ForbiddenException('Secao de destino nao encontrada.');
    }

    // Mover entre contas diferentes trocaria o dono da pagina sem ele saber.
    if (secao.group.userId !== pagina.section.group.userId) {
      throw new ForbiddenException(
        'A pagina so pode ser movida para secoes do mesmo dono. Para levar o conteudo, duplique e copie.',
      );
    }

    const descendentes = await this.listarDescendentes(userId, paginaId, 'edicao');

    if (dados.parentPageId) {
      if (dados.parentPageId === paginaId) {
        throw new BadRequestException('Uma pagina nao pode ficar dentro dela mesma.');
      }

      if (descendentes.includes(dados.parentPageId)) {
        throw new BadRequestException(
          'Uma pagina nao pode ser movida para dentro de uma das proprias subpaginas.',
        );
      }

      const pai = await db.page.findFirst({
        where: { id: dados.parentPageId, sectionId: dados.sectionId, deletedAt: null },
        select: { id: true },
      });

      if (!pai) {
        throw new BadRequestException('A pagina superior precisa estar na secao de destino.');
      }
    }

    const ultima = await db.page.findFirst({
      where: {
        sectionId: dados.sectionId,
        parentPageId: dados.parentPageId ?? null,
        deletedAt: null,
      },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    await db.page.updateMany({
      where: { id: paginaId },
      data: {
        sectionId: dados.sectionId,
        parentPageId: dados.parentPageId ?? null,
        position: (ultima?.position ?? -1) + 1,
      },
    });

    // As subpaginas seguem junto, para nao ficarem orfas em outra secao.
    if (descendentes.length > 0) {
      await db.page.updateMany({
        where: { id: { in: descendentes } },
        data: { sectionId: dados.sectionId },
      });
    }

    // A secao mudou: quem esta conectado reconecta com as permissoes da nova.
    this.colaboracao.encerrarPaginas([paginaId, ...descendentes]);

    await this.registrar(userId, ActivityAction.updated, paginaId);

    return this.buscar(userId, paginaId, false);
  }

  async duplicar(userId: string, paginaId: string): Promise<PaginaCompleta> {
    const original = await this.buscar(userId, paginaId, false);

    if (original.permissao === 'leitor') {
      throw new ForbiddenException('Voce so pode ler as paginas desta secao.');
    }

    const db = this.prisma.paraUsuario(userId, 'edicao');

    const ultima = await db.page.findFirst({
      where: {
        sectionId: original.sectionId,
        parentPageId: original.parentPageId,
        deletedAt: null,
      },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const copia = await this.prisma.page.create({
      data: {
        sectionId: original.sectionId,
        parentPageId: original.parentPageId,
        title: `${original.title} (copia)`,
        icon: original.icon,
        content: comoJson(original.content),
        contentText: original.contentText,
        wordCount: original.wordCount,
        position: (ultima?.position ?? -1) + 1,
        // As etiquetas acompanham; favorito e fixado nao, porque sao escolhas
        // sobre aquela pagina especifica.
        tags: { create: original.tags.map((etiqueta) => ({ tagId: etiqueta.id })) },
      },
      select: { id: true },
    });

    await this.registrar(userId, ActivityAction.created, copia.id);

    return this.buscar(userId, copia.id, false);
  }

  async reordenar(userId: string, dados: ReordenarInput): Promise<void> {
    const db = this.prisma.paraUsuario(userId, 'edicao');
    const ids = dados.itens.map((item) => item.id);

    const minhas = await db.page.count({ where: { id: { in: ids }, deletedAt: null } });

    if (minhas !== ids.length) {
      throw new ForbiddenException('Alguma pagina da lista nao pode ser editada por voce.');
    }

    await this.prisma.$transaction(
      dados.itens.map((item) =>
        this.prisma.page.update({ where: { id: item.id }, data: { position: item.position } }),
      ),
    );
  }

  async definirEtiquetas(
    userId: string,
    paginaId: string,
    dados: DefinirEtiquetasInput,
  ): Promise<PaginaCompleta> {
    const db = this.prisma.paraUsuario(userId);

    const pagina = await db.page.findFirst({
      where: { id: paginaId, deletedAt: null },
      select: { id: true },
    });

    if (!pagina) {
      throw new ForbiddenException('Pagina nao encontrada ou nao pertence a sua conta.');
    }

    if (dados.tagIds.length > 0) {
      const minhas = await db.tag.count({ where: { id: { in: dados.tagIds } } });

      if (minhas !== dados.tagIds.length) {
        throw new ForbiddenException('Alguma etiqueta nao pertence a sua conta.');
      }
    }

    await this.prisma.$transaction([
      this.prisma.pageTag.deleteMany({ where: { pageId: paginaId } }),
      ...(dados.tagIds.length > 0
        ? [
            this.prisma.pageTag.createMany({
              data: dados.tagIds.map((tagId) => ({ pageId: paginaId, tagId })),
            }),
          ]
        : []),
    ]);

    return this.buscar(userId, paginaId, false);
  }

  /** Paginas abertas recentemente, para o painel inicial. */
  async recentes(userId: string, limite = 8): Promise<PaginaResumida[]> {
    const db = this.prisma.paraUsuario(userId);

    const paginas = await db.page.findMany({
      where: { deletedAt: null, archivedAt: null, lastOpenedAt: { not: null } },
      orderBy: { lastOpenedAt: 'desc' },
      take: limite,
      include: { section: { select: { name: true, group: { select: { name: true } } } } },
    });

    return paginas.map((pagina) => this.resumir(pagina));
  }

  async favoritas(userId: string, limite = 20): Promise<PaginaResumida[]> {
    const db = this.prisma.paraUsuario(userId);

    const paginas = await db.page.findMany({
      where: { deletedAt: null, archivedAt: null, isFavorite: true },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      take: limite,
      include: { section: { select: { name: true, group: { select: { name: true } } } } },
    });

    return paginas.map((pagina) => this.resumir(pagina));
  }

  private resumir(pagina: PaginaParaResumo): PaginaResumida {
    return {
      id: pagina.id,
      title: pagina.title,
      icon: pagina.icon,
      isFavorite: pagina.isFavorite,
      isPinned: pagina.isPinned,
      updatedAt: pagina.updatedAt.toISOString(),
      lastOpenedAt: pagina.lastOpenedAt?.toISOString() ?? null,
      caminho: { grupo: pagina.section.group.name, secao: pagina.section.name },
    };
  }

  private async registrar(userId: string, acao: ActivityAction, entityId: string): Promise<void> {
    await this.prisma.activityLog.create({
      data: { userId, action: acao, entityType: ActivityEntity.page, entityId },
    });
  }

  // ---------------------------------------------------------------------------
  // Anexos
  // ---------------------------------------------------------------------------

  async criarUrlDeUpload(
    userId: string,
    paginaId: string,
    dados: CriarUrlDeUploadInput,
  ): Promise<UrlDeUpload> {
    const db = this.prisma.paraUsuario(userId, 'edicao');
    await this.exigirPaginaEditavel(db, paginaId);

    const storageKey = this.storage.gerarChave('pages', paginaId, dados.fileName);
    const url = await this.storage.presignUpload(storageKey, dados.mimeType, dados.sizeBytes);

    return { url, storageKey };
  }

  async confirmarUpload(
    userId: string,
    paginaId: string,
    dados: ConfirmarUploadInput,
  ): Promise<PaginaCompleta> {
    const db = this.prisma.paraUsuario(userId, 'edicao');
    await this.exigirPaginaEditavel(db, paginaId);

    await this.prisma.pageAttachment.create({
      data: {
        pageId: paginaId,
        fileName: dados.fileName,
        mimeType: dados.mimeType,
        sizeBytes: BigInt(dados.sizeBytes),
        storageKey: dados.storageKey,
      },
    });

    return this.buscar(userId, paginaId, false);
  }

  async urlDeDownload(userId: string, paginaId: string, anexoId: string): Promise<UrlAssinada> {
    const db = this.prisma.paraUsuario(userId, 'leitura');

    const anexo = await db.pageAttachment.findFirst({
      where: { id: anexoId, pageId: paginaId },
    });
    const encontrado = exigirEncontrado(anexo, 'Anexo nao encontrado.');

    return { url: await this.storage.presignDownload(encontrado.storageKey) };
  }

  async removerAnexo(userId: string, paginaId: string, anexoId: string): Promise<void> {
    const db = this.prisma.paraUsuario(userId, 'edicao');

    const anexo = await db.pageAttachment.findFirst({
      where: { id: anexoId, pageId: paginaId },
    });
    const encontrado = exigirEncontrado(anexo, 'Anexo nao encontrado.');

    await db.pageAttachment.deleteMany({ where: { id: anexoId } });
    await this.storage.remover(encontrado.storageKey).catch(() => undefined);
  }

  private async exigirPaginaEditavel(
    db: ReturnType<PrismaService['paraUsuario']>,
    paginaId: string,
  ): Promise<void> {
    const pagina = await db.page.findFirst({
      where: { id: paginaId, deletedAt: null },
      select: { id: true },
    });

    if (!pagina) {
      throw new ForbiddenException('Pagina nao encontrada ou voce nao pode edita-la.');
    }
  }
}
