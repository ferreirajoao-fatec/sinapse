'use client';

import { ENTITY_COLORS, type EntityColor } from '@sinapse/shared';
import { Check } from 'lucide-react';
import { corDeConteudo, NOMES_DAS_CORES } from '@/lib/icones-de-conteudo';
import { cn } from '@/lib/utils';

export function SeletorDeCor({
  valor,
  aoEscolher,
}: {
  valor: EntityColor;
  aoEscolher: (cor: EntityColor) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium">Cor</span>

      <div role="radiogroup" aria-label="Cor" className="flex flex-wrap gap-2">
        {ENTITY_COLORS.map((cor) => {
          const ativo = valor === cor;

          return (
            <button
              key={cor}
              type="button"
              role="radio"
              aria-checked={ativo}
              aria-label={NOMES_DAS_CORES[cor] ?? cor}
              title={NOMES_DAS_CORES[cor] ?? cor}
              onClick={() => aoEscolher(cor)}
              className={cn(
                'flex size-8 cursor-pointer items-center justify-center rounded-full transition-transform',
                corDeConteudo(cor).ponto,
                ativo
                  ? 'ring-2 ring-[var(--texto)] ring-offset-2 ring-offset-[var(--superficie)]'
                  : 'hover:scale-110',
              )}
            >
              {ativo ? <Check aria-hidden="true" className="size-4 text-white" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
