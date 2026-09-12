'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usarNavegacao } from '@/hooks/usar-navegacao';
import { itemAtivo, NAVEGACAO_PRINCIPAL } from '@/lib/rotas';
import { cn } from '@/lib/utils';

/**
 * Barra inferior do celular.
 * Leva apenas os destinos marcados como noCelular, mais o botao de menu:
 * cinco alvos de toque e o limite antes de os icones ficarem pequenos demais.
 */
export function NavegacaoInferior() {
  const caminho = usePathname();
  const { abrirGaveta } = usarNavegacao();
  const itens = NAVEGACAO_PRINCIPAL.filter((item) => item.noCelular);

  return (
    <nav
      aria-label="Navegacao rapida"
      className="bg-[var(--fundo)]/95 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch">
        {itens.map((item) => {
          const ativo = itemAtivo(caminho, item);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={ativo ? 'page' : undefined}
                className={cn(
                  'text-2xs flex h-14 flex-col items-center justify-center gap-1 transition-colors',
                  ativo ? 'text-[var(--destaque)]' : 'text-[var(--texto-suave)]',
                )}
              >
                <item.Icone aria-hidden="true" className="size-5" />
                {item.rotulo}
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <button
            type="button"
            onClick={abrirGaveta}
            className="text-2xs flex h-14 w-full cursor-pointer flex-col items-center justify-center gap-1 text-[var(--texto-suave)] transition-colors"
          >
            <Menu aria-hidden="true" className="size-5" />
            Menu
          </button>
        </li>
      </ul>
    </nav>
  );
}
