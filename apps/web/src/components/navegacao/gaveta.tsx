'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { usarNavegacao } from '@/hooks/usar-navegacao';
import { cn } from '@/lib/utils';
import { ConteudoDaBarra } from './barra-lateral';

/**
 * Navegacao em gaveta, para telas menores que 1024px.
 * Fecha ao tocar fora, ao pressionar Esc e ao navegar.
 */
export function Gaveta() {
  const { gavetaAberta, fecharGaveta } = usarNavegacao();
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gavetaAberta) return;

    function aoPressionar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') fecharGaveta();
    }

    window.addEventListener('keydown', aoPressionar);
    painel.current?.focus();

    return () => window.removeEventListener('keydown', aoPressionar);
  }, [gavetaAberta, fecharGaveta]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={fecharGaveta}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden',
          gavetaAberta ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <div
        ref={painel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegacao"
        aria-hidden={!gavetaAberta}
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 border-r bg-[var(--fundo)] px-4 py-4 transition-transform lg:hidden',
          gavetaAberta ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button
          type="button"
          onClick={fecharGaveta}
          aria-label="Fechar o menu"
          className="absolute right-3 top-4 flex size-8 cursor-pointer items-center justify-center rounded-md text-[var(--texto-tenue)] transition-colors hover:bg-[var(--superficie-suave)] hover:text-[var(--texto)]"
        >
          <X aria-hidden="true" className="size-4" />
        </button>

        {gavetaAberta ? <ConteudoDaBarra recolhida={false} /> : null}
      </div>
    </>
  );
}
