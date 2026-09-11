import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlternarTema } from '@/components/alternar-tema';
import { Marca } from '@/components/marca';

/**
 * Moldura das telas de autenticacao.
 * Coluna unica e centrada: nada disputa atencao com o formulario.
 */
export default function LayoutDeAutenticacao({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-6 py-6 sm:px-8">
      <header className="flex items-center justify-between">
        <Link href="/login" aria-label="Sinapse">
          <Marca />
        </Link>
        <AlternarTema />
      </header>

      <main id="conteudo" className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <footer className="text-center text-xs text-[var(--texto-tenue)]">
        Ao continuar voce concorda com os termos de uso e a politica de privacidade.
      </footer>
    </div>
  );
}
