'use client';

import { alterarSenhaSchema, atualizarPerfilSchema } from '@sinapse/shared';
import { Download, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { CampoSenha } from '@/components/auth/campo-senha';
import { AvisoDeVerificacao } from '@/components/aviso-de-verificacao';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usarUsuario } from '@/hooks/usar-usuario';
import { ApiError } from '@/lib/api';
import { alterarSenha, atualizarPerfil, excluirConta, urlDeExportacao } from '@/lib/auth';
import { formatarBytes } from '@/lib/utils';

export default function PaginaDePerfil() {
  const { usuario } = usarUsuario();
  const router = useRouter();

  if (!usuario) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl tracking-tight">Meu perfil</h1>
        <p className="text-sm text-[var(--texto-suave)]">
          Dados da conta, senha e privacidade.
        </p>
      </div>

      <AvisoDeVerificacao />

      <SecaoDadosPessoais
        nomeAtual={usuario.name}
        avatarAtual={usuario.avatarUrl}
        emailAtual={usuario.email}
        emailVerificado={usuario.emailVerified}
      />

      <SecaoSenha temSenha={usuario.hasPassword} />

      <Card>
        <CardHeader
          titulo="Armazenamento"
          descricao="Espaco usado pelos seus arquivos"
          acao={
            <Badge>
              {formatarBytes(usuario.storageUsedBytes)} de {formatarBytes(usuario.storageQuotaBytes)}
            </Badge>
          }
        />
        <CardContent>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-[var(--superficie-suave)]"
            role="progressbar"
            aria-valuenow={Math.round(
              (usuario.storageUsedBytes / usuario.storageQuotaBytes) * 100,
            )}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Uso do armazenamento"
          >
            <div
              className="h-full bg-[var(--destaque)] transition-all"
              style={{
                width: `${Math.min(100, (usuario.storageUsedBytes / usuario.storageQuotaBytes) * 100)}%`,
              }}
            />
          </div>
          <p className="pt-2 text-xs text-[var(--texto-suave)]">
            O envio de arquivos comeca na Etapa 5.
          </p>
        </CardContent>
      </Card>

      <SecaoPrivacidade
        aoExcluir={() => {
          router.replace('/login');
          router.refresh();
        }}
        exigeSenha={usuario.hasPassword}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------

function SecaoDadosPessoais({
  nomeAtual,
  avatarAtual,
  emailAtual,
  emailVerificado,
}: {
  nomeAtual: string;
  avatarAtual: string | null;
  emailAtual: string;
  emailVerificado: boolean;
}) {
  const { definirUsuario } = usarUsuario();
  const [nome, setNome] = useState(nomeAtual);
  const [avatar, setAvatar] = useState(avatarAtual ?? '');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErros({});
    setSucesso(false);

    const validacao = atualizarPerfilSchema.safeParse({
      name: nome,
      avatarUrl: avatar.trim() === '' ? null : avatar.trim(),
    });

    if (!validacao.success) {
      const campos: Record<string, string> = {};
      for (const problema of validacao.error.issues) {
        campos[problema.path[0] === 'avatarUrl' ? 'avatar' : 'nome'] ??= problema.message;
      }
      setErros(campos);
      return;
    }

    setSalvando(true);

    try {
      definirUsuario(await atualizarPerfil(validacao.data));
      setSucesso(true);
    } catch (falha) {
      setErros({
        geral: falha instanceof ApiError ? falha.message : 'Nao foi possivel salvar.',
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <CardHeader titulo="Dados pessoais" descricao="Como voce aparece no sistema" />
      <CardContent>
        <form onSubmit={enviar} className="space-y-4" noValidate>
          {erros.geral ? <Alert tipo="erro">{erros.geral}</Alert> : null}
          {sucesso ? <Alert tipo="sucesso">Perfil atualizado.</Alert> : null}

          <Input
            rotulo="Nome"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            erro={erros.nome}
            autoComplete="name"
          />

          <Input
            rotulo="Endereco da foto de perfil"
            value={avatar}
            onChange={(evento) => setAvatar(evento.target.value)}
            erro={erros.avatar}
            placeholder="https://..."
            auxilio="O envio de imagem direto do computador chega na Etapa 5. Por enquanto, informe um endereco."
          />

          <div className="space-y-1.5">
            <span className="block text-sm font-medium">E-mail</span>
            <div className="flex h-10 items-center justify-between gap-3 rounded-md border bg-[var(--superficie-suave)] px-3">
              <span className="truncate text-sm text-[var(--texto-suave)]">{emailAtual}</span>
              <Badge tom={emailVerificado ? 'sucesso' : 'atencao'}>
                {emailVerificado ? 'Confirmado' : 'Pendente'}
              </Badge>
            </div>
            <p className="text-xs text-[var(--texto-suave)]">
              A troca de e-mail exige confirmar os dois enderecos e chega junto das notificacoes.
            </p>
          </div>

          <Button type="submit" carregando={salvando}>
            Salvar alteracoes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------

function SecaoSenha({ temSenha }: { temSenha: boolean }) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [repeticao, setRepeticao] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  if (!temSenha) {
    return (
      <Card>
        <CardHeader titulo="Senha" descricao="Sua conta usa o login com Google" />
        <CardContent>
          <Alert tipo="informacao" titulo="Voce ainda nao definiu uma senha">
            Use a opcao &quot;Esqueci minha senha&quot; na tela de login para criar a primeira. Depois
            voce podera entrar das duas formas.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErros({});
    setSucesso(false);

    if (nova !== repeticao) {
      setErros({ repeticao: 'As senhas nao sao iguais.' });
      return;
    }

    const validacao = alterarSenhaSchema.safeParse({ senhaAtual: atual, novaSenha: nova });

    if (!validacao.success) {
      const campos: Record<string, string> = {};
      for (const problema of validacao.error.issues) {
        campos[problema.path[0] === 'novaSenha' ? 'nova' : 'atual'] ??= problema.message;
      }
      setErros(campos);
      return;
    }

    setSalvando(true);

    try {
      await alterarSenha(validacao.data);
      setSucesso(true);
      setAtual('');
      setNova('');
      setRepeticao('');
    } catch (falha) {
      setErros({ geral: falha instanceof ApiError ? falha.message : 'Nao foi possivel alterar.' });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <CardHeader
        titulo="Senha"
        descricao="Alterar a senha encerra as sessoes nos outros dispositivos"
      />
      <CardContent>
        <form onSubmit={enviar} className="space-y-4" noValidate>
          {erros.geral ? <Alert tipo="erro">{erros.geral}</Alert> : null}
          {sucesso ? <Alert tipo="sucesso">Senha alterada.</Alert> : null}

          <CampoSenha
            rotulo="Senha atual"
            valor={atual}
            aoAlterar={setAtual}
            erro={erros.atual}
            autoComplete="current-password"
          />

          <CampoSenha
            rotulo="Nova senha"
            valor={nova}
            aoAlterar={setNova}
            erro={erros.nova}
            autoComplete="new-password"
            mostrarForca
          />

          <CampoSenha
            rotulo="Repita a nova senha"
            valor={repeticao}
            aoAlterar={setRepeticao}
            erro={erros.repeticao}
            autoComplete="new-password"
          />

          <Button type="submit" carregando={salvando}>
            Alterar senha
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------

function SecaoPrivacidade({
  aoExcluir,
  exigeSenha,
}: {
  aoExcluir: () => void;
  exigeSenha: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [texto, setTexto] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function confirmar() {
    setErro(null);

    if (texto !== 'EXCLUIR') {
      setErro('Digite EXCLUIR exatamente como esta escrito.');
      return;
    }

    setExcluindo(true);

    try {
      await excluirConta({ confirmacao: 'EXCLUIR', senha: exigeSenha ? senha : undefined });
      aoExcluir();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel excluir a conta.');
      setExcluindo(false);
    }
  }

  return (
    <Card>
      <CardHeader titulo="Privacidade" descricao="Seus dados pertencem a voce" />
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-[var(--superficie-suave)] px-4 py-3">
          <div>
            <p className="text-sm font-medium">Exportar meus dados</p>
            <p className="text-xs text-[var(--texto-suave)]">
              Baixa um arquivo JSON com tudo o que guardamos sobre voce.
            </p>
          </div>
          <a
            href={urlDeExportacao()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-[var(--superficie)] px-3 text-sm font-medium transition-colors hover:bg-[var(--superficie-suave)]"
          >
            <Download aria-hidden="true" className="size-3.5" />
            Exportar
          </a>
        </div>

        <div className="border-perigo-500/30 space-y-3 rounded-md border p-4">
          <div className="flex items-start gap-2.5">
            <ShieldAlert
              aria-hidden="true"
              className="text-perigo-700 dark:text-perigo-500 mt-0.5 size-4 shrink-0"
            />
            <div>
              <p className="text-sm font-medium">Excluir minha conta</p>
              <p className="text-xs text-[var(--texto-suave)]">
                Remove definitivamente sua conta, anotacoes, arquivos e tarefas. Nao ha como
                desfazer.
              </p>
            </div>
          </div>

          {!confirmando ? (
            <Button variante="perigo" tamanho="sm" onClick={() => setConfirmando(true)}>
              Quero excluir minha conta
            </Button>
          ) : (
            <div className="space-y-3">
              {erro ? <Alert tipo="erro">{erro}</Alert> : null}

              <Input
                rotulo="Digite EXCLUIR para confirmar"
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
                placeholder="EXCLUIR"
                autoComplete="off"
              />

              {exigeSenha ? (
                <CampoSenha rotulo="Sua senha" valor={senha} aoAlterar={setSenha} />
              ) : null}

              <div className="flex gap-2">
                <Button
                  variante="perigo"
                  tamanho="sm"
                  carregando={excluindo}
                  onClick={() => void confirmar()}
                >
                  Excluir definitivamente
                </Button>
                <Button
                  variante="secundario"
                  tamanho="sm"
                  onClick={() => {
                    setConfirmando(false);
                    setTexto('');
                    setSenha('');
                    setErro(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
