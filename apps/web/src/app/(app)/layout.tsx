'use client';

import { Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { DialogoDeAtalhos } from '@/components/atalhos/dialogo-de-atalhos';
import { Marca } from '@/components/marca';
import { BarraLateral } from '@/components/navegacao/barra-lateral';
import { Gaveta } from '@/components/navegacao/gaveta';
import { NavegacaoInferior } from '@/components/navegacao/navegacao-inferior';
import { PaletaDeComandos } from '@/components/paleta-de-comandos';
import { Skeleton } from '@/components/ui/skeleton';
import { usarAtalhos } from '@/hooks/usar-atalhos';
import { usarNavegacao } from '@/hooks/usar-navegacao';
import { usarPreferencias } from '@/hooks/usar-preferencias';
import { usarUsuario } from '@/hooks/usar-usuario';
import { cn } from '@/lib/utils';

/**
 * Moldura das telas autenticadas.
 *
 * Tres larguras: barra lateral fixa a partir de 1024px, gaveta entre 640 e
 * 1024, e gaveta mais barra inferior abaixo de 640.
 */
export default function LayoutDoAplicativo({ children }: { children: ReactNode }) {
  const { usuario, carregando } = usarUsuario();
  const { recolhida, abrirGaveta, abrirPaleta } = usarNavegacao();
  const router = useRouter();

  // Aplica tema, escala de fonte e movimento reduzido salvos na conta.
  usarPreferencias();
  usarAtalhos();

  useEffect(() => {
    if (!carregando && !usuario) {
      router.replace('/login');
    }
  }, [carregando, usuario, router]);

  return (
    <div className="min-h-dvh">
      <BarraLateral />
      <Gaveta />

      <div className={cn('transition-[padding]', recolhida ? 'lg:pl-16' : 'lg:pl-64')}>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-[var(--fundo)]/85 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={abrirGaveta}
            aria-label="Abrir o menu de navegacao"
            className="flex size-9 cursor-pointer items-center justify-center rounded-md text-[var(--texto-suave)] transition-colors hover:bg-[var(--superficie-suave)] hover:text-[var(--texto)]"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>

          <Marca className="flex-1" />

          <button
            type="button"
            onClick={abrirPaleta}
            aria-label="Buscar"
            className="flex size-9 cursor-pointer items-center justify-center rounded-md text-[var(--texto-suave)] transition-colors hover:bg-[var(--superficie-suave)] hover:text-[var(--texto)]"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <main
          id="conteudo"
          className="mx-auto max-w-4xl px-5 py-6 pb-24 sm:px-8 sm:pb-10 lg:py-8"
        >
          {carregando ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-9 w-72" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : usuario ? (
            children
          ) : null}
        </main>
      </div>

      <NavegacaoInferior />

      <PaletaDeComandos />
      <DialogoDeAtalhos />
    </div>
  );
}
