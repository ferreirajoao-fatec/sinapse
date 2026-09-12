'use client';

import { X } from 'lucide-react';
import { CHAVES_DE_ICONE, iconeDeConteudo } from '@/lib/icones-de-conteudo';
import { cn } from '@/lib/utils';

export function SeletorDeIcone({
  valor,
  aoEscolher,
}: {
  valor: string | null;
  aoEscolher: (chave: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium">Icone</span>

      <div
        role="radiogroup"
        aria-label="Icone"
        className="flex flex-wrap gap-1 rounded-md border p-2"
      >
        <button
          type="button"
          role="radio"
          aria-checked={valor === null}
          aria-label="Sem icone"
          title="Sem icone"
          onClick={() => aoEscolher(null)}
          className={cn(
            'flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors',
            valor === null
              ? 'bg-[var(--destaque-suave)] text-[var(--destaque)]'
              : 'text-[var(--texto-tenue)] hover:bg-[var(--superficie-suave)]',
          )}
        >
          <X aria-hidden="true" className="size-4" />
        </button>

        {CHAVES_DE_ICONE.map((chave) => {
          const Icone = iconeDeConteudo(chave);
          const ativo = valor === chave;

          return (
            <button
              key={chave}
              type="button"
              role="radio"
              aria-checked={ativo}
              aria-label={chave}
              title={chave}
              onClick={() => aoEscolher(chave)}
              className={cn(
                'flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors',
                ativo
                  ? 'bg-[var(--destaque-suave)] text-[var(--destaque)]'
                  : 'text-[var(--texto-suave)] hover:bg-[var(--superficie-suave)]',
              )}
            >
              <Icone aria-hidden="true" className="size-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
