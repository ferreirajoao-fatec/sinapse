import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tom = 'neutro' | 'marca' | 'estudo' | 'sucesso' | 'atencao' | 'perigo';

const tons: Record<Tom, string> = {
  neutro: 'bg-[var(--superficie-suave)] text-[var(--texto-suave)]',
  marca: 'bg-marca-50 text-marca-700 dark:bg-marca-900 dark:text-marca-200',
  estudo: 'bg-estudo-100 text-estudo-700 dark:bg-estudo-700 dark:text-estudo-100',
  sucesso: 'bg-sucesso-100 text-sucesso-700 dark:bg-sucesso-700 dark:text-sucesso-100',
  atencao: 'bg-atencao-100 text-atencao-700 dark:bg-atencao-700 dark:text-atencao-100',
  perigo: 'bg-perigo-100 text-perigo-700 dark:bg-perigo-700 dark:text-perigo-100',
};

export function Badge({
  tom = 'neutro',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tom?: Tom }) {
  return (
    <span
      className={cn(
        'text-2xs inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium',
        tons[tom],
        className,
      )}
      {...props}
    />
  );
}
