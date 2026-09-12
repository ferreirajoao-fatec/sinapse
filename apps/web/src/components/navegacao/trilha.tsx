'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROTULOS_DAS_ROTAS } from '@/lib/rotas';

interface Degrau {
  rotulo: string;
  href: string;
}

function rotular(trecho: string): string {
  return ROTULOS_DAS_ROTAS[trecho] ?? trecho.charAt(0).toUpperCase() + trecho.slice(1);
}

/**
 * Trilha de navegacao.
 *
 * A partir da Etapa 3, as paginas de anotacoes passarao os proprios degraus
 * pela propriedade degraus, porque grupo e secao nao aparecem na URL. Ate la,
 * a trilha e montada a partir do endereco.
 */
export function Trilha({ degraus }: { degraus?: Degrau[] }) {
  const caminho = usePathname();

  const automaticos: Degrau[] = caminho
    .split('/')
    .filter(Boolean)
    .map((trecho, indice, todos) => ({
      rotulo: rotular(trecho),
      href: `/${todos.slice(0, indice + 1).join('/')}`,
    }));

  const itens = degraus ?? automaticos;

  if (itens.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Trilha de navegacao">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-[var(--texto-suave)]">
        <li>
          <Link
            href="/"
            className="underline-offset-4 transition-colors hover:text-[var(--texto)] hover:underline"
          >
            Inicio
          </Link>
        </li>

        {itens.map((degrau, indice) => {
          const ultimo = indice === itens.length - 1;

          return (
            <li key={degrau.href} className="flex items-center gap-1">
              <ChevronRight aria-hidden="true" className="size-3.5 text-[var(--texto-tenue)]" />

              {ultimo ? (
                <span aria-current="page" className="font-medium text-[var(--texto)]">
                  {degrau.rotulo}
                </span>
              ) : (
                <Link
                  href={degrau.href}
                  className="underline-offset-4 transition-colors hover:text-[var(--texto)] hover:underline"
                >
                  {degrau.rotulo}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
