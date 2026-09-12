import { z } from 'zod';
import { ENTITY_COLORS } from '../constants';

/**
 * Contratos da hierarquia de anotacoes: grupo, secao, pagina e etiqueta.
 * Os mesmos schemas validam o formulario no navegador e o corpo na API.
 */

const nomeCurto = z.string().trim().min(1, 'Informe um nome').max(80, 'No maximo 80 caracteres');
const icone = z.string().trim().max(40).nullable().optional();

// -----------------------------------------------------------------------------
// Grupo
// -----------------------------------------------------------------------------

export const criarGrupoSchema = z.object({
  name: nomeCurto,
  icon: icone,
  color: z.enum(ENTITY_COLORS).default('indigo'),
});

export const atualizarGrupoSchema = z.object({
  name: nomeCurto.optional(),
  icon: icone,
  color: z.enum(ENTITY_COLORS).optional(),
  archived: z.boolean().optional(),
});

// -----------------------------------------------------------------------------
// Secao
// -----------------------------------------------------------------------------

export const criarSecaoSchema = z.object({
  groupId: z.string().uuid('Grupo invalido'),
  name: nomeCurto,
  icon: icone,
});

export const atualizarSecaoSchema = z.object({
  name: nomeCurto.optional(),
  icon: icone,
  archived: z.boolean().optional(),
});

// -----------------------------------------------------------------------------
// Pagina
// -----------------------------------------------------------------------------

/** Documento do editor no formato ProseMirror, guardado como JSONB. */
export const conteudoDaPaginaSchema = z.object({
  type: z.literal('doc'),
  content: z.array(z.record(z.unknown())).default([]),
});

export const criarPaginaSchema = z.object({
  sectionId: z.string().uuid('Secao invalida'),
  parentPageId: z.string().uuid().nullable().optional(),
  title: z.string().trim().max(200, 'No maximo 200 caracteres').default('Sem titulo'),
  icon: icone,
});

export const atualizarPaginaSchema = z.object({
  title: z.string().trim().max(200, 'No maximo 200 caracteres').optional(),
  icon: icone,
  content: conteudoDaPaginaSchema.optional(),
  isFavorite: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export const moverPaginaSchema = z.object({
  sectionId: z.string().uuid('Secao invalida'),
  parentPageId: z.string().uuid().nullable().optional(),
});

/** Reordenacao em lote: um unico pedido para toda a lista arrastada. */
export const reordenarSchema = z.object({
  itens: z
    .array(z.object({ id: z.string().uuid(), position: z.number().int().min(0) }))
    .min(1, 'Nada para reordenar')
    .max(500),
});

export const definirEtiquetasSchema = z.object({
  tagIds: z.array(z.string().uuid()).max(20, 'No maximo 20 etiquetas por pagina'),
});

// -----------------------------------------------------------------------------
// Etiqueta
// -----------------------------------------------------------------------------

export const criarEtiquetaSchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Informe um nome')
    .max(40, 'No maximo 40 caracteres'),
  color: z.enum(ENTITY_COLORS).default('slate'),
});

export const atualizarEtiquetaSchema = criarEtiquetaSchema.partial();

// -----------------------------------------------------------------------------
// Lixeira
// -----------------------------------------------------------------------------

export const TIPOS_NA_LIXEIRA = [
  'grupo',
  'secao',
  'pagina',
  'coluna_de_tarefas',
  'tarefa',
  'evento',
] as const;
export type TipoNaLixeira = (typeof TIPOS_NA_LIXEIRA)[number];

// -----------------------------------------------------------------------------
// Tipos de resposta
// -----------------------------------------------------------------------------

export interface EtiquetaResumida {
  id: string;
  name: string;
  color: (typeof ENTITY_COLORS)[number];
  totalDePaginas?: number;
}

export interface PaginaNaArvore {
  id: string;
  title: string;
  icon: string | null;
  position: number;
  isFavorite: boolean;
  isPinned: boolean;
  archivedAt: string | null;
  subpaginas: PaginaNaArvore[];
}

export interface SecaoNaArvore {
  id: string;
  name: string;
  icon: string | null;
  position: number;
  archivedAt: string | null;
  paginas: PaginaNaArvore[];
}

export interface GrupoNaArvore {
  id: string;
  name: string;
  icon: string | null;
  color: (typeof ENTITY_COLORS)[number];
  position: number;
  archivedAt: string | null;
  secoes: SecaoNaArvore[];
}

export interface AnexoDePagina {
  id: string;
  fileName: string;
  mimeType: string;
  /** BigInt no banco; chega como string para nao perder precisao no JSON. */
  sizeBytes: string;
  createdAt: string;
}

export interface PaginaCompleta {
  id: string;
  sectionId: string;
  parentPageId: string | null;
  title: string;
  icon: string | null;
  content: { type: 'doc'; content: Record<string, unknown>[] };
  contentText: string;
  wordCount: number;
  isFavorite: boolean;
  isPinned: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: EtiquetaResumida[];
  anexos: AnexoDePagina[];
  caminho: { grupoId: string; grupo: string; secaoId: string; secao: string };
}

export interface PaginaResumida {
  id: string;
  title: string;
  icon: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  updatedAt: string;
  lastOpenedAt: string | null;
  caminho: { grupo: string; secao: string };
}

export interface ItemDaLixeira {
  tipo: TipoNaLixeira;
  id: string;
  nome: string;
  icone: string | null;
  excluidoEm: string;
  contexto: string | null;
  /** Quantos itens filhos somem junto se a exclusao virar definitiva. */
  filhos: number;
}

export type CriarGrupoInput = z.infer<typeof criarGrupoSchema>;
export type AtualizarGrupoInput = z.infer<typeof atualizarGrupoSchema>;
export type CriarSecaoInput = z.infer<typeof criarSecaoSchema>;
export type AtualizarSecaoInput = z.infer<typeof atualizarSecaoSchema>;
export type CriarPaginaInput = z.infer<typeof criarPaginaSchema>;
export type AtualizarPaginaInput = z.infer<typeof atualizarPaginaSchema>;
export type MoverPaginaInput = z.infer<typeof moverPaginaSchema>;
export type ReordenarInput = z.infer<typeof reordenarSchema>;
export type DefinirEtiquetasInput = z.infer<typeof definirEtiquetasSchema>;
export type CriarEtiquetaInput = z.infer<typeof criarEtiquetaSchema>;
export type AtualizarEtiquetaInput = z.infer<typeof atualizarEtiquetaSchema>;
export type ConteudoDaPagina = z.infer<typeof conteudoDaPaginaSchema>;
