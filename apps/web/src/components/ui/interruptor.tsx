'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/** Chave de liga e desliga, com rotulo clicavel e estado anunciado. */
export function Interruptor({
  rotulo,
  descricao,
  ligado,
  aoAlternar,
}: {
  rotulo: string;
  descricao?: string;
  ligado: boolean;
  aoAlternar: (valor: boolean) => void;
}) {
  const id = useId();

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {rotulo}
        </label>
        {descricao ? <p className="text-xs text-[var(--texto-suave)]">{descricao}</p> : null}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={ligado}
        onClick={() => aoAlternar(!ligado)}
        className={cn(
          'relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors',
          ligado ? 'bg-[var(--destaque)]' : 'bg-[var(--borda-forte)]',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'shadow-suave absolute top-1 size-4 rounded-full bg-white transition-all',
            ligado ? 'left-6' : 'left-1',
          )}
        />
      </button>
    </div>
  );
}
