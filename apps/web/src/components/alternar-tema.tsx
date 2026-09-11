'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const opcoes = [
  { valor: 'light', rotulo: 'Claro', Icone: Sun },
  { valor: 'dark', rotulo: 'Escuro', Icone: Moon },
  { valor: 'system', rotulo: 'Sistema', Icone: Monitor },
] as const;

/**
 * Alterna entre claro, escuro e a preferencia do dispositivo.
 * So renderiza depois de montar, para nao divergir do HTML do servidor.
 */
export function AlternarTema() {
  const { theme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  if (!montado) {
    return <div className="h-9 w-[122px] rounded-md bg-[var(--superficie-suave)]" aria-hidden="true" />;
  }

  return (
    <div
      role="radiogroup"
      aria-label="Aparencia"
      className="inline-flex items-center gap-0.5 rounded-md border bg-[var(--superficie)] p-0.5"
    >
      {opcoes.map(({ valor, rotulo, Icone }) => {
        const ativo = theme === valor;
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-label={rotulo}
            title={rotulo}
            onClick={() => setTheme(valor)}
            className={cn(
              'flex size-8 cursor-pointer items-center justify-center rounded-sm transition-colors',
              ativo
                ? 'bg-[var(--superficie-suave)] text-[var(--texto)]'
                : 'text-[var(--texto-tenue)] hover:text-[var(--texto)]',
            )}
          >
            <Icone aria-hidden="true" className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
