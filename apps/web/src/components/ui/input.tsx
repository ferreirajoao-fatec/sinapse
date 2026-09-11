import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  auxilio?: string;
  erro?: string;
}

/**
 * Campo de texto com rotulo, texto de apoio e mensagem de erro.
 * O rotulo e sempre visivel e ligado ao campo por id, nunca apenas placeholder.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, rotulo, auxilio, erro, id, ...props },
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
      <input
        ref={ref}
        id={idCampo}
        aria-invalid={Boolean(erro)}
        aria-describedby={cn(auxilio && idAuxilio, erro && idErro) || undefined}
        className={cn(
          'h-10 w-full rounded-md border bg-[var(--superficie)] px-3 text-sm',
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
