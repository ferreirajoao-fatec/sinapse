import { z } from 'zod';
import { ENTITY_COLORS, MAX_UPLOAD_SIZE_BYTES, TASK_PRIORITIES } from '../constants';

/**
 * Contratos de tarefas: coluna (Kanban), tarefa, checklist e anexos.
 * Os mesmos schemas validam o formulario no navegador e o corpo na API.
 */

const nomeCurto = z.string().trim().min(1, 'Informe um nome').max(80, 'No maximo 80 caracteres');
const tituloDaTarefa = z
  .string()
  .trim()
  .min(1, 'Informe um titulo')
  .max(200, 'No maximo 200 caracteres');

// -----------------------------------------------------------------------------
// Coluna
// -----------------------------------------------------------------------------

export const criarColunaDeTarefasSchema = z.object({
  name: nomeCurto,
  color: z.enum(ENTITY_COLORS).default('indigo'),
});

export const atualizarColunaDeTarefasSchema = z.object({
  name: nomeCurto.optional(),
  color: z.enum(ENTITY_COLORS).optional(),
  archived: z.boolean().optional(),
});

// -----------------------------------------------------------------------------
// Tarefa
// -----------------------------------------------------------------------------

export const criarTarefaSchema = z.object({
  columnId: z.string().uuid('Coluna invalida'),
  title: tituloDaTarefa,
  description: z.string().trim().max(4000, 'No maximo 4000 caracteres').nullable().optional(),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  dueDate: z.string().datetime().nullable().optional(),
  pageId: z.string().uuid().nullable().optional(),
});

export const atualizarTarefaSchema = z.object({
  title: tituloDaTarefa.optional(),
  description: z.string().trim().max(4000, 'No maximo 4000 caracteres').nullable().optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  pageId: z.string().uuid().nullable().optional(),
  completed: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export const moverTarefaSchema = z.object({
  columnId: z.string().uuid('Coluna invalida'),
  position: z.number().int().min(0),
});

// -----------------------------------------------------------------------------
// Checklist
// -----------------------------------------------------------------------------

export const adicionarItemDeChecklistSchema = z.object({
  label: z.string().trim().min(1, 'Informe um texto').max(200, 'No maximo 200 caracteres'),
});

export const atualizarItemDeChecklistSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Informe um texto')
    .max(200, 'No maximo 200 caracteres')
    .optional(),
  done: z.boolean().optional(),
});

// -----------------------------------------------------------------------------
// Anexos
// -----------------------------------------------------------------------------

export const criarUrlDeUploadSchema = z.object({
  fileName: z.string().trim().min(1, 'Informe o nome do arquivo').max(255),
  mimeType: z.string().trim().min(1, 'Informe o tipo do arquivo').max(120),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_SIZE_BYTES, 'Arquivo maior que o limite permitido'),
});

export const confirmarUploadSchema = criarUrlDeUploadSchema.extend({
  storageKey: z.string().trim().min(1).max(500),
});

// -----------------------------------------------------------------------------
// Tipos de resposta
// -----------------------------------------------------------------------------

export interface ItemDeChecklist {
  id: string;
  label: string;
  done: boolean;
  position: number;
}

export interface AnexoDaTarefa {
  id: string;
  fileName: string;
  mimeType: string;
  /** BigInt no banco; chega como string para nao perder precisao no JSON. */
  sizeBytes: string;
  createdAt: string;
}

export interface PaginaVinculada {
  id: string;
  title: string;
}

export interface TarefaResumida {
  id: string;
  columnId: string;
  title: string;
  priority: (typeof TASK_PRIORITIES)[number];
  dueDate: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  position: number;
  pagina: PaginaVinculada | null;
  totalDeChecklist: number;
  checklistConcluidos: number;
  totalDeAnexos: number;
}

export interface TarefaCompleta extends TarefaResumida {
  description: string | null;
  createdAt: string;
  updatedAt: string;
  checklist: ItemDeChecklist[];
  anexos: AnexoDaTarefa[];
}

export interface ColunaDeTarefas {
  id: string;
  name: string;
  color: (typeof ENTITY_COLORS)[number];
  position: number;
  archivedAt: string | null;
  tarefas: TarefaResumida[];
}

export interface UrlDeUpload {
  url: string;
  storageKey: string;
}

export interface UrlAssinada {
  url: string;
}

export interface FiltrosDeTarefas {
  columnId?: string;
  priority?: (typeof TASK_PRIORITIES)[number];
  pageId?: string;
  concluida?: boolean;
  atrasada?: boolean;
  arquivadas?: boolean;
}

export type CriarColunaDeTarefasInput = z.infer<typeof criarColunaDeTarefasSchema>;
export type AtualizarColunaDeTarefasInput = z.infer<typeof atualizarColunaDeTarefasSchema>;
export type CriarTarefaInput = z.infer<typeof criarTarefaSchema>;
export type AtualizarTarefaInput = z.infer<typeof atualizarTarefaSchema>;
export type MoverTarefaInput = z.infer<typeof moverTarefaSchema>;
export type AdicionarItemDeChecklistInput = z.infer<typeof adicionarItemDeChecklistSchema>;
export type AtualizarItemDeChecklistInput = z.infer<typeof atualizarItemDeChecklistSchema>;
export type CriarUrlDeUploadInput = z.infer<typeof criarUrlDeUploadSchema>;
export type ConfirmarUploadInput = z.infer<typeof confirmarUploadSchema>;
