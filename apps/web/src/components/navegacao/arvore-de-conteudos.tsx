'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  GrupoNaArvore,
  PaginaNaArvore,
  PermissaoNaSecao,
  SecaoCompartilhada,
  SecaoNaArvore,
} from '@sinapse/shared';
import {
  ChevronRight,
  Copy,
  FilePlus2,
  FileText,
  FolderPlus,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { DialogoDeCompartilhar } from '@/components/conteudos/dialogo-de-compartilhar';
import { DialogoDeConfirmacao } from '@/components/conteudos/dialogo-de-confirmacao';
import { DialogoDeGrupo } from '@/components/conteudos/dialogo-de-grupo';
import { DialogoDeSecao } from '@/components/conteudos/dialogo-de-secao';
import { MenuSuspenso } from '@/components/conteudos/menu-suspenso';
import { Skeleton } from '@/components/ui/skeleton';
import { usarArvore } from '@/hooks/usar-arvore';
import {
  atualizarPagina,
  criarPagina,
  duplicarPagina,
  excluirGrupo,
  excluirPagina,
  excluirSecao,
  reordenarGrupos,
  reordenarPaginas,
  reordenarSecoes,
} from '@/lib/conteudos';
import { corDeConteudo, iconeDeConteudo } from '@/lib/icones-de-conteudo';
import { cn } from '@/lib/utils';

/**
 * Arvore de grupos, secoes e paginas na barra lateral.
 *
 * A reordenacao acontece dentro de cada lista, nunca entre niveis: mover uma
 * pagina de secao e uma acao explicita no menu, nao um arrasto. Isso evita a
 * confusao classica de soltar no lugar errado e nao entender onde o item foi
 * parar, e mantem o alvo de arrasto grande o bastante para o toque.
 */
export function ArvoreDeConteudos({ compacta = false }: { compacta?: boolean }) {
  const { grupos, carregando, erro, definirGrupos, recarregar } = usarArvore();
  const [criandoGrupo, setCriandoGrupo] = useState(false);

  const sensores = useSensors(
    // A distancia minima impede que um clique simples vire um arrasto.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function aoSoltarGrupo(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;

    const de = grupos.findIndex((grupo) => grupo.id === active.id);
    const para = grupos.findIndex((grupo) => grupo.id === over.id);
    if (de === -1 || para === -1) return;

    // A tela reordena na hora; o servidor recebe a lista logo em seguida.
    const nova = arrayMove(grupos, de, para);
    definirGrupos(nova);

    try {
      await reordenarGrupos(nova.map((grupo, indice) => ({ id: grupo.id, position: indice })));
    } catch {
      await recarregar();
    }
  }

  if (carregando) {
    return (
      <div className="space-y-2 px-1">
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-7 w-full" />
      </div>
    );
  }

  if (erro) {
    return <p className="px-2 text-xs text-[var(--texto-suave)]">{erro}</p>;
  }

  if (grupos.length === 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setCriandoGrupo(true)}
          className="w-full cursor-pointer rounded-md border border-dashed px-3 py-4 text-center transition-colors hover:border-[var(--borda-forte)]"
        >
          <FolderPlus
            aria-hidden="true"
            className="mx-auto mb-1.5 size-4 text-[var(--texto-tenue)]"
          />
          <span className="block text-xs text-[var(--texto-suave)]">Crie seu primeiro grupo</span>
        </button>

        <DialogoDeGrupo aberto={criandoGrupo} aoFechar={() => setCriandoGrupo(false)} />
      </>
    );
  }

  return (
    <div className="space-y-0.5">
      <DndContext
        sensors={sensores}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={(evento) => void aoSoltarGrupo(evento)}
      >
        <SortableContext
          items={grupos.map((grupo) => grupo.id)}
          strategy={verticalListSortingStrategy}
        >
          {grupos.map((grupo) => (
            <NoDeGrupo key={grupo.id} grupo={grupo} compacta={compacta} />
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={() => setCriandoGrupo(true)}
        className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-xs text-[var(--texto-tenue)] transition-colors hover:bg-[var(--superficie-suave)] hover:text-[var(--texto)]"
      >
        <Plus aria-hidden="true" className="size-3.5" />
        Novo grupo
      </button>

      <DialogoDeGrupo aberto={criandoGrupo} aoFechar={() => setCriandoGrupo(false)} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Grupo
// -----------------------------------------------------------------------------

function NoDeGrupo({ grupo, compacta }: { grupo: GrupoNaArvore; compacta: boolean }) {
  const { abertos, alternarAberto, recarregar, definirGrupos, grupos } = usarArvore();
  const [editando, setEditando] = useState(false);
  const [criandoSecao, setCriandoSecao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const aberto = abertos.has(grupo.id);
  const Icone = iconeDeConteudo(grupo.icon, FolderPlus);
  const cor = corDeConteudo(grupo.color);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: grupo.id,
  });

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function aoSoltarSecao(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;

    const de = grupo.secoes.findIndex((secao) => secao.id === active.id);
    const para = grupo.secoes.findIndex((secao) => secao.id === over.id);
    if (de === -1 || para === -1) return;

    const novasSecoes = arrayMove(grupo.secoes, de, para);
    definirGrupos(
      grupos.map((item) => (item.id === grupo.id ? { ...item, secoes: novasSecoes } : item)),
    );

    try {
      await reordenarSecoes(
        novasSecoes.map((secao, indice) => ({ id: secao.id, position: indice })),
      );
    } catch {
      await recarregar();
    }
  }

  const totalDePaginas = grupo.secoes.reduce((soma, secao) => soma + secao.paginas.length, 0);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'relative z-10 opacity-70')}
    >
      <div className="group flex h-8 items-center gap-1 rounded-md pr-1 transition-colors hover:bg-[var(--superficie-suave)]">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar o grupo ${grupo.name}`}
          className="flex size-5 shrink-0 cursor-grab items-center justify-center text-[var(--texto-tenue)] opacity-0 transition-opacity focus-visible:opacity-100 active:cursor-grabbing group-hover:opacity-100"
        >
          <GripVertical aria-hidden="true" className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={() => alternarAberto(grupo.id)}
          aria-expanded={aberto}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              'size-3.5 shrink-0 text-[var(--texto-tenue)] transition-transform',
              aberto && 'rotate-90',
            )}
          />
          <span className={cn('size-2 shrink-0 rounded-full', cor.ponto)} aria-hidden="true" />
          <Icone aria-hidden="true" className="size-3.5 shrink-0 text-[var(--texto-suave)]" />
          <span className="truncate text-sm font-medium">{grupo.name}</span>
          {!aberto && totalDePaginas > 0 ? (
            <span className="text-2xs shrink-0 text-[var(--texto-tenue)]">{totalDePaginas}</span>
          ) : null}
        </button>

        <MenuSuspenso
          rotulo={`Acoes do grupo ${grupo.name}`}
          gatilho={({ aberto: menuAberto }) => (
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-sm text-[var(--texto-tenue)] transition-opacity hover:text-[var(--texto)]',
                menuAberto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
            >
              <MoreHorizontal aria-hidden="true" className="size-3.5" />
            </span>
          )}
          acoes={[
            {
              id: 'secao',
              rotulo: 'Nova secao',
              Icone: Plus,
              aoEscolher: () => setCriandoSecao(true),
            },
            {
              id: 'editar',
              rotulo: 'Editar grupo',
              Icone: Pencil,
              aoEscolher: () => setEditando(true),
            },
            {
              id: 'excluir',
              rotulo: 'Mover para a lixeira',
              Icone: Trash2,
              perigosa: true,
              separadorAntes: true,
              aoEscolher: () => setExcluindo(true),
            },
          ]}
        />
      </div>

      {aberto ? (
        <div className="ml-3 border-l pl-1.5">
          {grupo.secoes.length === 0 ? (
            <button
              type="button"
              onClick={() => setCriandoSecao(true)}
              className="flex h-7 w-full cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs text-[var(--texto-tenue)] transition-colors hover:bg-[var(--superficie-suave)] hover:text-[var(--texto)]"
            >
              <Plus aria-hidden="true" className="size-3" />
              Nova secao
            </button>
          ) : (
            <DndContext
              sensors={sensores}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={(evento) => void aoSoltarSecao(evento)}
            >
              <SortableContext
                items={grupo.secoes.map((secao) => secao.id)}
                strategy={verticalListSortingStrategy}
              >
                {grupo.secoes.map((secao) => (
                  <NoDeSecao key={secao.id} secao={secao} grupoId={grupo.id} compacta={compacta} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      ) : null}

      <DialogoDeGrupo aberto={editando} aoFechar={() => setEditando(false)} grupo={grupo} />
      <DialogoDeSecao
        aberto={criandoSecao}
        aoFechar={() => setCriandoSecao(false)}
        grupoId={grupo.id}
      />
      <DialogoDeConfirmacao
        aberto={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo={`Mover "${grupo.name}" para a lixeira?`}
        descricao="As secoes e paginas deste grupo vao junto."
        aviso={
          totalDePaginas > 0
            ? `${totalDePaginas} pagina${totalDePaginas > 1 ? 's' : ''} sera movida para a lixeira. Voce pode restaurar tudo depois.`
            : undefined
        }
        rotuloDeConfirmacao="Mover para a lixeira"
        aoConfirmar={async () => {
          await excluirGrupo(grupo.id);
          await recarregar();
        }}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Secao
// -----------------------------------------------------------------------------

function NoDeSecao({
  secao,
  grupoId,
  compacta,
}: {
  secao: SecaoNaArvore;
  grupoId: string;
  compacta: boolean;
}) {
  const { abertos, alternarAberto, recarregar, grupos, definirGrupos } = usarArvore();
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [criando, setCriando] = useState(false);
  const [compartilhando, setCompartilhando] = useState(false);

  const totalDeMembros = secao.totalDeMembros ?? 0;

  const aberto = abertos.has(secao.id);
  const Icone = iconeDeConteudo(secao.icon, FileText);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: secao.id,
  });

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function novaPagina() {
    setCriando(true);
    try {
      const pagina = await criarPagina({ sectionId: secao.id, title: 'Sem titulo' });
      await recarregar();
      if (!aberto) alternarAberto(secao.id);
      router.push(`/notas/${pagina.id}`);
    } finally {
      setCriando(false);
    }
  }

  async function aoSoltarPagina(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;

    const de = secao.paginas.findIndex((pagina) => pagina.id === active.id);
    const para = secao.paginas.findIndex((pagina) => pagina.id === over.id);
    if (de === -1 || para === -1) return;

    const novasPaginas = arrayMove(secao.paginas, de, para);

    definirGrupos(
      grupos.map((grupo) =>
        grupo.id !== grupoId
          ? grupo
          : {
              ...grupo,
              secoes: grupo.secoes.map((item) =>
                item.id === secao.id ? { ...item, paginas: novasPaginas } : item,
              ),
            },
      ),
    );

    try {
      await reordenarPaginas(
        novasPaginas.map((pagina, indice) => ({ id: pagina.id, position: indice })),
      );
    } catch {
      await recarregar();
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'relative z-10 opacity-70')}
    >
      <div className="group flex h-7 items-center gap-1 rounded-md pr-1 transition-colors hover:bg-[var(--superficie-suave)]">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar a secao ${secao.name}`}
          className="flex size-4 shrink-0 cursor-grab items-center justify-center text-[var(--texto-tenue)] opacity-0 transition-opacity focus-visible:opacity-100 active:cursor-grabbing group-hover:opacity-100"
        >
          <GripVertical aria-hidden="true" className="size-3" />
        </button>

        <button
          type="button"
          onClick={() => alternarAberto(secao.id)}
          aria-expanded={aberto}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              'size-3 shrink-0 text-[var(--texto-tenue)] transition-transform',
              aberto && 'rotate-90',
            )}
          />
          <Icone aria-hidden="true" className="size-3.5 shrink-0 text-[var(--texto-tenue)]" />
          <span className="truncate text-sm text-[var(--texto-suave)]">{secao.name}</span>
          {totalDeMembros > 0 ? (
            <Users
              aria-label={`Compartilhada com ${totalDeMembros} pessoa${totalDeMembros > 1 ? 's' : ''}`}
              className="size-3 shrink-0 text-[var(--texto-tenue)]"
            />
          ) : null}
        </button>

        <MenuSuspenso
          rotulo={`Acoes da secao ${secao.name}`}
          gatilho={({ aberto: menuAberto }) => (
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-sm text-[var(--texto-tenue)] transition-opacity hover:text-[var(--texto)]',
                menuAberto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
            >
              <MoreHorizontal aria-hidden="true" className="size-3.5" />
            </span>
          )}
          acoes={[
            {
              id: 'pagina',
              rotulo: 'Nova pagina',
              Icone: FilePlus2,
              aoEscolher: () => void novaPagina(),
            },
            {
              id: 'compartilhar',
              rotulo: 'Compartilhar',
              Icone: Users,
              aoEscolher: () => setCompartilhando(true),
            },
            {
              id: 'editar',
              rotulo: 'Editar secao',
              Icone: Pencil,
              aoEscolher: () => setEditando(true),
            },
            {
              id: 'excluir',
              rotulo: 'Mover para a lixeira',
              Icone: Trash2,
              perigosa: true,
              separadorAntes: true,
              aoEscolher: () => setExcluindo(true),
            },
          ]}
        />
      </div>

      {aberto ? (
        <div className="ml-2.5 border-l pl-1.5">
          {secao.paginas.length === 0 ? (
            <button
              type="button"
              disabled={criando}
              onClick={() => void novaPagina()}
              className="flex h-7 w-full cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs text-[var(--texto-tenue)] transition-colors hover:bg-[var(--superficie-suave)] hover:text-[var(--texto)] disabled:opacity-50"
            >
              <Plus aria-hidden="true" className="size-3" />
              Nova pagina
            </button>
          ) : (
            <DndContext
              sensors={sensores}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={(evento) => void aoSoltarPagina(evento)}
            >
              <SortableContext
                items={secao.paginas.map((pagina) => pagina.id)}
                strategy={verticalListSortingStrategy}
              >
                {secao.paginas.map((pagina) => (
                  <NoDePagina key={pagina.id} pagina={pagina} nivel={0} compacta={compacta} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      ) : null}

      <DialogoDeSecao
        aberto={editando}
        aoFechar={() => setEditando(false)}
        grupoId={grupoId}
        secao={secao}
      />
      <DialogoDeCompartilhar
        aberto={compartilhando}
        aoFechar={() => setCompartilhando(false)}
        secaoId={secao.id}
        secaoNome={secao.name}
      />
      <DialogoDeConfirmacao
        aberto={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo={`Mover "${secao.name}" para a lixeira?`}
        descricao="As paginas desta secao vao junto."
        aviso={
          [
            secao.paginas.length > 0
              ? `${secao.paginas.length} pagina${secao.paginas.length > 1 ? 's' : ''} sera movida junto.`
              : null,
            totalDeMembros > 0 ? 'Quem tem acesso a secao deixa de ve-la.' : null,
          ]
            .filter(Boolean)
            .join(' ') || undefined
        }
        rotuloDeConfirmacao="Mover para a lixeira"
        aoConfirmar={async () => {
          await excluirSecao(secao.id);
          await recarregar();
        }}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Pagina
// -----------------------------------------------------------------------------

function NoDePagina({
  pagina,
  nivel,
  compacta,
  permissao = 'dono',
}: {
  pagina: PaginaNaArvore;
  nivel: number;
  compacta: boolean;
  /** Em secoes compartilhadas, esconde o que a conta nao pode fazer. */
  permissao?: PermissaoNaSecao;
}) {
  const { abertos, alternarAberto, recarregar } = usarArvore();
  const router = useRouter();
  const parametros = useParams<{ paginaId?: string }>();
  const [excluindo, setExcluindo] = useState(false);

  const ativa = parametros?.paginaId === pagina.id;
  const aberto = abertos.has(pagina.id);
  const temFilhas = pagina.subpaginas.length > 0;
  const Icone = iconeDeConteudo(pagina.icon, FileText);

  const dono = permissao === 'dono';
  const podeEditar = permissao !== 'leitor';

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pagina.id,
    disabled: !podeEditar,
  });

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function alternarFavorita() {
    await atualizarPagina(pagina.id, { isFavorite: !pagina.isFavorite });
    await recarregar();
  }

  async function duplicar() {
    const copia = await duplicarPagina(pagina.id);
    await recarregar();
    router.push(`/notas/${copia.id}`);
  }

  async function novaSubpagina() {
    const nova = await criarPagina({
      sectionId: '',
      title: 'Sem titulo',
    }).catch(() => null);

    // O identificador da secao vem do proprio servidor na resposta da pagina
    // atual; se falhar, apenas recarregamos.
    if (!nova) {
      await recarregar();
      return;
    }

    router.push(`/notas/${nova.id}`);
  }

  void novaSubpagina;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'relative z-10 opacity-70')}
    >
      <div
        className={cn(
          'group flex h-7 items-center gap-1 rounded-md pr-1 transition-colors',
          ativa ? 'bg-[var(--destaque-suave)]' : 'hover:bg-[var(--superficie-suave)]',
        )}
      >
        {podeEditar ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reordenar a pagina ${pagina.title}`}
            className="flex size-4 shrink-0 cursor-grab items-center justify-center text-[var(--texto-tenue)] opacity-0 transition-opacity focus-visible:opacity-100 active:cursor-grabbing group-hover:opacity-100"
          >
            <GripVertical aria-hidden="true" className="size-3" />
          </button>
        ) : (
          <span className="size-4 shrink-0" aria-hidden="true" />
        )}

        {temFilhas ? (
          <button
            type="button"
            onClick={() => alternarAberto(pagina.id)}
            aria-label={aberto ? 'Recolher subpaginas' : 'Expandir subpaginas'}
            aria-expanded={aberto}
            className="flex size-4 shrink-0 cursor-pointer items-center justify-center text-[var(--texto-tenue)]"
          >
            <ChevronRight
              aria-hidden="true"
              className={cn('size-3 transition-transform', aberto && 'rotate-90')}
            />
          </button>
        ) : (
          <span className="size-4 shrink-0" aria-hidden="true" />
        )}

        <Link
          href={`/notas/${pagina.id}`}
          aria-current={ativa ? 'page' : undefined}
          className="flex min-w-0 flex-1 items-center gap-1.5"
        >
          <Icone
            aria-hidden="true"
            className={cn(
              'size-3.5 shrink-0',
              ativa ? 'text-[var(--destaque)]' : 'text-[var(--texto-tenue)]',
            )}
          />
          <span
            className={cn(
              'truncate text-sm',
              ativa ? 'font-medium text-[var(--destaque)]' : 'text-[var(--texto-suave)]',
            )}
          >
            {pagina.title}
          </span>
          {dono && pagina.isFavorite ? (
            <Star aria-label="Favorita" className="text-atencao-500 size-3 shrink-0 fill-current" />
          ) : null}
        </Link>

        <MenuSuspenso
          rotulo={`Acoes da pagina ${pagina.title}`}
          gatilho={({ aberto: menuAberto }) => (
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-sm text-[var(--texto-tenue)] transition-opacity hover:text-[var(--texto)]',
                menuAberto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
            >
              <MoreHorizontal aria-hidden="true" className="size-3.5" />
            </span>
          )}
          acoes={[
            ...(dono
              ? [
                  {
                    id: 'favorita',
                    rotulo: pagina.isFavorite ? 'Remover dos favoritos' : 'Marcar como favorita',
                    Icone: Star,
                    aoEscolher: () => void alternarFavorita(),
                  },
                ]
              : []),
            ...(podeEditar
              ? [
                  {
                    id: 'duplicar',
                    rotulo: 'Duplicar',
                    Icone: Copy,
                    aoEscolher: () => void duplicar(),
                  },
                ]
              : []),
            {
              id: 'abrir',
              rotulo: 'Abrir pagina',
              Icone: FileText,
              aoEscolher: () => router.push(`/notas/${pagina.id}`),
            },
            ...(podeEditar
              ? [
                  {
                    id: 'excluir',
                    rotulo: 'Mover para a lixeira',
                    Icone: Trash2,
                    perigosa: true,
                    separadorAntes: true,
                    aoEscolher: () => setExcluindo(true),
                  },
                ]
              : []),
          ]}
        />
      </div>

      {aberto && temFilhas ? (
        <div className="ml-2.5 border-l pl-1.5">
          <DndContext
            sensors={sensores}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={() => undefined}
          >
            <SortableContext
              items={pagina.subpaginas.map((filha) => filha.id)}
              strategy={verticalListSortingStrategy}
            >
              {pagina.subpaginas.map((filha) => (
                <NoDePagina
                  key={filha.id}
                  pagina={filha}
                  nivel={nivel + 1}
                  compacta={compacta}
                  permissao={permissao}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      ) : null}

      <DialogoDeConfirmacao
        aberto={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo={`Mover "${pagina.title}" para a lixeira?`}
        descricao="Voce pode restaurar a pagina depois."
        aviso={
          temFilhas
            ? `${pagina.subpaginas.length} subpagina${pagina.subpaginas.length > 1 ? 's' : ''} vai junto.`
            : undefined
        }
        rotuloDeConfirmacao="Mover para a lixeira"
        aoConfirmar={async () => {
          await excluirPagina(pagina.id);
          await recarregar();
          if (ativa) router.push('/notas');
        }}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Compartilhadas comigo
// -----------------------------------------------------------------------------

/** Secoes de outras contas em que o usuario e membro. Some quando nao ha nenhuma. */
export function SecoesCompartilhadas({ compacta = false }: { compacta?: boolean }) {
  const { compartilhadas, carregando } = usarArvore();

  if (carregando || compartilhadas.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {compartilhadas.map((secao) => (
        <NoDeSecaoCompartilhada key={secao.id} secao={secao} compacta={compacta} />
      ))}
    </div>
  );
}

function NoDeSecaoCompartilhada({
  secao,
  compacta,
}: {
  secao: SecaoCompartilhada;
  compacta: boolean;
}) {
  const { abertos, alternarAberto, recarregar, compartilhadas, definirCompartilhadas } =
    usarArvore();
  const router = useRouter();
  const [vendoMembros, setVendoMembros] = useState(false);
  const [criando, setCriando] = useState(false);

  const aberto = abertos.has(secao.id);
  const podeEditar = secao.permissao === 'editor';
  const Icone = iconeDeConteudo(secao.icon, FileText);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function novaPagina() {
    setCriando(true);
    try {
      const pagina = await criarPagina({ sectionId: secao.id, title: 'Sem titulo' });
      await recarregar();
      if (!aberto) alternarAberto(secao.id);
      router.push(`/notas/${pagina.id}`);
    } finally {
      setCriando(false);
    }
  }

  async function aoSoltarPagina(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;

    const de = secao.paginas.findIndex((pagina) => pagina.id === active.id);
    const para = secao.paginas.findIndex((pagina) => pagina.id === over.id);
    if (de === -1 || para === -1) return;

    const novasPaginas = arrayMove(secao.paginas, de, para);
    definirCompartilhadas(
      compartilhadas.map((item) =>
        item.id === secao.id ? { ...item, paginas: novasPaginas } : item,
      ),
    );

    try {
      await reordenarPaginas(
        novasPaginas.map((pagina, indice) => ({ id: pagina.id, position: indice })),
      );
    } catch {
      await recarregar();
    }
  }

  return (
    <div>
      <div className="group flex h-7 items-center gap-1 rounded-md pr-1 transition-colors hover:bg-[var(--superficie-suave)]">
        <span className="size-4 shrink-0" aria-hidden="true" />

        <button
          type="button"
          onClick={() => alternarAberto(secao.id)}
          aria-expanded={aberto}
          title={`De ${secao.dono.nome} - ${podeEditar ? 'voce pode editar' : 'somente leitura'}`}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              'size-3 shrink-0 text-[var(--texto-tenue)] transition-transform',
              aberto && 'rotate-90',
            )}
          />
          <Icone aria-hidden="true" className="size-3.5 shrink-0 text-[var(--texto-tenue)]" />
          <span className="truncate text-sm text-[var(--texto-suave)]">{secao.name}</span>
          {!podeEditar ? (
            <span className="text-2xs shrink-0 text-[var(--texto-tenue)]">leitura</span>
          ) : null}
        </button>

        <MenuSuspenso
          rotulo={`Acoes da secao ${secao.name}`}
          gatilho={({ aberto: menuAberto }) => (
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-sm text-[var(--texto-tenue)] transition-opacity hover:text-[var(--texto)]',
                menuAberto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
            >
              <MoreHorizontal aria-hidden="true" className="size-3.5" />
            </span>
          )}
          acoes={[
            ...(podeEditar
              ? [
                  {
                    id: 'pagina',
                    rotulo: 'Nova pagina',
                    Icone: FilePlus2,
                    aoEscolher: () => void novaPagina(),
                  },
                ]
              : []),
            {
              id: 'membros',
              rotulo: 'Pessoas com acesso',
              Icone: Users,
              aoEscolher: () => setVendoMembros(true),
            },
          ]}
        />
      </div>

      {aberto ? (
        <div className="ml-2.5 border-l pl-1.5">
          {secao.paginas.length === 0 ? (
            podeEditar ? (
              <button
                type="button"
                disabled={criando}
                onClick={() => void novaPagina()}
                className="flex h-7 w-full cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs text-[var(--texto-tenue)] transition-colors hover:bg-[var(--superficie-suave)] hover:text-[var(--texto)] disabled:opacity-50"
              >
                <Plus aria-hidden="true" className="size-3" />
                Nova pagina
              </button>
            ) : (
              <p className="px-2 py-1 text-xs text-[var(--texto-tenue)]">Nenhuma pagina ainda.</p>
            )
          ) : (
            <DndContext
              sensors={sensores}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={(evento) => void aoSoltarPagina(evento)}
            >
              <SortableContext
                items={secao.paginas.map((pagina) => pagina.id)}
                strategy={verticalListSortingStrategy}
              >
                {secao.paginas.map((pagina) => (
                  <NoDePagina
                    key={pagina.id}
                    pagina={pagina}
                    nivel={0}
                    compacta={compacta}
                    permissao={secao.permissao}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      ) : null}

      <DialogoDeCompartilhar
        aberto={vendoMembros}
        aoFechar={() => setVendoMembros(false)}
        secaoId={secao.id}
        secaoNome={secao.name}
      />
    </div>
  );
}
