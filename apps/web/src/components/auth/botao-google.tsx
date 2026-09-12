'use client';

import { useEffect, useState } from 'react';
import { googleDisponivel, irParaGoogle } from '@/lib/auth';

/**
 * Botao de login com Google.
 * So aparece quando o servidor confirma que as credenciais estao configuradas,
 * para nao oferecer um caminho que levaria a erro.
 */
export function BotaoGoogle({ acao }: { acao: 'entrar' | 'cadastrar' }) {
  const [habilitado, setHabilitado] = useState(false);

  useEffect(() => {
    void googleDisponivel()
      .then((resposta) => setHabilitado(resposta.habilitado))
      .catch(() => setHabilitado(false));
  }, []);

  if (!habilitado) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={irParaGoogle}
        className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2.5 rounded-md border bg-[var(--superficie)] text-sm font-medium transition-colors hover:bg-[var(--superficie-suave)]"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2-6.6-4.8H1.4v3C3.4 21.3 7.4 24 12 24Z"
          />
          <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6v-3H1.4a12 12 0 0 0 0 10.7l4-3.1Z" />
          <path
            fill="#EA4335"
            d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.6l4 3.1C6.3 6.8 8.9 4.8 12 4.8Z"
          />
        </svg>
        {acao === 'entrar' ? 'Entrar com o Google' : 'Criar conta com o Google'}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--borda)]" />
        <span className="text-xs text-[var(--texto-tenue)]">ou</span>
        <span className="h-px flex-1 bg-[var(--borda)]" />
      </div>
    </>
  );
}
