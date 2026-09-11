'use client';

import { LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usarUsuario } from '@/hooks/usar-usuario';
import { cn } from '@/lib/utils';

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Avatar com menu de conta.
 * Fecha ao clicar fora e ao pressionar Escape, e devolve o foco ao botao.
 */
export function MenuDoUsuario({ compacto = false }: { compacto?: boolean }) {
  const { usuario, sair } = usarUsuario();
  const [aberto, setAberto] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(evento: MouseEvent) {
      if (!container.current?.contains(evento.target as Node)) {
        setAberto(false);
      }
    }

    function aoPressionar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        setAberto(false);
        botao.current?.focus();
      }
    }

    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoPressionar);

    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoPressionar);
    };
  }, [aberto]);

  if (!usuario) {
    return null;
  }

  const avatar = (
    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border text-xs font-medium">
      {usuario.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={usuario.avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-[var(--texto-suave)]">{iniciais(usuario.name)}</span>
      )}
    </span>
  );

  return (
    <div ref={container} className="relative w-full">
      <button
        ref={botao}
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Menu da conta"
        title={compacto ? usuario.name : undefined}
        className={cn(
          'flex cursor-pointer items-center gap-2.5 rounded-md transition-colors',
          compacto ? 'size-9 justify-center' : 'w-full px-1.5 py-1.5 hover:bg-[var(--superficie-suave)]',
          aberto && !compacto && 'bg-[var(--superficie-suave)]',
        )}
      >
        {avatar}

        {!compacto ? (
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium">{usuario.name}</span>
            <span className="block truncate text-2xs text-[var(--texto-suave)]">
              {usuario.email}
            </span>
          </span>
        ) : null}
      </button>

      {aberto ? (
        <div
          role="menu"
          className={cn(
            'animate-surgir superficie absolute z-50 w-60 overflow-hidden shadow-elevada',
            compacto ? 'bottom-0 left-[calc(100%+0.5rem)]' : 'bottom-[calc(100%+0.5rem)] left-0',
          )}
        >
          <div className="border-b px-4 py-3">
            <p className="truncate text-sm font-medium">{usuario.name}</p>
            <p className="truncate text-xs text-[var(--texto-suave)]">{usuario.email}</p>
          </div>

          <div className="p-1">
            <Link
              role="menuitem"
              href="/configuracoes/perfil"
              onClick={() => setAberto(false)}
              className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-[var(--superficie-suave)]"
            >
              <User aria-hidden="true" className="size-4 text-[var(--texto-suave)]" />
              Meu perfil
            </Link>

            <Link
              role="menuitem"
              href="/configuracoes/aparencia"
              onClick={() => setAberto(false)}
              className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-[var(--superficie-suave)]"
            >
              <Settings aria-hidden="true" className="size-4 text-[var(--texto-suave)]" />
              Aparencia
            </Link>
          </div>

          <div className="border-t p-1">
            <button
              role="menuitem"
              type="button"
              onClick={() => void sair()}
              className="text-perigo-700 dark:text-perigo-500 flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--superficie-suave)]"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sair da conta
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
