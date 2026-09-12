import type { RecurrenceFrequency } from '@sinapse/shared';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Ao contrario do prazo das tarefas (so uma data, formatada forcando UTC em
 * tarefas-formatacao.ts), evento tem hora de verdade: aqui formatamos e
 * editamos no fuso local do navegador, que e o comportamento padrao do
 * date-fns e do <input type="datetime-local"> quando nao se forca UTC.
 */

export const NOMES_DE_RECORRENCIA: Record<RecurrenceFrequency, string> = {
  none: 'Nao repete',
  daily: 'Diariamente',
  weekly: 'Semanalmente',
  monthly: 'Mensalmente',
};

export const OPCOES_DE_LEMBRETE: { valor: number | null; rotulo: string }[] = [
  { valor: null, rotulo: 'Nenhum' },
  { valor: 5, rotulo: '5 minutos antes' },
  { valor: 15, rotulo: '15 minutos antes' },
  { valor: 30, rotulo: '30 minutos antes' },
  { valor: 60, rotulo: '1 hora antes' },
  { valor: 1440, rotulo: '1 dia antes' },
];

/** Valor para <input type="datetime-local">, no fuso local. */
export function paraCampoDeDataHora(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

/** Valor para <input type="date">, no fuso local. */
export function paraCampoDeData(iso: string): string {
  return format(new Date(iso), 'yyyy-MM-dd');
}

export function formatarHora(iso: string): string {
  return format(new Date(iso), 'HH:mm', { locale: ptBR });
}

export function formatarDataCurta(iso: string): string {
  return format(new Date(iso), "d 'de' MMM", { locale: ptBR });
}

export function formatarDataLonga(iso: string): string {
  return format(new Date(iso), "EEEE, d 'de' MMMM", { locale: ptBR });
}

/** Rotulo do horario de uma ocorrencia, pronto para exibir num chip/card. */
export function formatarIntervalo(inicio: string, fim: string, allDay: boolean): string {
  if (allDay) return 'Dia inteiro';

  const dataInicio = new Date(inicio);
  const dataFim = new Date(fim);

  if (isSameDay(dataInicio, dataFim)) {
    return `${formatarHora(inicio)} - ${formatarHora(fim)}`;
  }

  return `${formatarDataCurta(inicio)} ${formatarHora(inicio)} - ${formatarDataCurta(fim)} ${formatarHora(fim)}`;
}
