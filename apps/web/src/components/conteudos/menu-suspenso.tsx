'use client';

import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AcaoDoMenu {
  id: string;
  rotulo: string;
  Icone: LucideIcon;
  aoEscolher: () => void;
  perigosa?: boolean;
  separadorAntes?: boolean;
}

/**
 * Menu de acoes acionado por um botao.
 * Fecha ao clicar fora, ao pressionar Esc e ao escolher uma acao, devolvendo
 * o foco ao botao que o abriu.
 */
export function MenuSuspenso({
  gatilho,
  rotulo,
  acoes,
  alinhamento = 'direita',
}: {
  gatilho: (props: { aberto: boolean }) => ReactNode;
  rotulo: string;
  acoes: AcaoDoMenu[];
  alinhamento?: 'direita' | 'esquerda';
}) {
  const [aberto, setAberto] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(evento: MouseEvent) {
      if (!container.current?.contains(evento.target as Node)) setAberto(false);
    }

    function aoPressionar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.stopPropagation();
        setAberto(false);
        botao.current?.focus();
      }
    }

    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoPressionar);

    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoPressionar);
    };
  }, [aberto]);

  return (
    <div ref={container} className="relative">
      <button
        ref={botao}
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={rotulo}
        onClick={(evento) => {
          evento.preventDefault();
          evento.stopPropagation();
          setAberto((atual) => !atual);
        }}
        className="cursor-pointer"
      >
        {gatilho({ aberto })}
      </button>

      {aberto ? (
        <div
          role="menu"
          className={cn(
            'animate-surgir superficie absolute top-full z-50 mt-1 w-56 overflow-hidden p-1 shadow-elevada',
            alinhamento === 'direita' ? 'right-0' : 'left-0',
          )}
        >
          {acoes.map((acao) => (
            <div key={acao.id}>
              {acao.separadorAntes ? <div className="my-1 border-t" /> : null}
              <button
                role="menuitem"
                type="button"
                onClick={(evento) => {
                  evento.preventDefault();
                  evento.stopPropagation();
                  setAberto(false);
                  acao.aoEscolher();
                }}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--superficie-suave)]',
                  acao.perigosa ? 'text-perigo-700 dark:text-perigo-500' : 'text-[var(--texto)]',
                )}
              >
                <acao.Icone aria-hidden="true" className="size-4 shrink-0 opacity-70" />
                {acao.rotulo}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
