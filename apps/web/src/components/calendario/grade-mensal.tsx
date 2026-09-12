'use client';

import type { OcorrenciaDeEvento } from '@sinapse/shared';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { corDeConteudo } from '@/lib/icones-de-conteudo';
import { cn } from '@/lib/utils';

const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const MAX_CHIPS_POR_DIA = 3;

export function GradeMensal({
  mes,
  aoMudarMes,
  ocorrencias,
  aoClicarOcorrencia,
  aoClicarDia,
}: {
  mes: Date;
  aoMudarMes: (novoMes: Date) => void;
  ocorrencias: OcorrenciaDeEvento[];
  aoClicarOcorrencia: (eventId: string) => void;
  aoClicarDia: (dataIso: string) => void;
}) {
  const inicioDaGrade = startOfWeek(startOfMonth(mes), { weekStartsOn: 0 });
  const fimDaGrade = endOfWeek(endOfMonth(mes), { weekStartsOn: 0 });
  const dias = eachDayOfInterval({ start: inicioDaGrade, end: fimDaGrade });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium capitalize">
          {format(mes, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => aoMudarMes(addMonths(mes, -1))}
            aria-label="Mes anterior"
            className="flex size-8 cursor-pointer items-center justify-center rounded-md text-[var(--texto-suave)] transition-colors hover:bg-[var(--superficie-suave)]"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => aoMudarMes(startOfMonth(new Date()))}
            className="h-8 cursor-pointer rounded-md px-2.5 text-xs font-medium text-[var(--texto-suave)] transition-colors hover:bg-[var(--superficie-suave)]"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => aoMudarMes(addMonths(mes, 1))}
            aria-label="Proximo mes"
            className="flex size-8 cursor-pointer items-center justify-center rounded-md text-[var(--texto-suave)] transition-colors hover:bg-[var(--superficie-suave)]"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-md border">
        {DIAS_DA_SEMANA.map((dia) => (
          <div
            key={dia}
            className="text-2xs border-b bg-[var(--superficie-suave)] py-1.5 text-center font-medium text-[var(--texto-suave)]"
          >
            {dia}
          </div>
        ))}

        {dias.map((dia) => {
          const doDia = ocorrencias
            .filter((ocorrencia) => isSameDay(new Date(ocorrencia.inicio), dia))
            .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
          const visiveis = doDia.slice(0, MAX_CHIPS_POR_DIA);
          const escondidos = doDia.length - visiveis.length;

          return (
            <button
              key={dia.toISOString()}
              type="button"
              onClick={() => aoClicarDia(dia.toISOString())}
              className={cn(
                'min-h-24 cursor-pointer space-y-1 border-b border-r p-1.5 text-left last:border-r-0 [&:nth-child(7n)]:border-r-0',
                'transition-colors hover:bg-[var(--superficie-suave)]',
                !isSameMonth(dia, mes) && 'bg-[var(--superficie)]/40',
              )}
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs',
                  isToday(dia)
                    ? 'bg-[var(--destaque)] font-medium text-white'
                    : !isSameMonth(dia, mes)
                      ? 'text-[var(--texto-tenue)]'
                      : 'text-[var(--texto)]',
                )}
              >
                {format(dia, 'd')}
              </span>

              <div className="space-y-0.5">
                {visiveis.map((ocorrencia, indice) => (
                  <span
                    key={`${ocorrencia.eventId}-${indice}`}
                    role="link"
                    onClick={(evento) => {
                      evento.stopPropagation();
                      aoClicarOcorrencia(ocorrencia.eventId);
                    }}
                    className={cn(
                      'text-2xs block truncate rounded px-1.5 py-0.5 font-medium',
                      corDeConteudo(ocorrencia.color).fundo,
                      corDeConteudo(ocorrencia.color).texto,
                    )}
                  >
                    {ocorrencia.title}
                  </span>
                ))}
                {escondidos > 0 ? (
                  <span className="text-2xs block px-1.5 text-[var(--texto-tenue)]">
                    +{escondidos} mais
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
