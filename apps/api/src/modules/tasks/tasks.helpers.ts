import type { EntityColor, TaskPriority } from '@prisma/client';
import type {
  AnexoDaTarefa,
  ColunaDeTarefas,
  ItemDeChecklist,
  TarefaCompleta,
  TarefaResumida,
} from '@sinapse/shared';

export { exigirEncontrado } from '../notes/notes.helpers';

/** Campos de tarefa carregados para montar o quadro/lista (view resumida). */
export const SELECAO_DE_TAREFAS = {
  id: true,
  columnId: true,
  title: true,
  priority: true,
  dueDate: true,
  completedAt: true,
  archivedAt: true,
  position: true,
  pageId: true,
  page: { select: { id: true, title: true } },
  event: { select: { id: true, title: true, startAt: true } },
  checklist: { select: { done: true } },
  _count: { select: { attachments: true } },
} as const;

export interface TarefaBruta {
  id: string;
  columnId: string;
  title: string;
  priority: TaskPriority;
  dueDate: Date | null;
  completedAt: Date | null;
  archivedAt: Date | null;
  position: number;
  pageId: string | null;
  page: { id: string; title: string } | null;
  event: { id: string; title: string; startAt: Date } | null;
  checklist: { done: boolean }[];
  _count: { attachments: number };
}

export function montarTarefaResumida(tarefa: TarefaBruta): TarefaResumida {
  return {
    id: tarefa.id,
    columnId: tarefa.columnId,
    title: tarefa.title,
    priority: tarefa.priority,
    dueDate: tarefa.dueDate?.toISOString() ?? null,
    completedAt: tarefa.completedAt?.toISOString() ?? null,
    archivedAt: tarefa.archivedAt?.toISOString() ?? null,
    position: tarefa.position,
    pagina: tarefa.page ? { id: tarefa.page.id, title: tarefa.page.title } : null,
    evento: tarefa.event
      ? {
          id: tarefa.event.id,
          title: tarefa.event.title,
          startAt: tarefa.event.startAt.toISOString(),
        }
      : null,
    totalDeChecklist: tarefa.checklist.length,
    checklistConcluidos: tarefa.checklist.filter((item) => item.done).length,
    totalDeAnexos: tarefa._count.attachments,
  };
}

export interface ColunaBruta {
  id: string;
  name: string;
  color: EntityColor;
  position: number;
  archivedAt: Date | null;
  tasks: TarefaBruta[];
}

export function montarColuna(coluna: ColunaBruta): ColunaDeTarefas {
  return {
    id: coluna.id,
    name: coluna.name,
    color: coluna.color,
    position: coluna.position,
    archivedAt: coluna.archivedAt?.toISOString() ?? null,
    tarefas: [...coluna.tasks].sort((a, b) => a.position - b.position).map(montarTarefaResumida),
  };
}

/** Campos carregados para o detalhe completo de uma tarefa. */
export const INCLUIR_TAREFA_COMPLETA = {
  page: { select: { id: true, title: true } },
  event: { select: { id: true, title: true, startAt: true } },
  checklist: { orderBy: { position: 'asc' as const } },
  attachments: { orderBy: { createdAt: 'asc' as const } },
} as const;

export interface ItemDeChecklistBruto {
  id: string;
  label: string;
  done: boolean;
  position: number;
}

export interface AnexoBruto {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
  createdAt: Date;
}

export interface TarefaCompletaBruta {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueDate: Date | null;
  completedAt: Date | null;
  archivedAt: Date | null;
  position: number;
  pageId: string | null;
  page: { id: string; title: string } | null;
  event: { id: string; title: string; startAt: Date } | null;
  createdAt: Date;
  updatedAt: Date;
  checklist: ItemDeChecklistBruto[];
  attachments: AnexoBruto[];
}

function montarItemDeChecklist(item: ItemDeChecklistBruto): ItemDeChecklist {
  return { id: item.id, label: item.label, done: item.done, position: item.position };
}

function montarAnexo(anexo: AnexoBruto): AnexoDaTarefa {
  return {
    id: anexo.id,
    fileName: anexo.fileName,
    mimeType: anexo.mimeType,
    sizeBytes: anexo.sizeBytes.toString(),
    createdAt: anexo.createdAt.toISOString(),
  };
}

export function montarTarefaCompleta(tarefa: TarefaCompletaBruta): TarefaCompleta {
  return {
    id: tarefa.id,
    columnId: tarefa.columnId,
    title: tarefa.title,
    description: tarefa.description,
    priority: tarefa.priority,
    dueDate: tarefa.dueDate?.toISOString() ?? null,
    completedAt: tarefa.completedAt?.toISOString() ?? null,
    archivedAt: tarefa.archivedAt?.toISOString() ?? null,
    position: tarefa.position,
    pagina: tarefa.page ? { id: tarefa.page.id, title: tarefa.page.title } : null,
    evento: tarefa.event
      ? {
          id: tarefa.event.id,
          title: tarefa.event.title,
          startAt: tarefa.event.startAt.toISOString(),
        }
      : null,
    createdAt: tarefa.createdAt.toISOString(),
    updatedAt: tarefa.updatedAt.toISOString(),
    totalDeChecklist: tarefa.checklist.length,
    checklistConcluidos: tarefa.checklist.filter((item) => item.done).length,
    totalDeAnexos: tarefa.attachments.length,
    checklist: tarefa.checklist.map(montarItemDeChecklist),
    anexos: tarefa.attachments.map(montarAnexo),
  };
}
