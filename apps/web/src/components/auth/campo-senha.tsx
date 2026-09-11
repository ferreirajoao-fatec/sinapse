'use client';

import { medirForcaDaSenha } from '@sinapse/shared';
import { Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';
import { cn } from '@/lib/utils';

const cores = [
  'bg-perigo-500',
  'bg-perigo-500',
  'bg-atencao-500',
  'bg-estudo-500',
  'bg-sucesso-500',
];

/**
 * Campo de senha com alternancia de visibilidade e indicador de forca.
 * O indicador orienta; quem valida de verdade e o schema compartilhado.
 */
export function CampoSenha({
  rotulo,
  valor,
  aoAlterar,
  erro,
  auxilio,
  mostrarForca = false,
  autoComplete = 'current-password',
  autoFocus = false,
}: {
  rotulo: string;
  valor: string;
  aoAlterar: (valor: string) => void;
  erro?: string;
  auxilio?: string;
  mostrarForca?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  const [visivel, setVisivel] = useState(false);
  const id = useId();
  const idErro = `${id}-erro`;
  const idAuxilio = `${id}-auxilio`;

  const forca = medirForcaDaSenha(valor);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {rotulo}
      </label>

      <div className="relative">
        <input
          id={id}
          type={visivel ? 'text' : 'password'}
          value={valor}
          onChange={(evento) => aoAlterar(evento.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={Boolean(erro)}
          aria-describedby={cn(auxilio && idAuxilio, erro && idErro) || undefined}
          className={cn(
            'h-10 w-full rounded-md border bg-[var(--superficie)] pr-10 pl-3 text-sm',
            'placeholder:text-[var(--texto-tenue)] transition-colors focus:border-[var(--destaque)]',
            erro && 'border-perigo-500',
          )}
        />

        <button
          type="button"
          onClick={() => setVisivel((atual) => !atual)}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute top-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-[var(--texto-tenue)] transition-colors hover:text-[var(--texto)]"
        >
          {visivel ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>

      {mostrarForca && valor.length > 0 ? (
        <div className="space-y-1 pt-0.5">
          <div className="flex gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((indice) => (
              <span
                key={indice}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  indice < forca.pontos ? cores[forca.pontos] : 'bg-[var(--superficie-suave)]',
                )}
              />
            ))}
          </div>
          <p className="text-xs text-[var(--texto-suave)]" aria-live="polite">
            Forca da senha: {forca.rotulo}
          </p>
        </div>
      ) : null}

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
}
