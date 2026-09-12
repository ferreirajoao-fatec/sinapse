import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActivityAction, ActivityEntity } from '@prisma/client';
import type {
  AtualizarColunaDeTarefasInput,
  ColunaDeTarefas,
  CriarColunaDeTarefasInput,
  ReordenarInput,
} from '@sinapse/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { exigirEncontrado, montarColuna, SELECAO_DE_TAREFAS } from './tasks.helpers';

@Injectable()
export class TaskColumnsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Quadro completo do usuario, colunas com as tarefas ja aninhadas. */
  async quadro(userId: string, incluirArquivadas = false): Promise<ColunaDeTarefas[]> {
    const db = this.prisma.paraUsuario(userId);
    const filtroArquivada = incluirArquivadas ? {} : { archivedAt: null };

    const colunas = await db.taskColumn.findMany({
      where: { deletedAt: null, ...filtroArquivada },
      orderBy: { position: 'asc' },
      include: {
        tasks: {
          where: { deletedAt: null, ...filtroArquivada },
          orderBy: { position: 'asc' },
          select: SELECAO_DE_TAREFAS,
        },
      },
    });

    return colunas.map(montarColuna);
  }

  async criar(userId: string, dados: CriarColunaDeTarefasInput): Promise<ColunaDeTarefas> {
    const db = this.prisma.paraUsuario(userId);

    const ultima = await db.taskColumn.findFirst({
      where: { deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const coluna = await this.prisma.taskColumn.create({
      data: {
        userId,
        name: dados.name,
        color: dados.color,
        position: (ultima?.position ?? -1) + 1,
      },
      include: { tasks: { select: SELECAO_DE_TAREFAS } },
    });

    await this.registrar(userId, ActivityAction.created, coluna.id);

    return montarColuna(coluna);
  }

  async atualizar(
    userId: string,
    colunaId: string,
    dados: AtualizarColunaDeTarefasInput,
  ): Promise<ColunaDeTarefas> {
    const db = this.prisma.paraUsuario(userId);

    const alteradas = await db.taskColumn.updateMany({
      where: { id: colunaId, deletedAt: null },
      data: {
        ...(dados.name !== undefined ? { name: dados.name } : {}),
        ...(dados.color !== undefined ? { color: dados.color } : {}),
        ...(dados.archived !== undefined ? { archivedAt: dados.archived ? new Date() : null } : {}),
      },
    });

    if (alteradas.count === 0) {
      throw new ForbiddenException('Coluna nao encontrada ou nao pertence a sua conta.');
    }

    await this.registrar(
      userId,
      dados.archived ? ActivityAction.archived : ActivityAction.updated,
      colunaId,
    );

    return this.buscar(userId, colunaId);
  }

  async buscar(userId: string, colunaId: string): Promise<ColunaDeTarefas> {
    const db = this.prisma.paraUsuario(userId);

    const coluna = await db.taskColumn.findFirst({
      where: { id: colunaId, deletedAt: null },
      include: {
        tasks: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          select: SELECAO_DE_TAREFAS,
        },
      },
    });

    return montarColuna(exigirEncontrado(coluna, 'Coluna nao encontrada.'));
  }

  /** Exclusao logica: a coluna e as tarefas dela vao para a lixeira juntas. */
  async excluir(userId: string, colunaId: string): Promise<void> {
    const db = this.prisma.paraUsuario(userId);
    const agora = new Date();

    const alteradas = await db.taskColumn.updateMany({
      where: { id: colunaId, deletedAt: null },
      data: { deletedAt: agora },
    });

    if (alteradas.count === 0) {
      throw new ForbiddenException('Coluna nao encontrada ou nao pertence a sua conta.');
    }

    await db.task.updateMany({
      where: { columnId: colunaId, deletedAt: null },
      data: { deletedAt: agora },
    });

    await this.registrar(userId, ActivityAction.deleted, colunaId);
  }

  async reordenar(userId: string, dados: ReordenarInput): Promise<void> {
    const db = this.prisma.paraUsuario(userId);
    const ids = dados.itens.map((item) => item.id);

    const minhas = await db.taskColumn.count({ where: { id: { in: ids }, deletedAt: null } });

    if (minhas !== ids.length) {
      throw new ForbiddenException('Alguma coluna da lista nao pertence a sua conta.');
    }

    await this.prisma.$transaction(
      dados.itens.map((item) =>
        this.prisma.taskColumn.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );
  }

  private async registrar(userId: string, acao: ActivityAction, entityId: string): Promise<void> {
    await this.prisma.activityLog.create({
      data: { userId, action: acao, entityType: ActivityEntity.task_column, entityId },
    });
  }
}
