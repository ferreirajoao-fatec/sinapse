'use client';

import type { OcorrenciaDeEvento } from '@sinapse/shared';
import { addDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { LayoutGrid, Plus, Rows3 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DialogoDeEvento } from '@/components/conteudos/dialogo-de-evento';
import { GradeMensal } from '@/components/calendario/grade-mensal';
import { ListaDeAgenda } from '@/components/calendario/lista-de-agenda';
import { Trilha } from '@/components/navegacao/trilha';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { listarOcorrencias } from '@/lib/calendario';
import { cn } from '@/lib/utils';

type Visualizacao = 'mes' | 'agenda';

export default function PaginaDeCalendario() {
  const [visualizacao, setVisualizacao] = useState<Visualizacao>('mes');
  const [mesAtual, setMesAtual] = useState(() => startOfMonth(new Date()));
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaDeEvento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [eventoEmEdicao, setEventoEmEdicao] = useState<
    { eventoId: string } | { dataInicial?: string } | null
  >(null);

  const intervalo = useMemo(() => {
    if (visualizacao === 'mes') {
      return {
        from: startOfWeek(startOfMonth(mesAtual), { weekStartsOn: 0 }),
        to: endOfWeek(endOfMonth(mesAtual), { weekStartsOn: 0 }),
      };
    }

    const hoje = new Date();
    return { from: hoje, to: addDays(hoje, 30) };
  }, [visualizacao, mesAtual]);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setOcorrencias(await listarOcorrencias(intervalo.from, intervalo.to));
    } catch (falha) {
      setErro(
        falha instanceof ApiError ? falha.message : 'Nao foi possivel carregar o calendario.',
      );
    }
  }, [intervalo]);

  useEffect(() => {
    setOcorrencias(null);
    void carregar();
  }, [carregar]);

  return (
    <div className="space-y-6">
      <Trilha />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl tracking-tight">Calendario</h1>
          <p className="text-sm text-[var(--texto-suave)]">
            Aulas, provas, entregas e compromissos em um so lugar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setVisualizacao('mes')}
              aria-pressed={visualizacao === 'mes'}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors',
                visualizacao === 'mes'
                  ? 'bg-[var(--superficie-suave)] text-[var(--texto)]'
                  : 'text-[var(--texto-suave)]',
              )}
            >
              <LayoutGrid aria-hidden="true" className="size-3.5" />
              Mes
            </button>
            <button
              type="button"
              onClick={() => setVisualizacao('agenda')}
              aria-pressed={visualizacao === 'agenda'}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors',
                visualizacao === 'agenda'
                  ? 'bg-[var(--superficie-suave)] text-[var(--texto)]'
                  : 'text-[var(--texto-suave)]',
              )}
            >
              <Rows3 aria-hidden="true" className="size-3.5" />
              Agenda
            </button>
          </div>

          <Button onClick={() => setEventoEmEdicao({})}>
            <Plus aria-hidden="true" className="size-4" />
            Novo evento
          </Button>
        </div>
      </div>

      {erro ? <Alert tipo="erro">{erro}</Alert> : null}

      {ocorrencias === null ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : visualizacao === 'mes' ? (
        <GradeMensal
          mes={mesAtual}
          aoMudarMes={setMesAtual}
          ocorrencias={ocorrencias}
          aoClicarOcorrencia={(eventId) => setEventoEmEdicao({ eventoId: eventId })}
          aoClicarDia={(dataIso) => setEventoEmEdicao({ dataInicial: dataIso })}
        />
      ) : (
        <ListaDeAgenda
          ocorrencias={ocorrencias}
          aoClicarOcorrencia={(eventId) => setEventoEmEdicao({ eventoId: eventId })}
        />
      )}

      <DialogoDeEvento
        aberto={eventoEmEdicao !== null}
        aoFechar={() => setEventoEmEdicao(null)}
        aoSalvar={carregar}
        eventoId={
          eventoEmEdicao && 'eventoId' in eventoEmEdicao ? eventoEmEdicao.eventoId : undefined
        }
        dataInicial={
          eventoEmEdicao && 'dataInicial' in eventoEmEdicao ? eventoEmEdicao.dataInicial : undefined
        }
      />
    </div>
  );
}
