'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Trilha } from '@/components/navegacao/trilha';
import { itemAtivo, NAVEGACAO_CONFIGURACOES } from '@/lib/rotas';
import { cn } from '@/lib/utils';

/** Navegacao secundaria das configuracoes, em abas roláveis no celular. */
export default function LayoutDeConfiguracoes({ children }: { children: ReactNode }) {
  const caminho = usePathname();

  return (
    <div className="space-y-6">
      <Trilha />

      <nav aria-label="Secoes das configuracoes" className="-mx-1 overflow-x-auto">
        <ul className="flex min-w-max gap-1 border-b px-1">
          {NAVEGACAO_CONFIGURACOES.map((item) => {
            const ativo = itemAtivo(caminho, item);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={ativo ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 border-b-2 px-3 pb-2.5 text-sm transition-colors',
                    ativo
                      ? 'border-[var(--destaque)] font-medium text-[var(--texto)]'
                      : 'border-transparent text-[var(--texto-suave)] hover:text-[var(--texto)]',
                  )}
                >
                  <item.Icone aria-hidden="true" className="size-4" />
                  {item.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {children}
    </div>
  );
}
