'use client';

import { PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Marca, Simbolo } from '@/components/marca';
import { MenuDoUsuario } from '@/components/menu-do-usuario';
import { Dica } from '@/components/ui/dica';
import { usarArvore } from '@/hooks/usar-arvore';
import { usarNavegacao } from '@/hooks/usar-navegacao';
import { detectarMac } from '@/lib/atalhos';
import {
  itemAtivo,
  NAVEGACAO_CONFIGURACOES,
  NAVEGACAO_PRINCIPAL,
  NAVEGACAO_SECUNDARIA,
} from '@/lib/rotas';
import { cn } from '@/lib/utils';
import { ArvoreDeConteudos, SecoesCompartilhadas } from './arvore-de-conteudos';
import { ItemLateral } from './item-de-navegacao';

/**
 * Conteudo da navegacao lateral.
 * O mesmo componente serve a barra fixa do computador e a gaveta do celular:
 * a gaveta apenas passa recolhida como falso.
 */
export function ConteudoDaBarra({ recolhida }: { recolhida: boolean }) {
  const caminho = usePathname();
  const { abrirPaleta } = usarNavegacao();
  const { compartilhadas } = usarArvore();
  const teclaModificadora = detectarMac() ? '⌘' : 'Ctrl';

  return (
    <div className="flex h-full flex-col gap-4">
      <div className={cn('flex items-center', recolhida ? 'justify-center' : 'px-1')}>
        <Link href="/" aria-label="Inicio">
          {recolhida ? <Simbolo className="size-6 text-[var(--destaque)]" /> : <Marca />}
        </Link>
      </div>

      <Dica texto="Buscar" atalho={`${teclaModificadora} K`} desativada={!recolhida}>
        <button
          type="button"
          onClick={abrirPaleta}
          aria-label="Abrir a busca de comandos"
          className={cn(
            'flex h-9 cursor-pointer items-center gap-2.5 rounded-md border text-sm transition-colors',
            'text-[var(--texto-tenue)] hover:border-[var(--borda-forte)] hover:text-[var(--texto-suave)]',
            recolhida ? 'w-9 justify-center' : 'w-full px-2.5',
          )}
        >
          <Search aria-hidden="true" className="size-4 shrink-0" />
          {!recolhida ? (
            <>
              <span className="flex-1 text-left">Buscar</span>
              <kbd className="text-2xs rounded-sm border bg-[var(--superficie-suave)] px-1.5 py-0.5 font-mono">
                {teclaModificadora} K
              </kbd>
            </>
          ) : null}
        </button>
      </Dica>

      <nav aria-label="Navegacao principal" className="flex-1 overflow-y-auto">
        <ul className="space-y-0.5">
          {NAVEGACAO_PRINCIPAL.map((item) => (
            <ItemLateral
              key={item.href}
              item={item}
              ativo={itemAtivo(caminho, item)}
              recolhida={recolhida}
            />
          ))}
        </ul>

        {!recolhida ? (
          <div className="space-y-2 pt-6">
            <p className="text-2xs px-2.5 font-medium uppercase tracking-wide text-[var(--texto-tenue)]">
              Meus conteudos
            </p>
            <ArvoreDeConteudos />
          </div>
        ) : null}

        {!recolhida && compartilhadas.length > 0 ? (
          <div className="space-y-2 pt-6">
            <p className="text-2xs px-2.5 font-medium uppercase tracking-wide text-[var(--texto-tenue)]">
              Compartilhadas comigo
            </p>
            <SecoesCompartilhadas />
          </div>
        ) : null}

        <ul className="space-y-0.5 pt-6">
          {[...NAVEGACAO_SECUNDARIA, ...NAVEGACAO_CONFIGURACOES].map((item) => (
            <ItemLateral
              key={item.href}
              item={item}
              ativo={itemAtivo(caminho, item)}
              recolhida={recolhida}
            />
          ))}
        </ul>
      </nav>

      <div className={cn('flex items-center gap-2 border-t pt-3', recolhida && 'justify-center')}>
        <MenuDoUsuario compacto={recolhida} />
      </div>
    </div>
  );
}

/** Barra fixa, visivel a partir de 1024px. */
export function BarraLateral() {
  const { recolhida, alternarRecolhida } = usarNavegacao();
  const teclaModificadora = detectarMac() ? '⌘' : 'Ctrl';

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden border-r bg-[var(--fundo)] transition-[width] lg:flex',
        recolhida ? 'w-16' : 'w-64',
      )}
    >
      <div className={cn('flex-1 py-4', recolhida ? 'px-3' : 'px-4')}>
        <ConteudoDaBarra recolhida={recolhida} />
      </div>

      <button
        type="button"
        onClick={alternarRecolhida}
        aria-label={recolhida ? 'Expandir a barra lateral' : 'Recolher a barra lateral'}
        title={`${recolhida ? 'Expandir' : 'Recolher'} (${teclaModificadora} B)`}
        className="shadow-suave absolute -right-3 top-4 flex size-6 cursor-pointer items-center justify-center rounded-full border bg-[var(--superficie)] text-[var(--texto-tenue)] transition-colors hover:text-[var(--texto)]"
      >
        {recolhida ? (
          <PanelLeftOpen aria-hidden="true" className="size-3.5" />
        ) : (
          <PanelLeftClose aria-hidden="true" className="size-3.5" />
        )}
      </button>
    </aside>
  );
}
