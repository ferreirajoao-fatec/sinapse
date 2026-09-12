import type {
  AtualizarEventoInput,
  CriarEventoInput,
  EventoCompleto,
  OcorrenciaDeEvento,
} from '@sinapse/shared';
import { apiFetch } from './api';

export function listarOcorrencias(from: Date, to: Date, incluirArquivados = false) {
  const parametros = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  if (incluirArquivados) parametros.set('arquivados', 'true');

  return apiFetch<OcorrenciaDeEvento[]>(`/calendar-events?${parametros.toString()}`);
}

export function buscarEvento(id: string) {
  return apiFetch<EventoCompleto>(`/calendar-events/${id}`);
}

export function criarEvento(dados: CriarEventoInput) {
  return apiFetch<EventoCompleto>('/calendar-events', { method: 'POST', body: dados });
}

export function atualizarEvento(id: string, dados: AtualizarEventoInput) {
  return apiFetch<EventoCompleto>(`/calendar-events/${id}`, { method: 'PATCH', body: dados });
}

export function excluirEvento(id: string) {
  return apiFetch<void>(`/calendar-events/${id}`, { method: 'DELETE' });
}
