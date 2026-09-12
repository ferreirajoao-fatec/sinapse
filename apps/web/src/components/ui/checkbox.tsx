'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Caixa de selecao usada pelos itens de checklist. */
export function Checkbox({
  marcado,
  aoAlternar,
  rotulo,
}: {
  marcado: boolean;
  aoAlternar: (valor: boolean) => void;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcado}
      aria-label={rotulo}
      onClick={() => aoAlternar(!marcado)}
      className={cn(
        'flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors',
        marcado
          ? 'border-[var(--destaque)] bg-[var(--destaque)] text-[var(--contraste-destaque)]'
          : 'border-[var(--borda-forte)] bg-[var(--superficie)] hover:border-[var(--destaque)]',
      )}
    >
      {marcado ? <Check aria-hidden="true" className="size-3.5" /> : null}
    </button>
  );
}
