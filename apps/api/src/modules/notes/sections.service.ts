import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActivityAction, ActivityEntity } from '@prisma/client';
import type {
  AtualizarSecaoInput,
  CriarSecaoInput,
  ReordenarInput,
  SecaoNaArvore,
} from '@sinapse/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { exigirEncontrado, montarSecao, SELECAO_DE_PAGINAS } from './notes.helpers';

@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(userId: string, dados: CriarSecaoInput): Promise<SecaoNaArvore> {
    const db = this.prisma.paraUsuario(userId);

    // A criacao nao passa pelo filtro automatico, entao a posse do grupo
    // e conferida aqui, explicitamente.
    const grupo = await db.group.findFirst({
      where: { id: dados.groupId, deletedAt: null },
      select: { id: true },
    });

    if (!grupo) {
      throw new ForbiddenException('Grupo nao encontrado ou nao pertence a sua conta.');
    }

    const ultima = await db.section.findFirst({
      where: { groupId: dados.groupId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const secao = await this.prisma.section.create({
      data: {
        groupId: dados.groupId,
        name: dados.name,
        icon: dados.icon ?? null,
        position: (ultima?.position ?? -1) + 1,
      },
      include: { pages: { select: SELECAO_DE_PAGINAS } },
    });

    await this.registrar(userId, ActivityAction.created, secao.id);

    return montarSecao(secao);
  }

  async atualizar(
    userId: string,
    secaoId: string,
    dados: AtualizarSecaoInput,
  ): Promise<SecaoNaArvore> {
    const db = this.prisma.paraUsuario(userId);

    const alteradas = await db.section.updateMany({
      where: { id: secaoId, deletedAt: null },
      data: {
        ...(dados.name !== undefined ? { name: dados.name } : {}),
        ...(dados.icon !== undefined ? { icon: dados.icon } : {}),
        ...(dados.archived !== undefined ? { archivedAt: dados.archived ? new Date() : null } : {}),
      },
    });

    if (alteradas.count === 0) {
      throw new ForbiddenException('Secao nao encontrada ou nao pertence a sua conta.');
    }

    await this.registrar(
      userId,
      dados.archived ? ActivityAction.archived : ActivityAction.updated,
      secaoId,
    );

    return this.buscar(userId, secaoId);
  }

  async buscar(userId: string, secaoId: string): Promise<SecaoNaArvore> {
    const db = this.prisma.paraUsuario(userId);

    const secao = await db.section.findFirst({
      where: { id: secaoId, deletedAt: null },
      include: {
        pages: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          select: SELECAO_DE_PAGINAS,
        },
      },
    });

    return montarSecao(exigirEncontrado(secao, 'Secao nao encontrada.'));
  }

  async excluir(userId: string, secaoId: string): Promise<void> {
    const db = this.prisma.paraUsuario(userId);
    const agora = new Date();

    const alteradas = await db.section.updateMany({
      where: { id: secaoId, deletedAt: null },
      data: { deletedAt: agora },
    });

    if (alteradas.count === 0) {
      throw new ForbiddenException('Secao nao encontrada ou nao pertence a sua conta.');
    }

    await db.page.updateMany({
      where: { sectionId: secaoId, deletedAt: null },
      data: { deletedAt: agora },
    });

    await this.registrar(userId, ActivityAction.deleted, secaoId);
  }

  async reordenar(userId: string, dados: ReordenarInput): Promise<void> {
    const db = this.prisma.paraUsuario(userId);
    const ids = dados.itens.map((item) => item.id);

    const minhas = await db.section.count({ where: { id: { in: ids }, deletedAt: null } });

    if (minhas !== ids.length) {
      throw new ForbiddenException('Alguma secao da lista nao pertence a sua conta.');
    }

    await this.prisma.$transaction(
      dados.itens.map((item) =>
        this.prisma.section.update({ where: { id: item.id }, data: { position: item.position } }),
      ),
    );
  }

  private async registrar(userId: string, acao: ActivityAction, entityId: string): Promise<void> {
    await this.prisma.activityLog.create({
      data: { userId, action: acao, entityType: ActivityEntity.section, entityId },
    });
  }
}
