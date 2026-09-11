'use client';

import type { Editor, Range } from '@tiptap/core';
import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { COMANDOS, normalizar, type ComandoDoEditor } from './comandos';
import { cn } from '@/lib/utils';

export interface ReferenciaDoMenu {
  /** Devolve true quando a tecla foi tratada pelo menu. */
  aoPressionar: (evento: KeyboardEvent) => boolean;
}

/**
 * Lista de comandos rapidos aberta ao digitar "/".
 *
 * Navegacao pelas setas, Enter para escolher, Esc para fechar. A busca ignora
 * acentos, entao "codigo" encontra tanto "codigo" quanto "código".
 */
export const MenuDeComandos = forwardRef<
  ReferenciaDoMenu,
  { termo: string; aoEscolher: (comando: ComandoDoEditor) => void }
>(function MenuDeComandos({ termo, aoEscolher }, ref) {
  const [selecionado, setSelecionado] = useState(0);
  const lista = useRef<HTMLDivElement>(null);

  const busca = normalizar(termo.trim());

  const filtrados = busca
    ? COMANDOS.filter(
        (comando) =>
          normalizar(comando.rotulo).includes(busca) ||
          comando.termos.some((alternativo) => normalizar(alternativo).includes(busca)),
      )
    : COMANDOS;

  useEffect(() => setSelecionado(0), [termo]);

  useEffect(() => {
    lista.current?.querySelectorAll('[data-item]')[selecionado]?.scrollIntoView({
      block: 'nearest',
    });
  }, [selecionado]);

  useImperativeHandle(ref, () => ({
    aoPressionar: (evento: KeyboardEvent) => {
      if (evento.key === 'ArrowDown') {
        setSelecionado((atual) => (atual + 1) % Math.max(filtrados.length, 1));
        return true;
      }

      if (evento.key === 'ArrowUp') {
        setSelecionado(
          (atual) => (atual - 1 + filtrados.length) % Math.max(filtrados.length, 1),
        );
        return true;
      }

      if (evento.key === 'Enter') {
        const escolhido = filtrados[selecionado];
        if (escolhido) {
          aoEscolher(escolhido);
          return true;
        }
      }

      return false;
    },
  }));

  if (filtrados.length === 0) {
    return (
      <div className="superficie w-72 px-4 py-3 text-sm text-[var(--texto-suave)] shadow-elevada">
        Nenhum comando para <span className="font-medium text-[var(--texto)]">{termo}</span>.
      </div>
    );
  }

  let grupoAnterior = '';

  return (
    <div
      ref={lista}
      role="listbox"
      aria-label="Comandos do editor"
      className="superficie max-h-80 w-72 overflow-y-auto p-1 shadow-elevada"
    >
      {filtrados.map((comando, indice) => {
        const novoGrupo = comando.grupo !== grupoAnterior;
        grupoAnterior = comando.grupo;

        return (
          <div key={comando.id}>
            {novoGrupo ? (
              <p className="px-3 pt-2.5 pb-1 text-2xs font-medium tracking-wide text-[var(--texto-tenue)] uppercase">
                {comando.grupo}
              </p>
            ) : null}

            <button
              type="button"
              data-item
              role="option"
              aria-selected={indice === selecionado}
              onClick={() => aoEscolher(comando)}
              onMouseEnter={() => setSelecionado(indice)}
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
                indice === selecionado ? 'bg-[var(--superficie-suave)]' : '',
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md border text-[var(--texto-suave)]">
                <comando.Icone aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{comando.rotulo}</span>
                <span className="block truncate text-2xs text-[var(--texto-suave)]">
                  {comando.descricao}
                </span>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
});

/** Estado do menu enquanto ele esta aberto, entregue pela extensao. */
export interface EstadoDoMenu {
  editor: Editor;
  range: Range;
  termo: string;
  posicao: { x: number; y: number };
}
