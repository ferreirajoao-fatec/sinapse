'use client';

import type { OcorrenciaDeEvento } from '@sinapse/shared';
import { isSameDay } from 'date-fns';
import { CalendarDays, MapPin, Repeat } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { corDeConteudo } from '@/lib/icones-de-conteudo';
import { formatarDataLonga, formatarIntervalo } from '@/lib/calendario-formatacao';

export function ListaDeAgenda({
  ocorrencias,
  aoClicarOcorrencia,
}: {
  ocorrencias: OcorrenciaDeEvento[];
  aoClicarOcorrencia: (eventId: string) => void;
}) {
  if (ocorrencias.length === 0) {
    return (
      <Card>
        <EstadoVazio
          icone={<CalendarDays className="size-5" />}
          titulo="Nada nos proximos dias"
          descricao="Crie um evento para ve-lo aparecer aqui."
        />
      </Card>
    );
  }

  const ordenadas = [...ocorrencias].sort(
    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
  );

  const grupos: { dia: Date; itens: OcorrenciaDeEvento[] }[] = [];
  for (const ocorrencia of ordenadas) {
    const dia = new Date(ocorrencia.inicio);
    const grupoAtual = grupos.at(-1);

    if (grupoAtual && isSameDay(grupoAtual.dia, dia)) {
      grupoAtual.itens.push(ocorrencia);
    } else {
      grupos.push({ dia, itens: [ocorrencia] });
    }
  }

  return (
    <div className="space-y-5">
      {grupos.map((grupo) => (
        <div key={grupo.dia.toISOString()} className="space-y-2">
          <h3 className="text-sm font-medium capitalize text-[var(--texto-suave)]">
            {formatarDataLonga(grupo.dia.toISOString())}
          </h3>

          <ul className="space-y-2">
            {grupo.itens.map((ocorrencia, indice) => (
              <li key={`${ocorrencia.eventId}-${indice}`}>
                <Card
                  role="button"
                  tabIndex={0}
                  onClick={() => aoClicarOcorrencia(ocorrencia.eventId)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter') aoClicarOcorrencia(ocorrencia.eventId);
                  }}
                  className="flex cursor-pointer items-center gap-3 p-4"
                >
                  <span
                    aria-hidden="true"
                    className={`size-2.5 shrink-0 rounded-full ${corDeConteudo(ocorrencia.color).ponto}`}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ocorrencia.title}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--texto-suave)]">
                      <span>
                        {formatarIntervalo(ocorrencia.inicio, ocorrencia.fim, ocorrencia.allDay)}
                      </span>
                      {ocorrencia.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin aria-hidden="true" className="size-3" />
                          {ocorrencia.location}
                        </span>
                      ) : null}
                      {ocorrencia.recorrente ? (
                        <span className="flex items-center gap-1">
                          <Repeat aria-hidden="true" className="size-3" />
                          Recorrente
                        </span>
                      ) : null}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
