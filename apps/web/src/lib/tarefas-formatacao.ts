import type { TaskPriority } from '@sinapse/shared';

/**
 * O prazo de uma tarefa e uma data (um dia), nao um instante: gravamos
 * meia-noite UTC daquele dia. Formatar e comparar em UTC evita que o fuso
 * horario do navegador jogue o dia exibido para o dia anterior.
 */

export const NOMES_DE_PRIORIDADE: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

export const TOM_DE_PRIORIDADE: Record<TaskPriority, 'neutro' | 'estudo' | 'atencao' | 'perigo'> = {
  low: 'neutro',
  medium: 'estudo',
  high: 'atencao',
  urgent: 'perigo',
};

const FORMATADOR = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
});

/** Hoje, em UTC, sem hora. Usado para comparar com o prazo sem depender do fuso. */
function inicioDeHojeUtc(): number {
  const agora = new Date();
  return Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate());
}

export function formatarPrazo(
  dueDate: string | null,
  completedAt: string | null,
): { texto: string; atrasada: boolean } | null {
  if (!dueDate) return null;

  const data = new Date(dueDate);
  const atrasada = !completedAt && data.getTime() < inicioDeHojeUtc();

  return { texto: FORMATADOR.format(data), atrasada };
}
