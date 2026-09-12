import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ActivityAction, ActivityEntity, type TaskPriority } from '@prisma/client';
import type {
  AdicionarItemDeChecklistInput,
  AtualizarItemDeChecklistInput,
  AtualizarTarefaInput,
  ConfirmarUploadInput,
  CriarTarefaInput,
  CriarUrlDeUploadInput,
  MoverTarefaInput,
  ReordenarInput,
  TarefaCompleta,
  TarefaResumida,
  UrlAssinada,
  UrlDeUpload,
} from '@sinapse/shared';
import { StorageService } from '../files/storage.service';
import type { PrismaEscopado } from '../../common/prisma/escopo-do-usuario';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  exigirEncontrado,
  INCLUIR_TAREFA_COMPLETA,
  montarTarefaCompleta,
  montarTarefaResumida,
  SELECAO_DE_TAREFAS,
} from './tasks.helpers';

export interface FiltrosDeListagem {
  columnId?: string;
  priority?: TaskPriority;
  pageId?: string;
  concluida?: boolean;
  atrasada?: boolean;
  arquivadas?: boolean;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Usado pelo front para esconder a secao de anexos quando nao ha S3 configurado. */
  get anexosHabilitados(): boolean {
    return this.storage.habilitado;
  }

  /** Visao de lista, com filtros. O quadro Kanban usa TaskColumnsService#quadro. */
  async listar(userId: string, filtros: FiltrosDeListagem): Promise<TarefaResumida[]> {
    const db = this.prisma.paraUsuario(userId);

    const tarefas = await db.task.findMany({
      where: {
        deletedAt: null,
        ...(filtros.arquivadas ? {} : { archivedAt: null }),
        ...(filtros.columnId ? { columnId: filtros.columnId } : {}),
        ...(filtros.priority ? { priority: filtros.priority } : {}),
        ...(filtros.pageId ? { pageId: filtros.pageId } : {}),
        ...(filtros.concluida === true ? { completedAt: { not: null } } : {}),
        ...(filtros.concluida === false ? { completedAt: null } : {}),
        ...(filtros.atrasada ? { dueDate: { lt: new Date() }, completedAt: null } : {}),
      },
      orderBy: [{ dueDate: 'asc' }, { position: 'asc' }],
      select: SELECAO_DE_TAREFAS,
    });

    return tarefas.map(montarTarefaResumida);
  }

  async criar(userId: string, dados: CriarTarefaInput): Promise<TarefaCompleta> {
    const db = this.prisma.paraUsuario(userId);

    const coluna = await db.taskColumn.findFirst({
      where: { id: dados.columnId, deletedAt: null },
      select: { id: true },
    });

    if (!coluna) {
      throw new ForbiddenException('Coluna nao encontrada ou nao pertence a sua conta.');
    }

    if (dados.pageId) {
      await this.exigirPaginaPropria(db, dados.pageId);
    }

    const ultima = await db.task.findFirst({
      where: { columnId: dados.columnId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const tarefa = await this.prisma.task.create({
      data: {
        columnId: dados.columnId,
        title: dados.title,
        description: dados.description ?? null,
        priority: dados.priority,
        dueDate: dados.dueDate ? new Date(dados.dueDate) : null,
        pageId: dados.pageId ?? null,
        position: (ultima?.position ?? -1) + 1,
      },
      include: INCLUIR_TAREFA_COMPLETA,
    });

    await this.registrar(userId, ActivityAction.created, tarefa.id);

    return montarTarefaCompleta(tarefa);
  }

  async atualizar(
    userId: string,
    tarefaId: string,
    dados: AtualizarTarefaInput,
  ): Promise<TarefaCompleta> {
    const db = this.prisma.paraUsuario(userId);

    if (dados.pageId) {
      await this.exigirPaginaPropria(db, dados.pageId);
    }

    const alteradas = await db.task.updateMany({
      where: { id: tarefaId, deletedAt: null },
      data: {
        ...(dados.title !== undefined ? { title: dados.title } : {}),
        ...(dados.description !== undefined ? { description: dados.description } : {}),
        ...(dados.priority !== undefined ? { priority: dados.priority } : {}),
        ...(dados.dueDate !== undefined
          ? { dueDate: dados.dueDate ? new Date(dados.dueDate) : null }
          : {}),
        ...(dados.pageId !== undefined ? { pageId: dados.pageId } : {}),
        ...(dados.completed !== undefined
          ? { completedAt: dados.completed ? new Date() : null }
          : {}),
        ...(dados.archived !== undefined ? { archivedAt: dados.archived ? new Date() : null } : {}),
      },
    });

    if (alteradas.count === 0) {
      throw new ForbiddenException('Tarefa nao encontrada ou nao pertence a sua conta.');
    }

    await this.registrar(userId, ActivityAction.updated, tarefaId);

    return this.buscar(userId, tarefaId);
  }

  async buscar(userId: string, tarefaId: string): Promise<TarefaCompleta> {
    const db = this.prisma.paraUsuario(userId);

    const tarefa = await db.task.findFirst({
      where: { id: tarefaId, deletedAt: null },
      include: INCLUIR_TAREFA_COMPLETA,
    });

    return montarTarefaCompleta(exigirEncontrado(tarefa, 'Tarefa nao encontrada.'));
  }

  async excluir(userId: string, tarefaId: string): Promise<void> {
    const db = this.prisma.paraUsuario(userId);

    const alteradas = await db.task.updateMany({
      where: { id: tarefaId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (alteradas.count === 0) {
      throw new ForbiddenException('Tarefa nao encontrada ou nao pertence a sua conta.');
    }

    await this.registrar(userId, ActivityAction.deleted, tarefaId);
  }

  /** Move para outra coluna (drag do Kanban). Reordenar ajusta o resto da lista. */
  async mover(userId: string, tarefaId: string, dados: MoverTarefaInput): Promise<TarefaCompleta> {
    const db = this.prisma.paraUsuario(userId);

    const tarefa = await db.task.findFirst({
      where: { id: tarefaId, deletedAt: null },
      select: { id: true },
    });

    if (!tarefa) {
      throw new ForbiddenException('Tarefa nao encontrada ou nao pertence a sua conta.');
    }

    const coluna = await db.taskColumn.findFirst({
      where: { id: dados.columnId, deletedAt: null },
      select: { id: true },
    });

    if (!coluna) {
      throw new ForbiddenException('Coluna de destino nao encontrada.');
    }

    await db.task.updateMany({
      where: { id: tarefaId },
      data: { columnId: dados.columnId, position: dados.position },
    });

    await this.registrar(userId, ActivityAction.updated, tarefaId);

    return this.buscar(userId, tarefaId);
  }

  async reordenar(userId: string, dados: ReordenarInput): Promise<void> {
    const db = this.prisma.paraUsuario(userId);
    const ids = dados.itens.map((item) => item.id);

    const minhas = await db.task.count({ where: { id: { in: ids }, deletedAt: null } });

    if (minhas !== ids.length) {
      throw new ForbiddenException('Alguma tarefa da lista nao pertence a sua conta.');
    }

    await this.prisma.$transaction(
      dados.itens.map((item) =>
        this.prisma.task.update({ where: { id: item.id }, data: { position: item.position } }),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Checklist
  // ---------------------------------------------------------------------------

  async adicionarItemDeChecklist(
    userId: string,
    tarefaId: string,
    dados: AdicionarItemDeChecklistInput,
  ): Promise<TarefaCompleta> {
    const db = this.prisma.paraUsuario(userId);
    await this.exigirTarefaPropria(db, tarefaId);

    const ultimo = await this.prisma.taskChecklistItem.findFirst({
      where: { taskId: tarefaId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    await this.prisma.taskChecklistItem.create({
      data: { taskId: tarefaId, label: dados.label, position: (ultimo?.position ?? -1) + 1 },
    });

    return this.buscar(userId, tarefaId);
  }

  async atualizarItemDeChecklist(
    userId: string,
    tarefaId: string,
    itemId: string,
    dados: AtualizarItemDeChecklistInput,
  ): Promise<TarefaCompleta> {
    const db = this.prisma.paraUsuario(userId);
    await this.exigirTarefaPropria(db, tarefaId);

    const alterados = await db.taskChecklistItem.updateMany({
      where: { id: itemId, taskId: tarefaId },
      data: {
        ...(dados.label !== undefined ? { label: dados.label } : {}),
        ...(dados.done !== undefined ? { done: dados.done } : {}),
      },
    });

    if (alterados.count === 0) {
      throw new ForbiddenException('Item de checklist nao encontrado.');
    }

    return this.buscar(userId, tarefaId);
  }

  async removerItemDeChecklist(userId: string, tarefaId: string, itemId: string): Promise<void> {
    const db = this.prisma.paraUsuario(userId);
    await this.exigirTarefaPropria(db, tarefaId);

    const removidos = await db.taskChecklistItem.deleteMany({
      where: { id: itemId, taskId: tarefaId },
    });

    if (removidos.count === 0) {
      throw new ForbiddenException('Item de checklist nao encontrado.');
    }
  }

  // ---------------------------------------------------------------------------
  // Anexos
  // ---------------------------------------------------------------------------

  async criarUrlDeUpload(
    userId: string,
    tarefaId: string,
    dados: CriarUrlDeUploadInput,
  ): Promise<UrlDeUpload> {
    const db = this.prisma.paraUsuario(userId);
    await this.exigirTarefaPropria(db, tarefaId);

    const storageKey = this.storage.gerarChave(tarefaId, dados.fileName);
    const url = await this.storage.presignUpload(storageKey, dados.mimeType, dados.sizeBytes);

    return { url, storageKey };
  }

  async confirmarUpload(
    userId: string,
    tarefaId: string,
    dados: ConfirmarUploadInput,
  ): Promise<TarefaCompleta> {
    const db = this.prisma.paraUsuario(userId);
    await this.exigirTarefaPropria(db, tarefaId);

    await this.prisma.taskAttachment.create({
      data: {
        taskId: tarefaId,
        fileName: dados.fileName,
        mimeType: dados.mimeType,
        sizeBytes: BigInt(dados.sizeBytes),
        storageKey: dados.storageKey,
      },
    });

    return this.buscar(userId, tarefaId);
  }

  async urlDeDownload(userId: string, tarefaId: string, anexoId: string): Promise<UrlAssinada> {
    const db = this.prisma.paraUsuario(userId);

    const anexo = await db.taskAttachment.findFirst({ where: { id: anexoId, taskId: tarefaId } });
    const encontrado = exigirEncontrado(anexo, 'Anexo nao encontrado.');

    return { url: await this.storage.presignDownload(encontrado.storageKey) };
  }

  async removerAnexo(userId: string, tarefaId: string, anexoId: string): Promise<void> {
    const db = this.prisma.paraUsuario(userId);

    const anexo = await db.taskAttachment.findFirst({ where: { id: anexoId, taskId: tarefaId } });
    const encontrado = exigirEncontrado(anexo, 'Anexo nao encontrado.');

    await db.taskAttachment.deleteMany({ where: { id: anexoId } });
    await this.storage.remover(encontrado.storageKey).catch(() => undefined);
  }

  // ---------------------------------------------------------------------------

  private async exigirTarefaPropria(db: PrismaEscopado, tarefaId: string): Promise<void> {
    const tarefa = await db.task.findFirst({
      where: { id: tarefaId, deletedAt: null },
      select: { id: true },
    });

    if (!tarefa) {
      throw new ForbiddenException('Tarefa nao encontrada ou nao pertence a sua conta.');
    }
  }

  private async exigirPaginaPropria(db: PrismaEscopado, pageId: string): Promise<void> {
    const pagina = await db.page.findFirst({
      where: { id: pageId, deletedAt: null },
      select: { id: true },
    });

    if (!pagina) {
      throw new BadRequestException('Pagina vinculada nao encontrada.');
    }
  }

  private async registrar(userId: string, acao: ActivityAction, entityId: string): Promise<void> {
    await this.prisma.activityLog.create({
      data: { userId, action: acao, entityType: ActivityEntity.task, entityId },
    });
  }
}
