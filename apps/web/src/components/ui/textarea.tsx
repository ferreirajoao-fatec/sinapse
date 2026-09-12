import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rotulo: string;
  auxilio?: string;
  erro?: string;
}

/** Campo de texto multilinha, mesma convencao visual do Input. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rotulo, auxilio, erro, id, rows = 4, ...props },
  ref,
) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idAuxilio = `${idCampo}-auxilio`;
  const idErro = `${idCampo}-erro`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={idCampo} className="block text-sm font-medium">
        {rotulo}
      </label>
      <textarea
        ref={ref}
        id={idCampo}
        rows={rows}
        aria-invalid={Boolean(erro)}
        aria-describedby={cn(auxilio && idAuxilio, erro && idErro) || undefined}
        className={cn(
          'w-full resize-y rounded-md border bg-[var(--superficie)] px-3 py-2 text-sm',
          'placeholder:text-[var(--texto-tenue)]',
          'transition-colors focus:border-[var(--destaque)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          erro && 'border-perigo-500',
          className,
        )}
        {...props}
      />
      {auxilio && !erro ? (
        <p id={idAuxilio} className="text-xs text-[var(--texto-suave)]">
          {auxilio}
        </p>
      ) : null}
      {erro ? (
        <p id={idErro} role="alert" className="text-perigo-700 dark:text-perigo-500 text-xs">
          {erro}
        </p>
      ) : null}
    </div>
  );
});
