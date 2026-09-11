import type {
  AtualizarEtiquetaInput,
  AtualizarGrupoInput,
  AtualizarPaginaInput,
  AtualizarSecaoInput,
  CriarEtiquetaInput,
  CriarGrupoInput,
  CriarPaginaInput,
  CriarSecaoInput,
  DefinirEtiquetasInput,
  EtiquetaResumida,
  GrupoNaArvore,
  ItemDaLixeira,
  MoverPaginaInput,
  PaginaCompleta,
  PaginaResumida,
  SecaoNaArvore,
  TipoNaLixeira,
} from '@sinapse/shared';
import { apiFetch } from './api';

/** Item de reordenacao: id e a posicao final na lista. */
export interface ItemReordenado {
  id: string;
  position: number;
}

// -----------------------------------------------------------------------------
// Arvore
// -----------------------------------------------------------------------------

export function buscarArvore(incluirArquivados = false) {
  return apiFetch<GrupoNaArvore[]>(`/tree${incluirArquivados ? '?arquivados=true' : ''}`);
}

// -----------------------------------------------------------------------------
// Grupos
// -----------------------------------------------------------------------------

export function criarGrupo(dados: CriarGrupoInput) {
  return apiFetch<GrupoNaArvore>('/groups', { method: 'POST', body: dados });
}

export function atualizarGrupo(id: string, dados: AtualizarGrupoInput) {
  return apiFetch<GrupoNaArvore>(`/groups/${id}`, { method: 'PATCH', body: dados });
}

export function excluirGrupo(id: string) {
  return apiFetch<void>(`/groups/${id}`, { method: 'DELETE' });
}

export function reordenarGrupos(itens: ItemReordenado[]) {
  return apiFetch<void>('/groups/reorder', { method: 'POST', body: { itens } });
}

// -----------------------------------------------------------------------------
// Secoes
// -----------------------------------------------------------------------------

export function criarSecao(dados: CriarSecaoInput) {
  return apiFetch<SecaoNaArvore>('/sections', { method: 'POST', body: dados });
}

export function atualizarSecao(id: string, dados: AtualizarSecaoInput) {
  return apiFetch<SecaoNaArvore>(`/sections/${id}`, { method: 'PATCH', body: dados });
}

export function excluirSecao(id: string) {
  return apiFetch<void>(`/sections/${id}`, { method: 'DELETE' });
}

export function reordenarSecoes(itens: ItemReordenado[]) {
  return apiFetch<void>('/sections/reorder', { method: 'POST', body: { itens } });
}

// -----------------------------------------------------------------------------
// Paginas
// -----------------------------------------------------------------------------

export function buscarPagina(id: string) {
  return apiFetch<PaginaCompleta>(`/pages/${id}`);
}

export function criarPagina(dados: CriarPaginaInput) {
  return apiFetch<PaginaCompleta>('/pages', { method: 'POST', body: dados });
}

export function atualizarPagina(id: string, dados: AtualizarPaginaInput) {
  return apiFetch<PaginaCompleta>(`/pages/${id}`, { method: 'PATCH', body: dados });
}

export function excluirPagina(id: string) {
  return apiFetch<void>(`/pages/${id}`, { method: 'DELETE' });
}

export function moverPagina(id: string, dados: MoverPaginaInput) {
  return apiFetch<PaginaCompleta>(`/pages/${id}/mover`, { method: 'POST', body: dados });
}

export function duplicarPagina(id: string) {
  return apiFetch<PaginaCompleta>(`/pages/${id}/duplicar`, { method: 'POST' });
}

export function reordenarPaginas(itens: ItemReordenado[]) {
  return apiFetch<void>('/pages/reorder', { method: 'POST', body: { itens } });
}

export function definirEtiquetasDaPagina(id: string, dados: DefinirEtiquetasInput) {
  return apiFetch<PaginaCompleta>(`/pages/${id}/etiquetas`, { method: 'POST', body: dados });
}

export function buscarRecentes() {
  return apiFetch<PaginaResumida[]>('/pages/recentes');
}

export function buscarFavoritas() {
  return apiFetch<PaginaResumida[]>('/pages/favoritas');
}

// -----------------------------------------------------------------------------
// Etiquetas
// -----------------------------------------------------------------------------

export function listarEtiquetas() {
  return apiFetch<EtiquetaResumida[]>('/tags');
}

export function criarEtiqueta(dados: CriarEtiquetaInput) {
  return apiFetch<EtiquetaResumida>('/tags', { method: 'POST', body: dados });
}

export function atualizarEtiqueta(id: string, dados: AtualizarEtiquetaInput) {
  return apiFetch<EtiquetaResumida>(`/tags/${id}`, { method: 'PATCH', body: dados });
}

export function excluirEtiqueta(id: string) {
  return apiFetch<void>(`/tags/${id}`, { method: 'DELETE' });
}

// -----------------------------------------------------------------------------
// Lixeira
// -----------------------------------------------------------------------------

export function listarLixeira() {
  return apiFetch<ItemDaLixeira[]>('/trash');
}

export function restaurarDaLixeira(tipo: TipoNaLixeira, id: string) {
  return apiFetch<void>(`/trash/${tipo}/${id}/restaurar`, { method: 'POST' });
}

export function excluirDefinitivamente(tipo: TipoNaLixeira, id: string) {
  return apiFetch<void>(`/trash/${tipo}/${id}`, { method: 'DELETE' });
}

export function esvaziarLixeira() {
  return apiFetch<{ removidos: number }>('/trash', { method: 'DELETE' });
}
