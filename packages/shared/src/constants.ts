/**
 * Constantes compartilhadas entre o frontend e o backend.
 * Alterar aqui reflete nos dois lados, sem duplicacao.
 */

export const APP_NAME = 'Sinapse';

export const API_PREFIX = 'api/v1';

/** Limite de upload por arquivo, em bytes (50 MB). */
export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

/** Cota padrao de armazenamento por usuario, em bytes (1 GB). */
export const DEFAULT_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;

/** Intervalo do salvamento automatico do editor, em milissegundos. */
export const AUTOSAVE_DEBOUNCE_MS = 800;

/** Nomes dos cookies de sessao. Usados pela API e pelo middleware do Next. */
export const COOKIE_ACESSO = 'sinapse_acesso';
export const COOKIE_ATUALIZACAO = 'sinapse_atualizacao';

/** Validade dos tokens enviados por e-mail. */
export const VALIDADE_TOKEN_VERIFICACAO_HORAS = 24;
export const VALIDADE_TOKEN_SENHA_MINUTOS = 30;

export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export const LOCALES = ['pt-BR', 'en-US'] as const;
export type Locale = (typeof LOCALES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const RECURRENCE_FREQUENCIES = ['none', 'daily', 'weekly', 'monthly'] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

/** Cores permitidas para grupos, tags e categorias. */
export const ENTITY_COLORS = [
  'indigo',
  'teal',
  'amber',
  'rose',
  'violet',
  'emerald',
  'slate',
] as const;
export type EntityColor = (typeof ENTITY_COLORS)[number];

/**
 * Nomes de cookie repetidos em apps/web/src/middleware.ts como literais,
 * porque o runtime Edge do Next nao carrega este pacote. Ao alterar aqui,
 * altere la tambem.
 */
