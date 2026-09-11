import { cn } from '@/lib/utils';

/**
 * Simbolo da marca: um no com tres ramificacoes, a sinapse.
 * Herda a cor do texto do elemento pai.
 */
export function Simbolo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('size-6', className)}
      strokeLinecap="round"
    >
      <path d="M12 12 L12 4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12 L5 17" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12 L19.5 16" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
      <circle cx="12" cy="3.5" r="1.6" fill="currentColor" opacity="0.45" />
      <circle cx="4.5" cy="17.5" r="1.6" fill="currentColor" opacity="0.45" />
      <circle cx="20" cy="16.3" r="1.6" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export function Marca({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Simbolo className="size-6 text-[var(--destaque)]" />
      <span className="font-serif text-xl leading-none tracking-tight">Sinapse</span>
    </span>
  );
}
