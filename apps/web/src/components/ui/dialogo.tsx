'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Janela modal baseada no elemento <dialog> nativo.
 *
 * Usar o elemento nativo entrega de graca tres coisas que costumam ser
 * implementadas errado: o foco fica preso dentro da janela, o restante da
 * pagina some para leitores de tela, e a tecla Esc fecha.
 */
export function Dialogo({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  larguraMaxima = 'max-w-lg',
  semPadding = false,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  larguraMaxima?: string;
  /** Use quando o conteudo controla o proprio espacamento, como a paleta. */
  semPadding?: boolean;
}) {
  const referencia = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;

    if (aberto && !dialogo.open) {
      dialogo.showModal();
    } else if (!aberto && dialogo.open) {
      dialogo.close();
    }
  }, [aberto]);

  return (
    <dialog
      ref={referencia}
      aria-label={titulo}
      onCancel={(evento) => {
        evento.preventDefault();
        aoFechar();
      }}
      onClick={(evento) => {
        // Clicar na area escura fecha; clicar no conteudo, nao.
        if (evento.target === referencia.current) {
          aoFechar();
        }
      }}
      className={cn(
        'superficie fixed top-[12vh] m-0 w-[calc(100%-2rem)] shadow-elevada backdrop:bg-black/40',
        'left-1/2 -translate-x-1/2 text-[var(--texto)] open:animate-surgir',
        larguraMaxima,
      )}
    >
      <div className={cn('flex items-start justify-between gap-4', semPadding ? 'p-4 pb-0' : 'p-5 pb-3')}>
        <div className="space-y-1">
          <h2 className="text-base leading-none font-medium">{titulo}</h2>
          {descricao ? <p className="text-sm text-[var(--texto-suave)]">{descricao}</p> : null}
        </div>

        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="-mt-1 -mr-1 flex size-8 cursor-pointer items-center justify-center rounded-md text-[var(--texto-tenue)] transition-colors hover:bg-[var(--superficie-suave)] hover:text-[var(--texto)]"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className={semPadding ? '' : 'px-5 pb-5'}>{children}</div>
    </dialog>
  );
}
