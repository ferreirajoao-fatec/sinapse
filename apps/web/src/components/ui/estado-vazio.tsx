import type { ReactNode } from 'react';

/**
 * Tela vazia. Nunca apenas informa que nao ha nada:
 * sempre convida a proxima acao.
 */
export function EstadoVazio({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone: ReactNode;
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-[var(--superficie-suave)] text-[var(--texto-suave)]">
        {icone}
      </div>
      <div className="space-y-1">
        <p className="font-medium">{titulo}</p>
        <p className="mx-auto max-w-sm text-sm text-[var(--texto-suave)]">{descricao}</p>
      </div>
      {acao}
    </div>
  );
}
