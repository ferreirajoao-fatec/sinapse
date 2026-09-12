'use client';

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ColunaDeTarefas, TarefaResumida } from '@sinapse/shared';
import { AlertTriangle, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DialogoDeConfirmacao } from '@/components/conteudos/dialogo-de-confirmacao';
import { DialogoDeColunaDeTarefas } from '@/components/conteudos/dialogo-de-coluna-de-tarefas';
import { MenuSuspenso } from '@/components/conteudos/menu-suspenso';
import { Badge } from '@/components/ui/badge';
import { corDeConteudo } from '@/lib/icones-de-conteudo';
import { excluirColunaDeTarefas, moverTarefa, reordenarTarefas } from '@/lib/tarefas';
import { formatarPrazo, NOMES_DE_PRIORIDADE, TOM_DE_PRIORIDADE } from '@/lib/tarefas-formatacao';
import { cn } from '@/lib/utils';

/**
 * Quadro Kanban: colunas arrastaveis entre si, tarefas arrastaveis entre
 * colunas. Diferente da arvore de conteudos (uma lista vertical por vez),
 * aqui o alvo de um arrasto pode ser uma coluna inteira.
 */
export function QuadroKanban({
  colunas,
  aoMudarColunas,
  aoRecarregar,
  aoAbrirTarefa,
  aoNovaTarefa,
}: {
  colunas: ColunaDeTarefas[];
  aoMudarColunas: (colunas: ColunaDeTarefas[]) => void;
  aoRecarregar: () => Promise<void>;
  aoAbrirTarefa: (tarefaId: string) => void;
  aoNovaTarefa: (columnId: string) => void;
}) {
  const [idAtivo, setIdAtivo] = useState<string | null>(null);
  const [editandoColuna, setEditandoColuna] = useState<ColunaDeTarefas | null>(null);
  const [excluindoColuna, setExcluindoColuna] = useState<ColunaDeTarefas | null>(null);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function localizarColuna(id: string): ColunaDeTarefas | undefined {
    return colunas.find(
      (coluna) => coluna.id === id || coluna.tarefas.some((tarefa) => tarefa.id === id),
    );
  }

  function aoIniciarArrasto(evento: DragStartEvent) {
    setIdAtivo(String(evento.active.id));
  }

  function aoArrastarSobre(evento: DragOverEvent) {
    const { active, over } = evento;
    if (!over) return;

    const idAtiva = String(active.id);
    const idSobre = String(over.id);
    if (idAtiva === idSobre) return;

    const origem = localizarColuna(idAtiva);
    const destino = localizarColuna(idSobre);
    if (!origem || !destino || origem.id === destino.id) return;

    const tarefaMovida = origem.tarefas.find((tarefa) => tarefa.id === idAtiva);
    if (!tarefaMovida) return;

    aoMudarColunas(
      colunas.map((coluna) => {
        if (coluna.id === origem.id) {
          return { ...coluna, tarefas: coluna.tarefas.filter((tarefa) => tarefa.id !== idAtiva) };
        }

        if (coluna.id === destino.id) {
          const indiceSobre = coluna.tarefas.findIndex((tarefa) => tarefa.id === idSobre);
          const lista = [...coluna.tarefas];
          lista.splice(indiceSobre === -1 ? lista.length : indiceSobre, 0, {
            ...tarefaMovida,
            columnId: coluna.id,
          });
          return { ...coluna, tarefas: lista };
        }

        return coluna;
      }),
    );
  }

  async function aoSoltar(evento: DragEndEvent) {
    setIdAtivo(null);
    const { active, over } = evento;
    if (!over) return;

    const idAtiva = String(active.id);
    const idSobre = String(over.id);

    const colunaFinal = localizarColuna(idSobre);
    if (!colunaFinal) return;

    const indiceAtual = colunaFinal.tarefas.findIndex((tarefa) => tarefa.id === idAtiva);
    const indiceAlvo = colunaFinal.tarefas.findIndex((tarefa) => tarefa.id === idSobre);

    let tarefasFinais = colunaFinal.tarefas;

    if (indiceAtual !== -1 && indiceAlvo !== -1 && indiceAtual !== indiceAlvo) {
      tarefasFinais = arrayMove(colunaFinal.tarefas, indiceAtual, indiceAlvo);
      aoMudarColunas(
        colunas.map((coluna) =>
          coluna.id === colunaFinal.id ? { ...coluna, tarefas: tarefasFinais } : coluna,
        ),
      );
    }

    const posicaoFinal = tarefasFinais.findIndex((tarefa) => tarefa.id === idAtiva);

    try {
      await moverTarefa(idAtiva, { columnId: colunaFinal.id, position: Math.max(posicaoFinal, 0) });
      await reordenarTarefas(
        tarefasFinais.map((tarefa, indice) => ({ id: tarefa.id, position: indice })),
      );
    } catch {
      await aoRecarregar();
    }
  }

  const tarefaArrastada = idAtivo
    ? colunas.flatMap((coluna) => coluna.tarefas).find((tarefa) => tarefa.id === idAtivo)
    : null;

  return (
    <>
      <DndContext
        sensors={sensores}
        collisionDetection={closestCorners}
        onDragStart={aoIniciarArrasto}
        onDragOver={aoArrastarSobre}
        onDragEnd={(evento) => void aoSoltar(evento)}
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {colunas.map((coluna) => (
            <ColunaKanban
              key={coluna.id}
              coluna={coluna}
              aoAbrirTarefa={aoAbrirTarefa}
              aoNovaTarefa={aoNovaTarefa}
              aoEditar={() => setEditandoColuna(coluna)}
              aoExcluir={() => setExcluindoColuna(coluna)}
            />
          ))}
        </div>

        <DragOverlay>
          {tarefaArrastada ? <CartaoDeTarefa tarefa={tarefaArrastada} arrastando /> : null}
        </DragOverlay>
      </DndContext>

      <DialogoDeColunaDeTarefas
        aberto={editandoColuna !== null}
        aoFechar={() => setEditandoColuna(null)}
        aoSalvar={aoRecarregar}
        coluna={editandoColuna ?? undefined}
      />

      <DialogoDeConfirmacao
        aberto={excluindoColuna !== null}
        aoFechar={() => setExcluindoColuna(null)}
        titulo={`Mover "${excluindoColuna?.name}" para a lixeira?`}
        descricao="As tarefas desta coluna vao junto."
        aviso={
          excluindoColuna && excluindoColuna.tarefas.length > 0
            ? `${excluindoColuna.tarefas.length} tarefa${excluindoColuna.tarefas.length > 1 ? 's' : ''} sera movida junto.`
            : undefined
        }
        rotuloDeConfirmacao="Mover para a lixeira"
        aoConfirmar={async () => {
          if (!excluindoColuna) return;
          await excluirColunaDeTarefas(excluindoColuna.id);
          await aoRecarregar();
        }}
      />
    </>
  );
}

function ColunaKanban({
  coluna,
  aoAbrirTarefa,
  aoNovaTarefa,
  aoEditar,
  aoExcluir,
}: {
  coluna: ColunaDeTarefas;
  aoAbrirTarefa: (tarefaId: string) => void;
  aoNovaTarefa: (columnId: string) => void;
  aoEditar: () => void;
  aoExcluir: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: coluna.id });
  const cor = corDeConteudo(coluna.color);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-[var(--superficie-suave)]">
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <span className={cn('size-2 shrink-0 rounded-full', cor.ponto)} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{coluna.name}</span>
        <Badge>{coluna.tarefas.length}</Badge>

        <MenuSuspenso
          rotulo={`Acoes da coluna ${coluna.name}`}
          gatilho={() => (
            <span className="flex size-6 items-center justify-center rounded-sm text-[var(--texto-tenue)] hover:text-[var(--texto)]">
              <MoreHorizontal aria-hidden="true" className="size-3.5" />
            </span>
          )}
          acoes={[
            { id: 'editar', rotulo: 'Editar coluna', Icone: Pencil, aoEscolher: aoEditar },
            {
              id: 'excluir',
              rotulo: 'Mover para a lixeira',
              Icone: Trash2,
              perigosa: true,
              separadorAntes: true,
              aoEscolher: aoExcluir,
            },
          ]}
        />
      </div>

      <div ref={setNodeRef} className="flex-1 space-y-2 px-2 pb-2">
        <SortableContext
          items={coluna.tarefas.map((tarefa) => tarefa.id)}
          strategy={verticalListSortingStrategy}
        >
          {coluna.tarefas.map((tarefa) => (
            <CartaoOrdenavel
              key={tarefa.id}
              tarefa={tarefa}
              aoAbrir={() => aoAbrirTarefa(tarefa.id)}
            />
          ))}
        </SortableContext>

        <button
          type="button"
          onClick={() => aoNovaTarefa(coluna.id)}
          className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs text-[var(--texto-tenue)] transition-colors hover:bg-[var(--superficie)] hover:text-[var(--texto)]"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Nova tarefa
        </button>
      </div>
    </div>
  );
}

function CartaoOrdenavel({ tarefa, aoAbrir }: { tarefa: TarefaResumida; aoAbrir: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tarefa.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-40')}
    >
      <CartaoDeTarefa
        tarefa={tarefa}
        aoAbrir={aoAbrir}
        atributos={attributes}
        ouvintes={listeners}
      />
    </div>
  );
}

type Atributos = ReturnType<typeof useSortable>['attributes'];
type Ouvintes = ReturnType<typeof useSortable>['listeners'];

function CartaoDeTarefa({
  tarefa,
  aoAbrir,
  atributos,
  ouvintes,
  arrastando = false,
}: {
  tarefa: TarefaResumida;
  aoAbrir?: () => void;
  atributos?: Atributos;
  ouvintes?: Ouvintes;
  arrastando?: boolean;
}) {
  const prazo = formatarPrazo(tarefa.dueDate, tarefa.completedAt);

  return (
    <div
      className={cn(
        'superficie shadow-suave group flex flex-col gap-2 rounded-md p-2.5',
        arrastando && 'shadow-elevada rotate-2',
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          {...atributos}
          {...ouvintes}
          aria-label={`Reordenar a tarefa ${tarefa.title}`}
          className="mt-0.5 flex size-4 shrink-0 cursor-grab items-center justify-center text-[var(--texto-tenue)] opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100"
        >
          <GripVertical aria-hidden="true" className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={aoAbrir}
          className={cn(
            'min-w-0 flex-1 cursor-pointer text-left text-sm',
            tarefa.completedAt && 'text-[var(--texto-tenue)] line-through',
          )}
        >
          {tarefa.title}
        </button>
      </div>

      <div className="pl-5.5 flex flex-wrap items-center gap-1.5">
        <Badge tom={TOM_DE_PRIORIDADE[tarefa.priority]}>
          {NOMES_DE_PRIORIDADE[tarefa.priority]}
        </Badge>

        {prazo ? (
          <span
            className={cn(
              'text-2xs flex items-center gap-1',
              prazo.atrasada ? 'text-perigo-500' : 'text-[var(--texto-tenue)]',
            )}
          >
            {prazo.atrasada ? <AlertTriangle aria-hidden="true" className="size-3" /> : null}
            {prazo.texto}
          </span>
        ) : null}

        {tarefa.totalDeChecklist > 0 ? (
          <span className="text-2xs text-[var(--texto-tenue)]">
            {tarefa.checklistConcluidos}/{tarefa.totalDeChecklist}
          </span>
        ) : null}

        {tarefa.totalDeAnexos > 0 ? (
          <span className="text-2xs text-[var(--texto-tenue)]">
            {tarefa.totalDeAnexos} anexo(s)
          </span>
        ) : null}
      </div>
    </div>
  );
}
