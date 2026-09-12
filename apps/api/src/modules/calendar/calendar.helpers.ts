import type { EntityColor, RecurrenceFrequency } from '@prisma/client';
import type { EventoCompleto, OcorrenciaDeEvento } from '@sinapse/shared';

export { exigirEncontrado } from '../notes/notes.helpers';

export interface EventoBruto {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  link: string | null;
  color: EntityColor;
  allDay: boolean;
  startAt: Date;
  endAt: Date;
  recurrenceFreq: RecurrenceFrequency;
  recurrenceInterval: number;
  recurrenceUntil: Date | null;
  reminderMinutesBefore: number | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function montarEvento(evento: EventoBruto): EventoCompleto {
  return {
    id: evento.id,
    title: evento.title,
    description: evento.description,
    location: evento.location,
    link: evento.link,
    color: evento.color,
    allDay: evento.allDay,
    startAt: evento.startAt.toISOString(),
    endAt: evento.endAt.toISOString(),
    recurrenceFreq: evento.recurrenceFreq,
    recurrenceInterval: evento.recurrenceInterval,
    recurrenceUntil: evento.recurrenceUntil?.toISOString() ?? null,
    reminderMinutesBefore: evento.reminderMinutesBefore,
    archivedAt: evento.archivedAt?.toISOString() ?? null,
    createdAt: evento.createdAt.toISOString(),
    updatedAt: evento.updatedAt.toISOString(),
  };
}

export interface Ocorrencia {
  inicio: Date;
  fim: Date;
}

const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** Rede de seguranca contra uma janela [from,to] absurdamente larga. */
const LIMITE_DE_ITERACOES = 366;

/**
 * Soma meses preservando o dia, com clamp para o ultimo dia do mes quando o
 * mes de destino e mais curto (ex.: 31 de jan + 1 mes = 28/29 de fev, nunca
 * "rola" pra marco).
 */
function avancarMes(data: Date, meses: number): Date {
  const diaOriginal = data.getUTCDate();
  const proxima = new Date(data);
  proxima.setUTCMonth(proxima.getUTCMonth() + meses);

  if (proxima.getUTCDate() !== diaOriginal) {
    proxima.setUTCDate(0);
  }

  return proxima;
}

function avancarCursor(cursor: Date, freq: RecurrenceFrequency, intervalo: number): Date {
  switch (freq) {
    case 'daily':
      return new Date(cursor.getTime() + intervalo * UM_DIA_MS);
    case 'weekly':
      return new Date(cursor.getTime() + intervalo * 7 * UM_DIA_MS);
    case 'monthly':
      return avancarMes(cursor, intervalo);
    case 'none':
      return cursor;
  }
}

/**
 * Expande um evento em ocorrencias dentro de [from, to].
 *
 * Sem recorrencia, no maximo uma ocorrencia. Recorrente, itera a partir do
 * inicio da serie — com um salto direto (aritmetica, sem iterar ocorrencia a
 * ocorrencia) quando a frequencia e diaria ou semanal e o inicio da serie e
 * muito anterior a "from", pra uma serie de anos nao percorrer tudo desde o
 * comeco. Mensal nao tem passo fixo (meses tem tamanhos diferentes), entao
 * conta so com o teto de iteracoes — na pratica, decadas de recorrencia
 * mensal cabem tranquilamente nesse teto.
 */
export function expandirOcorrencias(evento: EventoBruto, from: Date, to: Date): Ocorrencia[] {
  const duracaoMs = evento.endAt.getTime() - evento.startAt.getTime();

  if (evento.recurrenceFreq === 'none') {
    if (evento.startAt.getTime() <= to.getTime() && evento.endAt.getTime() >= from.getTime()) {
      return [{ inicio: evento.startAt, fim: evento.endAt }];
    }
    return [];
  }

  const limite = evento.recurrenceUntil
    ? new Date(Math.min(evento.recurrenceUntil.getTime(), to.getTime()))
    : to;

  let cursor = evento.startAt;

  if (evento.recurrenceFreq === 'daily' || evento.recurrenceFreq === 'weekly') {
    const passoMs =
      evento.recurrenceInterval * (evento.recurrenceFreq === 'daily' ? UM_DIA_MS : 7 * UM_DIA_MS);
    const diferenca = from.getTime() - evento.startAt.getTime();

    if (diferenca > 0) {
      const passosASaltar = Math.floor(diferenca / passoMs);
      cursor = new Date(evento.startAt.getTime() + passosASaltar * passoMs);
    }
  }

  const ocorrencias: Ocorrencia[] = [];

  for (let i = 0; i < LIMITE_DE_ITERACOES && cursor.getTime() <= limite.getTime(); i++) {
    const fimDaOcorrencia = new Date(cursor.getTime() + duracaoMs);

    if (cursor.getTime() <= to.getTime() && fimDaOcorrencia.getTime() >= from.getTime()) {
      ocorrencias.push({ inicio: cursor, fim: fimDaOcorrencia });
    }

    cursor = avancarCursor(cursor, evento.recurrenceFreq, evento.recurrenceInterval);
  }

  return ocorrencias;
}

export function montarOcorrencia(evento: EventoBruto, ocorrencia: Ocorrencia): OcorrenciaDeEvento {
  return {
    eventId: evento.id,
    title: evento.title,
    color: evento.color,
    allDay: evento.allDay,
    location: evento.location,
    link: evento.link,
    inicio: ocorrencia.inicio.toISOString(),
    fim: ocorrencia.fim.toISOString(),
    recorrente: evento.recurrenceFreq !== 'none',
  };
}
