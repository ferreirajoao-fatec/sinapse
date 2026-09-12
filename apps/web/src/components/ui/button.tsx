'use client';

import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variante = 'primario' | 'secundario' | 'discreto' | 'perigo' | 'link';
type Tamanho = 'sm' | 'md' | 'lg' | 'icone';

const variantes: Record<Variante, string> = {
  primario:
    'bg-[var(--destaque)] text-[var(--contraste-destaque)] hover:bg-[var(--destaque-forte)] shadow-suave',
  secundario:
    'bg-[var(--superficie)] text-[var(--texto)] border border-[var(--borda)] hover:bg-[var(--superficie-suave)] hover:border-[var(--borda-forte)]',
  discreto:
    'text-[var(--texto-suave)] hover:bg-[var(--superficie-suave)] hover:text-[var(--texto)]',
  perigo: 'bg-perigo-500 text-white hover:bg-perigo-700 shadow-suave',
  link: 'text-[var(--destaque)] underline-offset-4 hover:underline p-0 h-auto',
};

const tamanhos: Record<Tamanho, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icone: 'h-10 w-10 p-0',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
}

/**
 * Botao base do design system.
 * O estado de carregamento desabilita o clique e anuncia a mudanca por aria-busy.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variante = 'primario',
    tamanho = 'md',
    carregando = false,
    disabled,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-busy={carregando}
      disabled={disabled || carregando}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-md font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        variantes[variante],
        variante === 'link' ? '' : tamanhos[tamanho],
        className,
      )}
      {...props}
    >
      {carregando && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
      {children}
    </button>
  );
});
