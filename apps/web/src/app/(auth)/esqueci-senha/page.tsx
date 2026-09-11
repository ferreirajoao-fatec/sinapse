'use client';

import { forgotPasswordSchema } from '@sinapse/shared';
import { ArrowLeft, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { esqueciSenha } from '@/lib/auth';

export default function PaginaEsqueciSenha() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(undefined);

    const validacao = forgotPasswordSchema.safeParse({ email });

    if (!validacao.success) {
      setErro(validacao.error.issues[0]?.message);
      return;
    }

    setEnviando(true);

    try {
      await esqueciSenha(validacao.data);
      setEnviado(true);
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel enviar o e-mail.');
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-[var(--superficie-suave)] text-[var(--destaque)]">
          <MailCheck aria-hidden="true" className="size-5" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl tracking-tight">Confira sua caixa de entrada</h1>
          <p className="text-sm text-[var(--texto-suave)]">
            Se houver uma conta com <span className="font-medium text-[var(--texto)]">{email}</span>,
            enviamos um link para criar uma nova senha. Ele vale por 30 minutos.
          </p>
        </div>

        <Alert tipo="informacao">
          Nao chegou? Confira o spam, ou tente de novo em alguns minutos.
        </Alert>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--destaque)] underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-serif text-3xl tracking-tight">Esqueceu a senha?</h1>
        <p className="text-sm text-[var(--texto-suave)]">
          Informe seu e-mail e enviamos um link para criar uma nova.
        </p>
      </div>

      <form onSubmit={aoEnviar} className="space-y-4" noValidate>
        <Input
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          erro={erro}
        />

        <Button type="submit" carregando={enviando} className="w-full">
          Enviar link de recuperacao
        </Button>
      </form>

      <p className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--texto-suave)] underline-offset-4 hover:text-[var(--texto)] hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
