'use client';

import { registerSchema } from '@sinapse/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { BotaoGoogle } from '@/components/auth/botao-google';
import { CampoSenha } from '@/components/auth/campo-senha';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { cadastrar } from '@/lib/auth';

export default function PaginaDeCadastro() {
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErros({});
    setErroGeral(null);

    const validacao = registerSchema.safeParse({ name: nome, email, password: senha });

    if (!validacao.success) {
      const campos: Record<string, string> = {};
      for (const problema of validacao.error.issues) {
        const chave =
          problema.path[0] === 'password'
            ? 'senha'
            : problema.path[0] === 'name'
              ? 'nome'
              : 'email';
        campos[chave] ??= problema.message;
      }
      setErros(campos);
      return;
    }

    setEnviando(true);

    try {
      await cadastrar(validacao.data);
      router.replace('/');
      router.refresh();
    } catch (erro) {
      if (erro instanceof ApiError && erro.statusCode === 409) {
        setErros({ email: 'Ja existe uma conta com este e-mail.' });
      } else {
        setErroGeral(
          erro instanceof ApiError ? erro.message : 'Nao foi possivel criar a conta.',
        );
      }
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-serif text-3xl tracking-tight">Criar sua conta</h1>
        <p className="text-sm text-[var(--texto-suave)]">
          Leva menos de um minuto. Depois voce ja pode escrever sua primeira anotacao.
        </p>
      </div>

      {erroGeral ? <Alert tipo="erro">{erroGeral}</Alert> : null}

      <BotaoGoogle acao="cadastrar" />

      <form onSubmit={aoEnviar} className="space-y-4" noValidate>
        <Input
          rotulo="Nome"
          autoComplete="name"
          autoFocus
          placeholder="Como devemos te chamar"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          erro={erros.nome}
        />

        <Input
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          erro={erros.email}
        />

        <CampoSenha
          rotulo="Senha"
          valor={senha}
          aoAlterar={setSenha}
          erro={erros.senha}
          auxilio="Ao menos 8 caracteres, com maiuscula, minuscula e numero."
          autoComplete="new-password"
          mostrarForca
        />

        <Button type="submit" carregando={enviando} className="w-full">
          Criar conta
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--texto-suave)]">
        Ja tem conta?{' '}
        <Link
          href="/login"
          className="font-medium text-[var(--destaque)] underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
