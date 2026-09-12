import { describe, expect, it } from 'vitest';
import { expandirOcorrencias, montarEvento, type EventoBruto } from './calendar.helpers';

function evento(overrides: Partial<EventoBruto> = {}): EventoBruto {
  return {
    id: 'evento-1',
    title: 'Aula de Banco de Dados',
    description: null,
    location: null,
    link: null,
    color: 'indigo',
    allDay: false,
    startAt: new Date('2026-01-05T14:00:00.000Z'),
    endAt: new Date('2026-01-05T15:00:00.000Z'),
    recurrenceFreq: 'none',
    recurrenceInterval: 1,
    recurrenceUntil: null,
    reminderMinutesBefore: null,
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('expandirOcorrencias', () => {
  it('evento unico dentro do intervalo gera uma ocorrencia', () => {
    const ocorrencias = expandirOcorrencias(
      evento(),
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-31T00:00:00.000Z'),
    );

    expect(ocorrencias).toHaveLength(1);
    expect(ocorrencias[0]?.inicio).toEqual(new Date('2026-01-05T14:00:00.000Z'));
  });

  it('evento unico fora do intervalo nao gera ocorrencia', () => {
    const ocorrencias = expandirOcorrencias(
      evento(),
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-28T00:00:00.000Z'),
    );

    expect(ocorrencias).toHaveLength(0);
  });

  it('recorrencia diaria gera uma ocorrencia por dia no intervalo', () => {
    const ocorrencias = expandirOcorrencias(
      evento({ recurrenceFreq: 'daily' }),
      new Date('2026-01-05T00:00:00.000Z'),
      new Date('2026-01-09T00:00:00.000Z'),
    );

    expect(ocorrencias).toHaveLength(4);
    expect(ocorrencias.map((o) => o.inicio.toISOString())).toEqual([
      '2026-01-05T14:00:00.000Z',
      '2026-01-06T14:00:00.000Z',
      '2026-01-07T14:00:00.000Z',
      '2026-01-08T14:00:00.000Z',
    ]);
  });

  it('recorrencia diaria salta direto para perto de "from", sem iterar do inicio', () => {
    // Serie comecou ha 2 anos; consultamos so uma semana bem mais a frente.
    const ocorrencias = expandirOcorrencias(
      evento({
        startAt: new Date('2024-01-01T14:00:00.000Z'),
        endAt: new Date('2024-01-01T15:00:00.000Z'),
        recurrenceFreq: 'daily',
      }),
      new Date('2026-06-01T00:00:00.000Z'),
      new Date('2026-06-03T00:00:00.000Z'),
    );

    expect(ocorrencias).toHaveLength(2);
    expect(ocorrencias[0]?.inicio.toISOString()).toBe('2026-06-01T14:00:00.000Z');
  });

  it('recorrencia semanal respeita o intervalo entre semanas', () => {
    const ocorrencias = expandirOcorrencias(
      evento({ recurrenceFreq: 'weekly', recurrenceInterval: 2 }),
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-02-28T00:00:00.000Z'),
    );

    expect(ocorrencias.map((o) => o.inicio.toISOString())).toEqual([
      '2026-01-05T14:00:00.000Z',
      '2026-01-19T14:00:00.000Z',
      '2026-02-02T14:00:00.000Z',
      '2026-02-16T14:00:00.000Z',
    ]);
  });

  it('recorrencia mensal faz o clamp para o ultimo dia quando o mes e mais curto', () => {
    const ocorrencias = expandirOcorrencias(
      evento({
        startAt: new Date('2026-01-31T10:00:00.000Z'),
        endAt: new Date('2026-01-31T11:00:00.000Z'),
        recurrenceFreq: 'monthly',
      }),
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-04-30T00:00:00.000Z'),
    );

    expect(ocorrencias.map((o) => o.inicio.toISOString())).toEqual([
      '2026-01-31T10:00:00.000Z',
      '2026-02-28T10:00:00.000Z',
      '2026-03-28T10:00:00.000Z',
      '2026-04-28T10:00:00.000Z',
    ]);
  });

  it('respeita recurrenceUntil, parando de gerar ocorrencias depois dele', () => {
    const ocorrencias = expandirOcorrencias(
      evento({
        recurrenceFreq: 'daily',
        // Fim do dia 7: inclui a ocorrencia das 14h desse dia, exclui a do dia 8.
        recurrenceUntil: new Date('2026-01-07T23:59:59.000Z'),
      }),
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-31T00:00:00.000Z'),
    );

    expect(ocorrencias).toHaveLength(3);
    expect(ocorrencias.at(-1)?.inicio.toISOString()).toBe('2026-01-07T14:00:00.000Z');
  });
});

describe('montarEvento', () => {
  it('formata datas como ISO e mantem nulos', () => {
    const montado = montarEvento(evento());

    expect(montado.startAt).toBe('2026-01-05T14:00:00.000Z');
    expect(montado.recurrenceUntil).toBeNull();
    expect(montado.reminderMinutesBefore).toBeNull();
  });
});
