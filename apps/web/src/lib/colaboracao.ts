import { API_URL, apiFetch } from './api';

export interface TicketDeColaboracao {
  token: string;
  documento: string;
  permissao: 'dono' | 'editor' | 'leitor';
}

/** Ticket de 60s que autentica a conexao de edicao em tempo real. */
export function ticketDeColaboracao(paginaId: string) {
  return apiFetch<TicketDeColaboracao>(`/pages/${paginaId}/colaboracao`, { method: 'POST' });
}

/**
 * Endereco do WebSocket de colaboracao.
 *
 * Em producao ele vem de NEXT_PUBLIC_COLLAB_URL e aponta direto para a API,
 * porque o repasse da Vercel nao carrega WebSocket. Em desenvolvimento a API
 * tem endereco absoluto, entao basta trocar http por ws.
 */
export function urlDaColaboracao(): string {
  const explicita = process.env.NEXT_PUBLIC_COLLAB_URL;
  if (explicita) return explicita;

  const base = /^https?:\/\//.test(API_URL) ? API_URL : `${window.location.origin}${API_URL}`;
  return `${base.replace(/^http/, 'ws')}/colaboracao`;
}

/** Cores dos cursores, legiveis sobre fundo claro e escuro. */
const CORES_DOS_CURSORES = [
  '#5b4bd6',
  '#0f9d8f',
  '#d34a45',
  '#c8830f',
  '#2f9e57',
  '#b8458f',
  '#3b7dd8',
];

/** A mesma pessoa tem sempre a mesma cor, em qualquer aparelho. */
export function corDoUsuario(id: string): string {
  let soma = 0;
  for (const letra of id) soma = (soma * 31 + letra.charCodeAt(0)) >>> 0;
  return CORES_DOS_CURSORES[soma % CORES_DOS_CURSORES.length]!;
}
