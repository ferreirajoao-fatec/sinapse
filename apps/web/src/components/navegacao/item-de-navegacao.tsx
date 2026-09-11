'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Dica } from '@/components/ui/dica';
import type { ItemDeNavegacao } from '@/lib/rotas';
import { cn } from '@/lib/utils';

export function ItemLateral({
  item,
  ativo,
  recolhida,
}: {
  item: ItemDeNavegacao;
  ativo: boolean;
  recolhida: boolean;
}) {
  const { href, rotulo, Icone, etapa } = item;

  return (
    <li>
      <Dica texto={rotulo} desativada={!recolhida}>
        <Link
          href={href}
          aria-current={ativo ? 'page' : undefined}
          aria-label={recolhida ? rotulo : undefined}
          title={recolhida ? rotulo : undefined}
          className={cn(
            'flex h-9 items-center gap-3 rounded-md text-sm transition-colors',
            recolhida ? 'w-9 justify-center' : 'px-2.5',
            ativo
              ? 'bg-[var(--destaque-suave)] font-medium text-[var(--destaque)]'
              : 'text-[var(--texto-suave)] hover:bg-[var(--superficie-suave)] hover:text-[var(--texto)]',
          )}
        >
          <Icone aria-hidden="true" className="size-4 shrink-0" />

          {!recolhida ? (
            <>
              <span className="flex-1 truncate">{rotulo}</span>
              {etapa ? <Badge>{etapa}</Badge> : null}
            </>
          ) : null}
        </Link>
      </Dica>
    </li>
  );
}
