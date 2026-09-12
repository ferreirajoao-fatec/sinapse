'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import { verificarEmail } from '@/lib/auth';

type Estado =
  | { situacao: 'verificando' }
  | { situacao: 'ok'; email: string }
  | { situacao: 'erro'; mensagem: string };

function Verificacao() {
  const token = useSearchParams().get('token');
  const [estado, setEstado] = useState<Estado>({ situacao: 'verificando' });
  const jaTentou = useRef(false);

  useEffect(() => {
    if (jaTentou.current) return;
    jaTentou.current = true;

    if (!token) {
      setEstado({ situacao: 'erro', mensagem: 'O link nao contem o codigo de verificacao.' });
      return;
    }

    void verificarEmail(token)
      .then((resposta) => setEstado({ situacao: 'ok', email: resposta.email }))
      .catch((falha) =>
        setEstado({
          situacao: 'erro',
          mensagem:
            falha instanceof ApiError ? falha.message : 'Nao foi possivel confirmar o e-mail.',
        }),
      );
  }, [token]);

  if (estado.situacao === 'verificando') {
    return (
      <div className="space-y-4 text-center">
        <Loader2
          aria-hidden="true"
          className="mx-auto size-6 animate-spin text-[var(--destaque)]"
        />
        <p className="text-sm text-[var(--texto-suave)]">Confirmando seu e-mail...</p>
      </div>
    );
  }

  if (estado.situacao === 'ok') {
    return (
      <div className="space-y-6 text-center">
        <div className="bg-sucesso-100 text-sucesso-700 mx-auto flex size-11 items-center justify-center rounded-full">
          <CheckCircle2 aria-hidden="true" className="size-5" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl tracking-tight">E-mail confirmado</h1>
          <p className="text-sm text-[var(--texto-suave)]">
            <span className="font-medium text-[var(--texto)]">{estado.email}</span> esta verificado.
            Sua conta ja tem acesso a todos os recursos.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--destaque)] px-5 text-sm font-medium text-[var(--contraste-destaque)] transition-colors hover:bg-[var(--destaque-forte)]"
        >
          Ir para o inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div className="bg-perigo-100 text-perigo-700 mx-auto flex size-11 items-center justify-center rounded-full">
        <XCircle aria-hidden="true" className="size-5" />
      </div>

      <div className="space-y-2">
        <h1 className="font-serif text-2xl tracking-tight">Nao deu para confirmar</h1>
        <p className="text-sm text-[var(--texto-suave)]">{estado.mensagem}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href="/"
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--destaque)] px-5 text-sm font-medium text-[var(--contraste-destaque)] transition-colors hover:bg-[var(--destaque-forte)]"
        >
          Ir para o inicio
        </Link>
        <Link
          href="/login"
          className="text-sm text-[var(--texto-suave)] underline-offset-4 hover:text-[var(--texto)] hover:underline"
        >
          Entrar em outra conta
        </Link>
      </div>
    </div>
  );
}

export default function PaginaVerificarEmail() {
  return (
    <Suspense fallback={<div className="h-64" aria-hidden="true" />}>
      <Verificacao />
    </Suspense>
  );
}
