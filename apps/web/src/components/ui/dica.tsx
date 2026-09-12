'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Dica que aparece ao lado do elemento, usada quando a barra lateral esta
 * recolhida e so os icones ficam visiveis.
 *
 * Reage tanto ao mouse quanto ao foco por teclado, e o texto tambem esta no
 * aria-label do proprio botao, entao leitores de tela nunca dependem dela.
 */
export function Dica({
  texto,
  atalho,
  desativada = false,
  children,
}: {
  texto: string;
  atalho?: string;
  desativada?: boolean;
  children: ReactNode;
}) {
  const [visivel, setVisivel] = useState(false);

  if (desativada) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setVisivel(true)}
      onMouseLeave={() => setVisivel(false)}
      onFocus={() => setVisivel(true)}
      onBlur={() => setVisivel(false)}
    >
      {children}

      <span
        role="tooltip"
        aria-hidden={!visivel}
        className={cn(
          'pointer-events-none absolute left-[calc(100%+0.5rem)] top-1/2 z-50 -translate-y-1/2',
          'flex items-center gap-2 rounded-md border bg-[var(--superficie)] px-2.5 py-1.5',
          'shadow-elevada whitespace-nowrap text-xs transition-opacity',
          visivel ? 'opacity-100' : 'opacity-0',
        )}
      >
        {texto}
        {atalho ? (
          <kbd className="text-2xs rounded-sm border bg-[var(--superficie-suave)] px-1 font-mono text-[var(--texto-suave)]">
            {atalho}
          </kbd>
        ) : null}
      </span>
    </div>
  );
}
