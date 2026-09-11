import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Placeholder de carregamento. Sempre acompanhado de aria-hidden. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulsar rounded-md bg-[var(--superficie-suave)]', className)}
      {...props}
    />
  );
}
