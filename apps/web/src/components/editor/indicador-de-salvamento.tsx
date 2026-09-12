'use client';

import { AlertCircle, Check, Loader2 } from 'lucide-react';
import type { EstadoDoSalvamento } from '@/hooks/usar-autosave';

/**
 * Estado do salvamento, anunciado tambem por leitores de tela.
 * Silencioso quando nao ha nada acontecendo: aviso permanente vira ruido.
 */
export function IndicadorDeSalvamento({
  estado,
  palavras,
  caracteres,
}: {
  estado: EstadoDoSalvamento;
  palavras: number;
  caracteres: number;
}) {
  return (
    <div className="text-2xs flex items-center gap-3 text-[var(--texto-tenue)]">
      <span aria-live="polite" className="flex min-w-24 items-center gap-1.5">
        {estado === 'salvando' ? (
          <>
            <Loader2 aria-hidden="true" className="size-3 animate-spin" />
            Salvando...
          </>
        ) : estado === 'salvo' ? (
          <>
            <Check aria-hidden="true" className="text-sucesso-500 size-3" />
            Salvo
          </>
        ) : estado === 'erro' ? (
          <>
            <AlertCircle aria-hidden="true" className="text-perigo-500 size-3" />
            Nao salvou. Tentando de novo...
          </>
        ) : estado === 'pendente' ? (
          <span className="text-[var(--texto-tenue)]">Alteracoes nao salvas</span>
        ) : null}
      </span>

      <span>
        {palavras} {palavras === 1 ? 'palavra' : 'palavras'}
      </span>
      <span className="hidden sm:inline">
        {caracteres} {caracteres === 1 ? 'caractere' : 'caracteres'}
      </span>
    </div>
  );
}
