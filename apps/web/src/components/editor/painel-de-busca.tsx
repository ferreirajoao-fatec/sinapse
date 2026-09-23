'use client';

import type { Editor } from '@tiptap/react';
import { CaseSensitive, ChevronDown, ChevronUp, ChevronRight, WholeWord, X } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { OpcoesDeBusca } from './busca/motor';
import {
  buscar,
  estadoDaBusca,
  irParaOcorrencia,
  limparBusca,
  substituirAtual,
  substituirTodas,
} from './extensoes/localizar-e-substituir';

/** Pedido de abertura vindo do atalho ou do menu da anotacao. */
export interface PedidoDeBusca {
  /** Muda a cada pedido, para focar o campo mesmo com o painel ja aberto. */
  id: number;
  /** Texto selecionado no editor, usado como termo inicial. */
  termo: string | null;
}

interface Resumo {
  total: number;
  atual: number;
}

function resumir(editor: Editor): Resumo {
  const estado = estadoDaBusca(editor.state);
  return { total: estado.ocorrencias.length, atual: estado.atual };
}

/** Rolagem do editor: a janela, ou o container do modo de foco. */
function containerDeRolagem(elemento: HTMLElement): HTMLElement | null {
  for (let atual = elemento.parentElement; atual; atual = atual.parentElement) {
    const { overflowY } = getComputedStyle(atual);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      atual.scrollHeight > atual.clientHeight
    ) {
      return atual;
    }
  }
  return null;
}

/**
 * Painel de localizar e substituir, preso ao topo do editor.
 *
 * O foco fica no campo enquanto se navega: a ocorrencia atual e mostrada por
 * destaque e rolagem, sem mover o cursor da anotacao. Ao fechar, o cursor vai
 * para a ocorrencia atual, como no Localizar dos navegadores.
 */
export function PainelDeBusca({
  editor,
  pedido,
  somenteLeitura,
  aoFechar,
}: {
  editor: Editor;
  pedido: PedidoDeBusca;
  somenteLeitura: boolean;
  aoFechar: () => void;
}) {
  const [termo, setTermo] = useState(pedido.termo ?? '');
  const [opcoes, setOpcoes] = useState<OpcoesDeBusca>({
    diferenciarMaiusculas: false,
    palavraInteira: false,
  });
  const [substituirAberto, setSubstituirAberto] = useState(false);
  const [novoTexto, setNovoTexto] = useState('');
  const [resumo, setResumo] = useState<Resumo>(() => resumir(editor));
  const [anuncio, setAnuncio] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  const campoDeBusca = useRef<HTMLInputElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const ultimaSubstituicaoEmMassa = useRef(0);
  const idDaBusca = useId();
  const idDoSubstituir = useId();
  const idDoContador = useId();
  const idDaSecao = useId();

  const podeSubstituir = !somenteLeitura && editor.isEditable;

  /** Leva a ocorrencia atual para a area visivel, abaixo do painel. */
  const rolarParaAtual = useCallback(() => {
    const estado = estadoDaBusca(editor.state);
    const ocorrencia = estado.ocorrencias[estado.atual];
    if (!ocorrencia) return;

    const coordenadas = editor.view.coordsAtPos(ocorrencia.from);
    const container = containerDeRolagem(editor.view.dom);
    const visivel = window.visualViewport;
    const topo = Math.max(
      painel.current?.getBoundingClientRect().bottom ?? 0,
      container?.getBoundingClientRect().top ?? 0,
    );
    // O teclado virtual encolhe a area visivel; a barra inferior do celular tambem ocupa espaco.
    const margemInferior = window.matchMedia('(max-width: 639px)').matches ? 80 : 24;
    const base =
      (visivel ? visivel.offsetTop + visivel.height : window.innerHeight) - margemInferior;
    const folga = 24;

    if (coordenadas.top >= topo + folga && coordenadas.bottom <= base) return;

    // Coloca o resultado a um terco da area livre, deixando contexto acima dele.
    const destino = topo + (base - topo) / 3;
    const deslocamento = coordenadas.top - destino;
    if (container) container.scrollBy({ top: deslocamento });
    else window.scrollBy({ top: deslocamento });
  }, [editor]);

  // Pedido de abertura: usa a selecao como termo e foca o campo.
  useEffect(() => {
    if (pedido.termo) setTermo(pedido.termo);
    campoDeBusca.current?.focus();
    campoDeBusca.current?.select();
  }, [pedido]);

  // Refaz a busca enquanto se digita ou muda uma opcao.
  useEffect(() => {
    buscar(editor.view, termo, opcoes);
    rolarParaAtual();
  }, [editor, termo, opcoes, rolarParaAtual]);

  // Acompanha alteracoes do documento (inclusive de outras pessoas) e da navegacao.
  useEffect(() => {
    const atualizar = () => {
      setResumo((anterior) => {
        const novo = resumir(editor);
        return novo.total === anterior.total && novo.atual === anterior.atual ? anterior : novo;
      });
    };
    editor.on('transaction', atualizar);
    // A primeira busca (com o termo selecionado) pode ter rodado antes da assinatura.
    atualizar();
    return () => {
      editor.off('transaction', atualizar);
    };
  }, [editor]);

  // Ao fechar ou trocar de anotacao, os destaques vao embora com o painel.
  useEffect(() => {
    return () => {
      if (!editor.isDestroyed) limparBusca(editor.view);
    };
  }, [editor]);

  // A anotacao pode virar somente leitura com o painel aberto.
  useEffect(() => {
    if (!podeSubstituir) setSubstituirAberto(false);
  }, [podeSubstituir]);

  const semTermo = termo.length === 0;
  const textoDoContador = semTermo
    ? ''
    : resumo.total === 0
      ? 'Nenhuma ocorrencia encontrada'
      : `${resumo.atual + 1} de ${resumo.total}`;

  // Leitores de tela ouvem a contagem so depois de uma pausa na digitacao.
  useEffect(() => {
    // Depois de "Substituir todas", o anuncio e o total de trocas, nao a nova contagem.
    if (Date.now() - ultimaSubstituicaoEmMassa.current < 1000) return;
    if (semTermo) {
      setAnuncio('');
      return;
    }
    const temporizador = setTimeout(() => {
      // Uma contagem agendada antes da troca em massa nao pode cobrir o aviso dela.
      if (Date.now() - ultimaSubstituicaoEmMassa.current < 1000) return;
      setAnuncio(
        resumo.total === 0
          ? 'Nenhuma ocorrencia encontrada'
          : `Ocorrencia ${resumo.atual + 1} de ${resumo.total}`,
      );
    }, 500);
    return () => clearTimeout(temporizador);
  }, [semTermo, resumo]);

  // O aviso de "Substituir todas" some quando a busca muda.
  useEffect(() => {
    setAviso(null);
  }, [termo, opcoes]);

  function navegar(passo: 1 | -1) {
    const estado = estadoDaBusca(editor.state);
    if (estado.ocorrencias.length === 0) return;
    irParaOcorrencia(editor.view, estado.atual + passo);
    rolarParaAtual();
  }

  function aoSubstituir() {
    if (!podeSubstituir) return;
    if (substituirAtual(editor.view, novoTexto)) {
      setAviso(null);
      rolarParaAtual();
    }
  }

  function aoSubstituirTodas() {
    if (!podeSubstituir) return;
    const total = substituirTodas(editor.view, novoTexto);
    if (total === 0) return;
    const mensagem = total === 1 ? '1 ocorrencia substituida' : `${total} ocorrencias substituidas`;
    ultimaSubstituicaoEmMassa.current = Date.now();
    setAviso(mensagem);
    setAnuncio(mensagem);
  }

  function aoPressionarNoPainel(evento: React.KeyboardEvent) {
    if (evento.key === 'Escape') {
      // Nao deixa o Esc chegar ao modo de foco ou a outros atalhos da pagina.
      evento.preventDefault();
      evento.stopPropagation();
      aoFechar();
    }
  }

  const desabilitarNavegacao = semTermo || resumo.total === 0;
  const desabilitarSubstituir = !podeSubstituir || semTermo || resumo.total === 0;

  return (
    <div
      ref={painel}
      role="search"
      aria-label="Localizar e substituir na anotacao"
      onKeyDown={aoPressionarNoPainel}
      className="superficie shadow-elevada animate-surgir w-full space-y-2 rounded-lg border p-2 sm:ml-auto sm:w-[30rem]"
    >
      {/* No celular: campo e fechar na primeira linha, opcoes e setas na segunda. */}
      <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
        {podeSubstituir ? (
          <BotaoDoPainel
            rotulo={substituirAberto ? 'Ocultar substituir' : 'Mostrar substituir'}
            aria-expanded={substituirAberto}
            aria-controls={idDaSecao}
            onClick={() => setSubstituirAberto((atual) => !atual)}
          >
            <ChevronRight
              aria-hidden="true"
              className={cn('size-4 transition-transform', substituirAberto && 'rotate-90')}
            />
          </BotaoDoPainel>
        ) : null}

        <div className="relative min-w-0 flex-1">
          <label htmlFor={idDaBusca} className="sr-only">
            Localizar
          </label>
          <input
            ref={campoDeBusca}
            id={idDaBusca}
            type="text"
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter' && !evento.nativeEvent.isComposing) {
                evento.preventDefault();
                navegar(evento.shiftKey ? -1 : 1);
              }
            }}
            placeholder="Localizar"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-describedby={semTermo ? undefined : idDoContador}
            aria-invalid={!semTermo && resumo.total === 0}
            className={cn(
              'h-9 w-full rounded-md border bg-[var(--superficie)] pl-2.5 text-base sm:text-sm',
              'placeholder:text-[var(--texto-tenue)] focus:border-[var(--destaque)]',
              resumo.total > 0 ? 'pr-20' : 'pr-2.5',
              !semTermo && resumo.total === 0 && 'border-perigo-500',
            )}
          />
          {resumo.total > 0 ? (
            <span
              id={idDoContador}
              className="text-2xs pointer-events-none absolute inset-y-0 right-2.5 flex items-center tabular-nums text-[var(--texto-suave)]"
            >
              {textoDoContador}
            </span>
          ) : null}
        </div>

        <div className="order-last flex w-full items-center gap-1 sm:order-none sm:w-auto">
          <BotaoDoPainel
            rotulo="Diferenciar maiusculas e minusculas"
            aria-pressed={opcoes.diferenciarMaiusculas}
            onClick={() =>
              setOpcoes((atual) => ({
                ...atual,
                diferenciarMaiusculas: !atual.diferenciarMaiusculas,
              }))
            }
          >
            <CaseSensitive aria-hidden="true" className="size-4" />
          </BotaoDoPainel>
          <BotaoDoPainel
            rotulo="Palavra inteira"
            aria-pressed={opcoes.palavraInteira}
            onClick={() =>
              setOpcoes((atual) => ({ ...atual, palavraInteira: !atual.palavraInteira }))
            }
          >
            <WholeWord aria-hidden="true" className="size-4" />
          </BotaoDoPainel>

          <span className="flex-1 sm:hidden" aria-hidden="true" />

          <BotaoDoPainel
            rotulo="Ocorrencia anterior"
            atalho="Shift+Enter"
            disabled={desabilitarNavegacao}
            onClick={() => navegar(-1)}
          >
            <ChevronUp aria-hidden="true" className="size-4" />
          </BotaoDoPainel>
          <BotaoDoPainel
            rotulo="Proxima ocorrencia"
            atalho="Enter"
            disabled={desabilitarNavegacao}
            onClick={() => navegar(1)}
          >
            <ChevronDown aria-hidden="true" className="size-4" />
          </BotaoDoPainel>
        </div>

        <BotaoDoPainel rotulo="Fechar a busca" atalho="Esc" onClick={aoFechar}>
          <X aria-hidden="true" className="size-4" />
        </BotaoDoPainel>
      </div>

      {!semTermo && resumo.total === 0 ? (
        <p id={idDoContador} className="text-2xs text-perigo-700 dark:text-perigo-500 px-1">
          {textoDoContador}
        </p>
      ) : null}

      {podeSubstituir && substituirAberto ? (
        <div id={idDaSecao} className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
          <label htmlFor={idDoSubstituir} className="sr-only">
            Substituir por
          </label>
          <input
            id={idDoSubstituir}
            type="text"
            value={novoTexto}
            onChange={(evento) => setNovoTexto(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') {
                evento.preventDefault();
                aoSubstituir();
              }
            }}
            placeholder="Substituir por"
            autoComplete="off"
            spellCheck={false}
            className="h-9 w-full min-w-0 flex-1 basis-full rounded-md border bg-[var(--superficie)] px-2.5 text-base placeholder:text-[var(--texto-tenue)] focus:border-[var(--destaque)] sm:basis-auto sm:text-sm"
          />
          <button
            type="button"
            onClick={aoSubstituir}
            disabled={desabilitarSubstituir}
            title="Substituir a ocorrencia atual (Enter no campo)"
            className="h-9 flex-1 cursor-pointer rounded-md border px-3 text-sm font-medium transition-colors hover:bg-[var(--superficie-suave)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            Substituir
          </button>
          <button
            type="button"
            onClick={aoSubstituirTodas}
            disabled={desabilitarSubstituir}
            className="h-9 flex-1 cursor-pointer rounded-md bg-[var(--destaque)] px-3 text-sm font-medium text-[var(--contraste-destaque)] transition-colors hover:bg-[var(--destaque-forte)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            Substituir todas
          </button>
        </div>
      ) : null}

      {aviso ? <p className="text-2xs px-1 text-[var(--texto-suave)]">{aviso}</p> : null}

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {anuncio}
      </p>
    </div>
  );
}

function BotaoDoPainel({
  rotulo,
  atalho,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { rotulo: string; atalho?: string }) {
  const ativo = props['aria-pressed'] === true;
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={atalho ? `${rotulo} (${atalho})` : rotulo}
      className={cn(
        'flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors sm:size-8',
        'disabled:cursor-not-allowed disabled:opacity-40',
        ativo
          ? 'bg-[var(--destaque-suave)] text-[var(--destaque)] ring-1 ring-[var(--destaque)]'
          : 'text-[var(--texto-suave)] hover:bg-[var(--superficie-suave)] hover:text-[var(--texto)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
