'use client';

import { loginSchema } from '@sinapse/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { BotaoGoogle } from '@/components/auth/botao-google';
import { CampoSenha } from '@/components/auth/campo-senha';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { entrar } from '@/lib/auth';

function Formulario() {
  const router = useRouter();
  const parametros = useSearchParams();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(parametros.get('erro'));
  const [enviando, setEnviando] = useState(false);

  const proximo = parametros.get('proximo') ?? '/';
  const contaCriada = parametros.get('conta') === 'criada';
  const senhaRedefinida = parametros.get('senha') === 'redefinida';

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErros({});
    setErroGeral(null);

    const validacao = loginSchema.safeParse({ email, password: senha });

    if (!validacao.success) {
      const campos: Record<string, string> = {};
      for (const problema of validacao.error.issues) {
        const chave = problema.path[0] === 'password' ? 'senha' : 'email';
        campos[chave] ??= problema.message;
      }
      setErros(campos);
      return;
    }

    setEnviando(true);

    try {
      await entrar(validacao.data);
      router.replace(proximo.startsWith('/') ? proximo : '/');
      router.refresh();
    } catch (erro) {
      setErroGeral(erro instanceof ApiError ? erro.message : 'Nao foi possivel entrar.');
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-serif text-3xl tracking-tight">Que bom te ver</h1>
        <p className="text-sm text-[var(--texto-suave)]">
          Entre para continuar de onde parou.
        </p>
      </div>

      {contaCriada ? (
        <Alert tipo="sucesso" titulo="Conta criada">
          Enviamos um e-mail para confirmar seu endereco. Entre para comecar.
        </Alert>
      ) : null}

      {senhaRedefinida ? (
        <Alert tipo="sucesso" titulo="Senha alterada">
          Use a nova senha para entrar.
        </Alert>
      ) : null}

      {erroGeral ? <Alert tipo="erro">{erroGeral}</Alert> : null}

      <BotaoGoogle acao="entrar" />

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
          erro={erros.email}
        />

        <div className="space-y-1.5">
          <CampoSenha
            rotulo="Senha"
            valor={senha}
            aoAlterar={setSenha}
            erro={erros.senha}
            autoComplete="current-password"
          />
          <div className="text-right">
            <Link
              href="/esqueci-senha"
              className="text-xs text-[var(--destaque)] underline-offset-4 hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <Button type="submit" carregando={enviando} className="w-full">
          Entrar
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--texto-suave)]">
        Ainda nao tem conta?{' '}
        <Link
          href="/cadastro"
          className="font-medium text-[var(--destaque)] underline-offset-4 hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}

export default function PaginaDeLogin() {
  return (
    <Suspense fallback={<div className="h-96" aria-hidden="true" />}>
      <Formulario />
    </Suspense>
  );
}
