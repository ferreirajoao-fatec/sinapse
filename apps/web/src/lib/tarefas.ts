import type {
  AdicionarItemDeChecklistInput,
  AtualizarColunaDeTarefasInput,
  AtualizarItemDeChecklistInput,
  AtualizarTarefaInput,
  ColunaDeTarefas,
  ConfirmarUploadInput,
  CriarColunaDeTarefasInput,
  CriarTarefaInput,
  CriarUrlDeUploadInput,
  FiltrosDeTarefas,
  MoverTarefaInput,
  TarefaCompleta,
  TarefaResumida,
  UrlAssinada,
  UrlDeUpload,
} from '@sinapse/shared';
import { apiFetch } from './api';

export interface ItemReordenado {
  id: string;
  position: number;
}

/** Se false, o backend nao tem S3 configurado: esconda a secao de anexos. */
export function anexosDisponiveis() {
  return apiFetch<{ habilitado: boolean }>('/tasks/anexos/disponivel');
}

// -----------------------------------------------------------------------------
// Colunas (quadro Kanban)
// -----------------------------------------------------------------------------

export function buscarQuadro(incluirArquivadas = false) {
  return apiFetch<ColunaDeTarefas[]>(`/task-columns${incluirArquivadas ? '?arquivadas=true' : ''}`);
}

export function criarColunaDeTarefas(dados: CriarColunaDeTarefasInput) {
  return apiFetch<ColunaDeTarefas>('/task-columns', { method: 'POST', body: dados });
}

export function atualizarColunaDeTarefas(id: string, dados: AtualizarColunaDeTarefasInput) {
  return apiFetch<ColunaDeTarefas>(`/task-columns/${id}`, { method: 'PATCH', body: dados });
}

export function excluirColunaDeTarefas(id: string) {
  return apiFetch<void>(`/task-columns/${id}`, { method: 'DELETE' });
}

export function reordenarColunasDeTarefas(itens: ItemReordenado[]) {
  return apiFetch<void>('/task-columns/reorder', { method: 'POST', body: { itens } });
}

// -----------------------------------------------------------------------------
// Tarefas
// -----------------------------------------------------------------------------

function paraQuery(filtros: FiltrosDeTarefas): string {
  const parametros = new URLSearchParams();

  if (filtros.columnId) parametros.set('columnId', filtros.columnId);
  if (filtros.priority) parametros.set('priority', filtros.priority);
  if (filtros.pageId) parametros.set('pageId', filtros.pageId);
  if (filtros.concluida !== undefined) parametros.set('concluida', String(filtros.concluida));
  if (filtros.atrasada) parametros.set('atrasada', 'true');
  if (filtros.arquivadas) parametros.set('arquivadas', 'true');

  const texto = parametros.toString();
  return texto ? `?${texto}` : '';
}

export function listarTarefas(filtros: FiltrosDeTarefas = {}) {
  return apiFetch<TarefaResumida[]>(`/tasks${paraQuery(filtros)}`);
}

export function buscarTarefa(id: string) {
  return apiFetch<TarefaCompleta>(`/tasks/${id}`);
}

export function criarTarefa(dados: CriarTarefaInput) {
  return apiFetch<TarefaCompleta>('/tasks', { method: 'POST', body: dados });
}

export function atualizarTarefa(id: string, dados: AtualizarTarefaInput) {
  return apiFetch<TarefaCompleta>(`/tasks/${id}`, { method: 'PATCH', body: dados });
}

export function excluirTarefa(id: string) {
  return apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' });
}

export function moverTarefa(id: string, dados: MoverTarefaInput) {
  return apiFetch<TarefaCompleta>(`/tasks/${id}/mover`, { method: 'POST', body: dados });
}

export function reordenarTarefas(itens: ItemReordenado[]) {
  return apiFetch<void>('/tasks/reorder', { method: 'POST', body: { itens } });
}

// -----------------------------------------------------------------------------
// Checklist
// -----------------------------------------------------------------------------

export function adicionarItemDeChecklist(tarefaId: string, dados: AdicionarItemDeChecklistInput) {
  return apiFetch<TarefaCompleta>(`/tasks/${tarefaId}/checklist`, { method: 'POST', body: dados });
}

export function atualizarItemDeChecklist(
  tarefaId: string,
  itemId: string,
  dados: AtualizarItemDeChecklistInput,
) {
  return apiFetch<TarefaCompleta>(`/tasks/${tarefaId}/checklist/${itemId}`, {
    method: 'PATCH',
    body: dados,
  });
}

export function removerItemDeChecklist(tarefaId: string, itemId: string) {
  return apiFetch<void>(`/tasks/${tarefaId}/checklist/${itemId}`, { method: 'DELETE' });
}

// -----------------------------------------------------------------------------
// Anexos
// -----------------------------------------------------------------------------

export function criarUrlDeUpload(tarefaId: string, dados: CriarUrlDeUploadInput) {
  return apiFetch<UrlDeUpload>(`/tasks/${tarefaId}/anexos/upload-url`, {
    method: 'POST',
    body: dados,
  });
}

export function confirmarUpload(tarefaId: string, dados: ConfirmarUploadInput) {
  return apiFetch<TarefaCompleta>(`/tasks/${tarefaId}/anexos`, { method: 'POST', body: dados });
}

export function urlDeDownloadDoAnexo(tarefaId: string, anexoId: string) {
  return apiFetch<UrlAssinada>(`/tasks/${tarefaId}/anexos/${anexoId}/download-url`);
}

export function removerAnexo(tarefaId: string, anexoId: string) {
  return apiFetch<void>(`/tasks/${tarefaId}/anexos/${anexoId}`, { method: 'DELETE' });
}

/** Sobe o arquivo direto no storage usando a URL assinada. Nunca passa pela API. */
export async function subirArquivo(url: string, arquivo: File): Promise<void> {
  const resposta = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': arquivo.type },
    body: arquivo,
  });

  if (!resposta.ok) {
    throw new Error('Nao foi possivel enviar o arquivo.');
  }
}
