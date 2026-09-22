import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActivityAction, ActivityEntity } from '@prisma/client';
import type {
  AtualizarGrupoInput,
  CriarGrupoInput,
  GrupoNaArvore,
  ReordenarInput,
} from '@sinapse/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { exigirEncontrado, montarGrupo, SELECAO_DE_PAGINAS } from './notes.helpers';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Arvore completa do usuario, em uma consulta.
   * A barra lateral inteira e desenhada a partir deste retorno.
   */
  async arvore(userId: string, incluirArquivados = false): Promise<GrupoNaArvore[]> {
    const db = this.prisma.paraUsuario(userId);
    const filtroArquivado = incluirArquivados ? {} : { archivedAt: null };

    const grupos = await db.group.findMany({
      where: { deletedAt: null, ...filtroArquivado },
      orderBy: { position: 'asc' },
      include: {
        sections: {
          where: { deletedAt: null, ...filtroArquivado },
          orderBy: { position: 'asc' },
          include: {
            pages: {
              where: { deletedAt: null, ...filtroArquivado },
              orderBy: { position: 'asc' },
              select: SELECAO_DE_PAGINAS,
            },
            _count: { select: { members: true } },
          },
        },
      },
    });

    return grupos.map(montarGrupo);
  }

  async criar(userId: string, dados: CriarGrupoInput): Promise<GrupoNaArvore> {
    const db = this.prisma.paraUsuario(userId);

    // Entra no fim da lista, que e onde o usuario espera ver o item novo.
    const ultimo = await db.group.findFirst({
      where: { deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const grupo = await this.prisma.group.create({
      data: {
        userId,
        name: dados.name,
        icon: dados.icon ?? null,
        color: dados.color,
        position: (ultimo?.position ?? -1) + 1,
      },
      include: { sections: { include: { pages: { select: SELECAO_DE_PAGINAS } } } },
    });

    await this.registrar(userId, ActivityAction.created, grupo.id);

    return montarGrupo(grupo);
  }

  async atualizar(
    userId: string,
    grupoId: string,
    dados: AtualizarGrupoInput,
  ): Promise<GrupoNaArvore> {
    const db = this.prisma.paraUsuario(userId);

    const alterados = await db.group.updateMany({
      where: { id: grupoId, deletedAt: null },
      data: {
        ...(dados.name !== undefined ? { name: dados.name } : {}),
        ...(dados.icon !== undefined ? { icon: dados.icon } : {}),
        ...(dados.color !== undefined ? { color: dados.color } : {}),
        ...(dados.archived !== undefined ? { archivedAt: dados.archived ? new Date() : null } : {}),
      },
    });

    if (alterados.count === 0) {
      throw new ForbiddenException('Grupo nao encontrado ou nao pertence a sua conta.');
    }

    await this.registrar(
      userId,
      dados.archived ? ActivityAction.archived : ActivityAction.updated,
      grupoId,
    );

    return this.buscar(userId, grupoId);
  }

  async buscar(userId: string, grupoId: string): Promise<GrupoNaArvore> {
    const db = this.prisma.paraUsuario(userId);

    const grupo = await db.group.findFirst({
      where: { id: grupoId, deletedAt: null },
      include: {
        sections: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          include: {
            pages: {
              where: { deletedAt: null },
              orderBy: { position: 'asc' },
              select: SELECAO_DE_PAGINAS,
            },
          },
        },
      },
    });

    return montarGrupo(exigirEncontrado(grupo, 'Grupo nao encontrado.'));
  }

  /**
   * Exclusao logica. O grupo some da barra lateral e vai para a lixeira junto
   * com tudo o que esta dentro dele, mas nada e apagado do banco ainda.
   */
  async excluir(userId: string, grupoId: string): Promise<void> {
    const db = this.prisma.paraUsuario(userId);
    const agora = new Date();

    const alterados = await db.group.updateMany({
      where: { id: grupoId, deletedAt: null },
      data: { deletedAt: agora },
    });

    if (alterados.count === 0) {
      throw new ForbiddenException('Grupo nao encontrado ou nao pertence a sua conta.');
    }

    // O mesmo carimbo de data marca os filhos: e assim que a restauracao
    // sabe exatamente o que voltar junto.
    await db.section.updateMany({
      where: { groupId: grupoId, deletedAt: null },
      data: { deletedAt: agora },
    });
    await db.page.updateMany({
      where: { section: { groupId: grupoId }, deletedAt: null },
      data: { deletedAt: agora },
    });

    await this.registrar(userId, ActivityAction.deleted, grupoId);
  }

  /** Reordenacao em lote: uma transacao para toda a lista arrastada. */
  async reordenar(userId: string, dados: ReordenarInput): Promise<void> {
    const db = this.prisma.paraUsuario(userId);
    const ids = dados.itens.map((item) => item.id);

    const meus = await db.group.count({ where: { id: { in: ids }, deletedAt: null } });

    if (meus !== ids.length) {
      throw new ForbiddenException('Algum grupo da lista nao pertence a sua conta.');
    }

    await this.prisma.$transaction(
      dados.itens.map((item) =>
        this.prisma.group.update({ where: { id: item.id }, data: { position: item.position } }),
      ),
    );
  }

  private async registrar(userId: string, acao: ActivityAction, entityId: string): Promise<void> {
    await this.prisma.activityLog.create({
      data: { userId, action: acao, entityType: ActivityEntity.group, entityId },
    });
  }
}
