'use client';

import type { ColunaDeTarefas, FiltrosDeTarefas, TarefaResumida } from '@sinapse/shared';
import { AlertTriangle, FolderPlus, LayoutGrid, ListChecks, Plus, Rows3 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { DialogoDeColunaDeTarefas } from '@/components/conteudos/dialogo-de-coluna-de-tarefas';
import { DialogoDeTarefa } from '@/components/conteudos/dialogo-de-tarefa';
import { Trilha } from '@/components/navegacao/trilha';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { Skeleton } from '@/components/ui/skeleton';
import { QuadroKanban } from '@/components/tarefas/quadro-kanban';
import { ApiError } from '@/lib/api';
import { atualizarTarefa, buscarQuadro, listarTarefas } from '@/lib/tarefas';
import { formatarPrazo, NOMES_DE_PRIORIDADE, TOM_DE_PRIORIDADE } from '@/lib/tarefas-formatacao';
import { cn } from '@/lib/utils';

type Visualizacao = 'quadro' | 'lista';

export default function PaginaDeTarefas() {
  const [visualizacao, setVisualizacao] = useState<Visualizacao>('quadro');
  const [colunas, setColunas] = useState<ColunaDeTarefas[] | null>(null);
  const [tarefasLista, setTarefasLista] = useState<TarefaResumida[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosDeTarefas>({});

  const [novaColuna, setNovaColuna] = useState(false);
  const [tarefaEmEdicao, setTarefaEmEdicao] = useState<
    { tarefaId: string; colunaId?: never } | { tarefaId?: never; colunaId: string } | null
  >(null);

  const carregarQuadro = useCallback(async () => {
    try {
      setErro(null);
      setColunas(await buscarQuadro());
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel carregar as tarefas.');
    }
  }, []);

  const carregarLista = useCallback(async () => {
    try {
      setErro(null);
      setTarefasLista(await listarTarefas(filtros));
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel carregar as tarefas.');
    }
  }, [filtros]);

  useEffect(() => {
    void carregarQuadro();
  }, [carregarQuadro]);

  useEffect(() => {
    if (visualizacao === 'lista') void carregarLista();
  }, [visualizacao, carregarLista]);

  async function recarregarTudo() {
    await Promise.all([
      carregarQuadro(),
      visualizacao === 'lista' ? carregarLista() : Promise.resolve(),
    ]);
  }

  async function alternarConcluida(tarefa: TarefaResumida) {
    try {
      await atualizarTarefa(tarefa.id, { completed: !tarefa.completedAt });
      await recarregarTudo();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel atualizar a tarefa.');
    }
  }

  const totalDeTarefas = colunas?.reduce((soma, coluna) => soma + coluna.tarefas.length, 0) ?? 0;
  const primeiraColunaId = colunas?.[0]?.id;

  return (
    <div className="space-y-6">
      <Trilha />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl tracking-tight">Tarefas</h1>
          <p className="text-sm text-[var(--texto-suave)]">
            {colunas === null
              ? 'Carregando...'
              : `${colunas.length} ${colunas.length === 1 ? 'coluna' : 'colunas'} e ${totalDeTarefas} ${totalDeTarefas === 1 ? 'tarefa' : 'tarefas'}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setVisualizacao('quadro')}
              aria-pressed={visualizacao === 'quadro'}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors',
                visualizacao === 'quadro'
                  ? 'bg-[var(--superficie-suave)] text-[var(--texto)]'
                  : 'text-[var(--texto-suave)]',
              )}
            >
              <LayoutGrid aria-hidden="true" className="size-3.5" />
              Quadro
            </button>
            <button
              type="button"
              onClick={() => setVisualizacao('lista')}
              aria-pressed={visualizacao === 'lista'}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors',
                visualizacao === 'lista'
                  ? 'bg-[var(--superficie-suave)] text-[var(--texto)]'
                  : 'text-[var(--texto-suave)]',
              )}
            >
              <Rows3 aria-hidden="true" className="size-3.5" />
              Lista
            </button>
          </div>

          <Button variante="secundario" onClick={() => setNovaColuna(true)}>
            <FolderPlus aria-hidden="true" className="size-4" />
            Nova coluna
          </Button>

          {primeiraColunaId ? (
            <Button onClick={() => setTarefaEmEdicao({ colunaId: primeiraColunaId })}>
              <Plus aria-hidden="true" className="size-4" />
              Nova tarefa
            </Button>
          ) : null}
        </div>
      </div>

      {erro ? <Alert tipo="erro">{erro}</Alert> : null}

      {visualizacao === 'lista' ? (
        <div className="flex flex-wrap gap-1.5">
          {(['low', 'medium', 'high', 'urgent'] as const).map((prioridade) => (
            <button
              key={prioridade}
              type="button"
              onClick={() =>
                setFiltros((atual) => ({
                  ...atual,
                  priority: atual.priority === prioridade ? undefined : prioridade,
                }))
              }
              className={cn(
                'text-2xs flex h-7 items-center rounded-full border px-2.5 font-medium transition-colors',
                filtros.priority === prioridade
                  ? 'border-[var(--destaque)] bg-[var(--destaque-suave)] text-[var(--destaque)]'
                  : 'border-[var(--borda)] text-[var(--texto-suave)]',
              )}
            >
              {NOMES_DE_PRIORIDADE[prioridade]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFiltros((atual) => ({ ...atual, atrasada: !atual.atrasada }))}
            className={cn(
              'text-2xs flex h-7 items-center rounded-full border px-2.5 font-medium transition-colors',
              filtros.atrasada
                ? 'border-[var(--destaque)] bg-[var(--destaque-suave)] text-[var(--destaque)]'
                : 'border-[var(--borda)] text-[var(--texto-suave)]',
            )}
          >
            Atrasadas
          </button>
          <button
            type="button"
            onClick={() => setFiltros((atual) => ({ ...atual, arquivadas: !atual.arquivadas }))}
            className={cn(
              'text-2xs flex h-7 items-center rounded-full border px-2.5 font-medium transition-colors',
              filtros.arquivadas
                ? 'border-[var(--destaque)] bg-[var(--destaque-suave)] text-[var(--destaque)]'
                : 'border-[var(--borda)] text-[var(--texto-suave)]',
            )}
          >
            Arquivadas
          </button>
        </div>
      ) : null}

      {colunas === null ? (
        <div className="flex gap-4">
          <Skeleton className="h-64 w-72" />
          <Skeleton className="h-64 w-72" />
        </div>
      ) : colunas.length === 0 ? (
        <Card>
          <EstadoVazio
            icone={<ListChecks className="size-5" />}
            titulo="Comece pela primeira coluna"
            descricao="Colunas organizam o quadro Kanban, como A fazer, Em andamento e Feito. Dentro delas voce cria as tarefas."
            acao={
              <Button tamanho="sm" onClick={() => setNovaColuna(true)}>
                <FolderPlus aria-hidden="true" className="size-4" />
                Criar coluna
              </Button>
            }
          />
        </Card>
      ) : visualizacao === 'quadro' ? (
        <QuadroKanban
          colunas={colunas}
          aoMudarColunas={setColunas}
          aoRecarregar={recarregarTudo}
          aoAbrirTarefa={(tarefaId) => setTarefaEmEdicao({ tarefaId })}
          aoNovaTarefa={(colunaId) => setTarefaEmEdicao({ colunaId })}
        />
      ) : tarefasLista === null ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : tarefasLista.length === 0 ? (
        <Card>
          <EstadoVazio
            icone={<ListChecks className="size-5" />}
            titulo="Nenhuma tarefa encontrada"
            descricao="Crie uma tarefa ou ajuste os filtros acima."
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {tarefasLista.map((tarefa) => {
            const coluna = colunas.find((item) => item.id === tarefa.columnId);
            const prazo = formatarPrazo(tarefa.dueDate, tarefa.completedAt);

            return (
              <li key={tarefa.id}>
                <Card className="flex flex-wrap items-center gap-3 p-4">
                  <Checkbox
                    marcado={Boolean(tarefa.completedAt)}
                    aoAlternar={() => void alternarConcluida(tarefa)}
                    rotulo={`Concluir ${tarefa.title}`}
                  />

                  <button
                    type="button"
                    onClick={() => setTarefaEmEdicao({ tarefaId: tarefa.id })}
                    className={cn(
                      'min-w-0 flex-1 cursor-pointer text-left text-sm',
                      tarefa.completedAt && 'text-[var(--texto-tenue)] line-through',
                    )}
                  >
                    {tarefa.title}
                  </button>

                  <Badge tom={TOM_DE_PRIORIDADE[tarefa.priority]}>
                    {NOMES_DE_PRIORIDADE[tarefa.priority]}
                  </Badge>

                  {coluna ? <Badge>{coluna.name}</Badge> : null}

                  {prazo ? (
                    <span
                      className={cn(
                        'flex items-center gap-1 text-xs',
                        prazo.atrasada ? 'text-perigo-500' : 'text-[var(--texto-suave)]',
                      )}
                    >
                      {prazo.atrasada ? (
                        <AlertTriangle aria-hidden="true" className="size-3.5" />
                      ) : null}
                      {prazo.texto}
                    </span>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <DialogoDeColunaDeTarefas
        aberto={novaColuna}
        aoFechar={() => setNovaColuna(false)}
        aoSalvar={recarregarTudo}
      />

      <DialogoDeTarefa
        aberto={tarefaEmEdicao !== null}
        aoFechar={() => setTarefaEmEdicao(null)}
        aoSalvar={recarregarTudo}
        tarefaId={tarefaEmEdicao?.tarefaId}
        colunaId={tarefaEmEdicao?.colunaId}
      />
    </div>
  );
}
