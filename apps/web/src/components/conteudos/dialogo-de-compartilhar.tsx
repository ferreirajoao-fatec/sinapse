'use client';

import {
  adicionarMembroSchema,
  type MembroDaSecao,
  type MembrosDaSecao,
  type PapelNaSecao,
} from '@sinapse/shared';
import { LogOut, UserPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialogo } from '@/components/ui/dialogo';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { usarArvore } from '@/hooks/usar-arvore';
import { usarUsuario } from '@/hooks/usar-usuario';
import { ApiError } from '@/lib/api';
import {
  adicionarMembroNaSecao,
  atualizarMembroDaSecao,
  listarMembrosDaSecao,
  removerMembroDaSecao,
} from '@/lib/conteudos';

const NOMES_DOS_PAPEIS: Record<MembroDaSecao['role'], string> = {
  owner: 'Dono',
  editor: 'Pode editar',
  viewer: 'Pode ler',
};

const CLASSE_DO_SELETOR =
  'h-10 rounded-md border bg-[var(--superficie)] px-3 text-sm transition-colors focus:border-[var(--destaque)] disabled:opacity-50';

/**
 * Quem tem acesso a uma secao.
 *
 * O dono convida pelo e-mail e escolhe, por pessoa, se ela so le ou tambem
 * edita. Os membros veem a mesma lista, sem os controles, e podem sair.
 */
export function DialogoDeCompartilhar({
  aberto,
  aoFechar,
  secaoId,
  secaoNome,
}: {
  aberto: boolean;
  aoFechar: () => void;
  secaoId: string;
  secaoNome: string;
}) {
  const { usuario } = usarUsuario();
  const { recarregar } = usarArvore();
  const router = useRouter();

  const [dados, setDados] = useState<MembrosDaSecao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<PapelNaSecao>('viewer');
  const [convidando, setConvidando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setDados(await listarMembrosDaSecao(secaoId));
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel carregar os membros.');
    }
  }, [secaoId]);

  useEffect(() => {
    if (!aberto) return;

    setDados(null);
    setErro(null);
    setEmail('');
    setPapel('viewer');
    setConfirmandoSaida(false);
    void carregar();
  }, [aberto, carregar]);

  async function convidar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const validacao = adicionarMembroSchema.safeParse({ email, role: papel });

    if (!validacao.success) {
      setErro(validacao.error.issues[0]?.message ?? 'E-mail invalido');
      return;
    }

    setConvidando(true);

    try {
      setDados(await adicionarMembroNaSecao(secaoId, validacao.data));
      setEmail('');
      await recarregar();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel convidar.');
    } finally {
      setConvidando(false);
    }
  }

  async function trocarPapel(membroId: string, novo: PapelNaSecao) {
    setErro(null);
    setOcupado(membroId);

    try {
      setDados(await atualizarMembroDaSecao(secaoId, membroId, { role: novo }));
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel trocar a permissao.');
    } finally {
      setOcupado(null);
    }
  }

  async function remover(membroId: string) {
    setErro(null);
    setOcupado(membroId);

    try {
      await removerMembroDaSecao(secaoId, membroId);
      await carregar();
      await recarregar();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel remover.');
    } finally {
      setOcupado(null);
    }
  }

  async function sair() {
    if (!usuario) return;

    setErro(null);
    setOcupado(usuario.id);

    try {
      await removerMembroDaSecao(secaoId, usuario.id);
      await recarregar();
      aoFechar();
      router.push('/notas');
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel sair da secao.');
      setOcupado(null);
    }
  }

  const podeGerenciar = dados?.podeGerenciar ?? false;

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`Compartilhar "${secaoNome}"`}
      descricao={
        podeGerenciar
          ? 'Quem voce convidar ve todas as paginas desta secao. Escolha se cada pessoa so le ou tambem edita.'
          : 'Pessoas com acesso a esta secao.'
      }
    >
      <div className="space-y-5">
        {erro ? <Alert tipo="erro">{erro}</Alert> : null}

        {podeGerenciar ? (
          <form onSubmit={convidar} className="space-y-3" noValidate>
            <Input
              rotulo="E-mail da pessoa"
              type="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              placeholder="colega@exemplo.com"
              autoComplete="off"
              auxilio="A pessoa precisa ter uma conta no Sinapse."
            />

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <label htmlFor="papel-do-convite" className="block text-sm font-medium">
                  Permissao
                </label>
                <select
                  id="papel-do-convite"
                  value={papel}
                  onChange={(evento) => setPapel(evento.target.value as PapelNaSecao)}
                  className={`w-full ${CLASSE_DO_SELETOR}`}
                >
                  <option value="viewer">{NOMES_DOS_PAPEIS.viewer}</option>
                  <option value="editor">{NOMES_DOS_PAPEIS.editor}</option>
                </select>
              </div>

              <Button type="submit" carregando={convidando}>
                <UserPlus aria-hidden="true" className="size-4" />
                Convidar
              </Button>
            </div>
          </form>
        ) : null}

        <div className="space-y-2">
          <span className="block text-sm font-medium">Pessoas com acesso</span>

          {!dados ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <ul className="divide-y rounded-md border">
              {dados.membros.map((membro) => {
                const eu = membro.userId === usuario?.id;

                return (
                  <li key={membro.userId} className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar membro={membro} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {membro.nome}
                        {eu ? <span className="text-[var(--texto-tenue)]"> (voce)</span> : null}
                      </p>
                      <p className="truncate text-xs text-[var(--texto-suave)]">{membro.email}</p>
                    </div>

                    {podeGerenciar && membro.role !== 'owner' ? (
                      <>
                        <select
                          aria-label={`Permissao de ${membro.nome}`}
                          value={membro.role}
                          disabled={ocupado === membro.userId}
                          onChange={(evento) =>
                            void trocarPapel(membro.userId, evento.target.value as PapelNaSecao)
                          }
                          className={`h-8 text-xs ${CLASSE_DO_SELETOR}`}
                        >
                          <option value="viewer">{NOMES_DOS_PAPEIS.viewer}</option>
                          <option value="editor">{NOMES_DOS_PAPEIS.editor}</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => void remover(membro.userId)}
                          disabled={ocupado === membro.userId}
                          aria-label={`Remover o acesso de ${membro.nome}`}
                          title="Remover acesso"
                          className="hover:text-perigo-500 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--texto-tenue)] transition-colors disabled:opacity-50"
                        >
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-2xs shrink-0 text-[var(--texto-suave)]">
                        {NOMES_DOS_PAPEIS[membro.role]}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {podeGerenciar && dados && dados.membros.length === 1 ? (
            <p className="text-xs text-[var(--texto-tenue)]">
              Ninguem alem de voce tem acesso a esta secao ainda.
            </p>
          ) : null}
        </div>

        {dados && !podeGerenciar ? (
          confirmandoSaida ? (
            <Alert tipo="atencao" titulo="Sair desta secao?">
              <p>Voce deixa de ver as paginas dela. So o dono pode te convidar de novo.</p>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variante="perigo"
                  tamanho="sm"
                  carregando={ocupado === usuario?.id}
                  onClick={() => void sair()}
                >
                  Sair da secao
                </Button>
                <Button
                  type="button"
                  variante="secundario"
                  tamanho="sm"
                  onClick={() => setConfirmandoSaida(false)}
                >
                  Cancelar
                </Button>
              </div>
            </Alert>
          ) : (
            <Button type="button" variante="secundario" onClick={() => setConfirmandoSaida(true)}>
              <LogOut aria-hidden="true" className="size-4" />
              Sair da secao
            </Button>
          )
        ) : null}

        <div className="flex justify-end">
          <Button type="button" variante="secundario" onClick={aoFechar}>
            Fechar
          </Button>
        </div>
      </div>
    </Dialogo>
  );
}

function Avatar({ membro }: { membro: MembroDaSecao }) {
  if (membro.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={membro.avatarUrl}
        alt=""
        className="size-8 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  const iniciais = membro.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');

  return (
    <span
      aria-hidden="true"
      className="bg-marca-50 text-marca-700 dark:bg-marca-900 dark:text-marca-200 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium"
    >
      {iniciais}
    </span>
  );
}
