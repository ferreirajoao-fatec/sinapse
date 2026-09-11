import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ActivityAction, ActivityEntity, type EntityColor } from '@prisma/client';
import type {
  AtualizarPaginaInput,
  CriarPaginaInput,
  DefinirEtiquetasInput,
  MoverPaginaInput,
  PaginaCompleta,
  PaginaResumida,
  ReordenarInput,
} from '@sinapse/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  comoJson,
  contarPalavras,
  DOCUMENTO_VAZIO,
  exigirEncontrado,
  extrairTexto,
  montarEtiqueta,
} from './notes.helpers';

const INCLUIR_CAMINHO = {
  section: { select: { id: true, name: true, group: { select: { id: true, name: true } } } },
  tags: { include: { tag: true } },
} as const;

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
  constructor(private readonly prisma: PrismaService) {}

  private formatar(pagina: PaginaDoBanco): PaginaCompleta {
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
      caminho: {
        grupoId: pagina.section.group.id,
        grupo: pagina.section.group.name,
        secaoId: pagina.section.id,
        secao: pagina.section.name,
      },
    };
  }

  async buscar(userId: string, paginaId: string, registrarAbertura = true): Promise<PaginaCompleta> {
    const db = this.prisma.paraUsuario(userId);

    const pagina = await db.page.findFirst({
      where: { id: paginaId, deletedAt: null },
      include: INCLUIR_CAMINHO,
    });

    const encontrada = exigirEncontrado(pagina, 'Pagina nao encontrada.');

    if (registrarAbertura) {
      // Fora do await: abrir a pagina nao pode esperar a gravacao do carimbo.
      void db.page
        .updateMany({ where: { id: paginaId }, data: { lastOpenedAt: new Date() } })
        .catch(() => undefined);
    }

    return this.formatar(encontrada as PaginaDoBanco);
  }

  async criar(userId: string, dados: CriarPaginaInput): Promise<PaginaCompleta> {
    const db = this.prisma.paraUsuario(userId);

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
      include: INCLUIR_CAMINHO,
    });

    await this.registrar(userId, ActivityAction.created, pagina.id);

    return this.formatar(pagina as PaginaDoBanco);
  }

  async atualizar(
    userId: string,
    paginaId: string,
    dados: AtualizarPaginaInput,
  ): Promise<PaginaCompleta> {
    const db = this.prisma.paraUsuario(userId);

    const texto = dados.content ? extrairTexto(dados.content) : undefined;

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
            }
          : {}),
        ...(dados.isFavorite !== undefined ? { isFavorite: dados.isFavorite } : {}),
        ...(dados.isPinned !== undefined ? { isPinned: dados.isPinned } : {}),
        ...(dados.archived !== undefined ? { archivedAt: dados.archived ? new Date() : null } : {}),
      },
    });

    if (alteradas.count === 0) {
      throw new ForbiddenException('Pagina nao encontrada ou nao pertence a sua conta.');
    }

    return this.buscar(userId, paginaId, false);
  }

  async excluir(userId: string, paginaId: string): Promise<void> {
    const db = this.prisma.paraUsuario(userId);
    const agora = new Date();

    const alteradas = await db.page.updateMany({
      where: { id: paginaId, deletedAt: null },
      data: { deletedAt: agora },
    });

    if (alteradas.count === 0) {
      throw new ForbiddenException('Pagina nao encontrada ou nao pertence a sua conta.');
    }

    // Subpaginas acompanham a pagina superior na lixeira, com o mesmo carimbo.
    const descendentes = await this.listarDescendentes(userId, paginaId);

    if (descendentes.length > 0) {
      await db.page.updateMany({
        where: { id: { in: descendentes }, deletedAt: null },
        data: { deletedAt: agora },
      });
    }

    await this.registrar(userId, ActivityAction.deleted, paginaId);
  }

  /** Percorre a arvore para baixo, nivel a nivel, sem recursao no banco. */
  private async listarDescendentes(userId: string, paginaId: string): Promise<string[]> {
    const db = this.prisma.paraUsuario(userId);
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
    const db = this.prisma.paraUsuario(userId);

    const pagina = await db.page.findFirst({
      where: { id: paginaId, deletedAt: null },
      select: { id: true },
    });

    if (!pagina) {
      throw new ForbiddenException('Pagina nao encontrada ou nao pertence a sua conta.');
    }

    const secao = await db.section.findFirst({
      where: { id: dados.sectionId, deletedAt: null },
      select: { id: true },
    });

    if (!secao) {
      throw new ForbiddenException('Secao de destino nao encontrada.');
    }

    const descendentes = await this.listarDescendentes(userId, paginaId);

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

    await this.registrar(userId, ActivityAction.updated, paginaId);

    return this.buscar(userId, paginaId, false);
  }

  async duplicar(userId: string, paginaId: string): Promise<PaginaCompleta> {
    const original = await this.buscar(userId, paginaId, false);
    const db = this.prisma.paraUsuario(userId);

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
      include: INCLUIR_CAMINHO,
    });

    await this.registrar(userId, ActivityAction.created, copia.id);

    return this.formatar(copia as PaginaDoBanco);
  }

  async reordenar(userId: string, dados: ReordenarInput): Promise<void> {
    const db = this.prisma.paraUsuario(userId);
    const ids = dados.itens.map((item) => item.id);

    const minhas = await db.page.count({ where: { id: { in: ids }, deletedAt: null } });

    if (minhas !== ids.length) {
      throw new ForbiddenException('Alguma pagina da lista nao pertence a sua conta.');
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
}
