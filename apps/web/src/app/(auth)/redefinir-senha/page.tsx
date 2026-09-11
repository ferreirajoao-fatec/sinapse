'use client';

import { resetPasswordSchema } from '@sinapse/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { CampoSenha } from '@/components/auth/campo-senha';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { redefinirSenha } from '@/lib/auth';

function Formulario() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';

  const [senha, setSenha] = useState('');
  const [repeticao, setRepeticao] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErros({});
    setErroGeral(null);

    if (senha !== repeticao) {
      setErros({ repeticao: 'As senhas nao sao iguais.' });
      return;
    }

    const validacao = resetPasswordSchema.safeParse({ token, password: senha });

    if (!validacao.success) {
      const campos: Record<string, string> = {};
      for (const problema of validacao.error.issues) {
        campos[problema.path[0] === 'password' ? 'senha' : 'token'] ??= problema.message;
      }
      setErros(campos);
      return;
    }

    setEnviando(true);

    try {
      await redefinirSenha(validacao.data);
      router.replace('/');
      router.refresh();
    } catch (falha) {
      setErroGeral(
        falha instanceof ApiError ? falha.message : 'Nao foi possivel alterar a senha.',
      );
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-3xl tracking-tight">Link incompleto</h1>
        <Alert tipo="erro" titulo="Nao encontramos o codigo de recuperacao">
          Abra o link exatamente como ele chegou no e-mail, sem cortar nenhuma parte do endereco.
        </Alert>
        <Link
          href="/esqueci-senha"
          className="text-sm text-[var(--destaque)] underline-offset-4 hover:underline"
        >
          Pedir um novo link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-serif text-3xl tracking-tight">Criar nova senha</h1>
        <p className="text-sm text-[var(--texto-suave)]">
          Ao salvar, todas as outras sessoes serao encerradas.
        </p>
      </div>

      {erroGeral ? <Alert tipo="erro">{erroGeral}</Alert> : null}

      <form onSubmit={aoEnviar} className="space-y-4" noValidate>
        <CampoSenha
          rotulo="Nova senha"
          valor={senha}
          aoAlterar={setSenha}
          erro={erros.senha}
          auxilio="Ao menos 8 caracteres, com maiuscula, minuscula e numero."
          autoComplete="new-password"
          autoFocus
          mostrarForca
        />

        <CampoSenha
          rotulo="Repita a nova senha"
          valor={repeticao}
          aoAlterar={setRepeticao}
          erro={erros.repeticao}
          autoComplete="new-password"
        />

        <Button type="submit" carregando={enviando} className="w-full">
          Salvar nova senha
        </Button>
      </form>
    </div>
  );
}

export default function PaginaRedefinirSenha() {
  return (
    <Suspense fallback={<div className="h-96" aria-hidden="true" />}>
      <Formulario />
    </Suspense>
  );
}
