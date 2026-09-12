'use client';

import {
  atualizarTarefaSchema,
  criarTarefaSchema,
  TASK_PRIORITIES,
  type GrupoNaArvore,
  type TarefaCompleta,
  type TaskPriority,
} from '@sinapse/shared';
import { Check, FileText, Paperclip, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialogo } from '@/components/ui/dialogo';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { usarArvore } from '@/hooks/usar-arvore';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { DialogoDeConfirmacao } from './dialogo-de-confirmacao';
import {
  adicionarItemDeChecklist,
  anexosDisponiveis,
  atualizarItemDeChecklist,
  atualizarTarefa,
  buscarTarefa,
  confirmarUpload,
  criarTarefa,
  criarUrlDeUpload,
  excluirTarefa,
  removerAnexo,
  removerItemDeChecklist,
  subirArquivo,
  urlDeDownloadDoAnexo,
} from '@/lib/tarefas';

const NOMES_DE_PRIORIDADE: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

interface PaginaAchatada {
  id: string;
  title: string;
  caminho: string;
}

function achatarPaginas(grupos: GrupoNaArvore[]): PaginaAchatada[] {
  const resultado: PaginaAchatada[] = [];

  function visitar(paginas: GrupoNaArvore['secoes'][number]['paginas'], caminho: string) {
    for (const pagina of paginas) {
      resultado.push({ id: pagina.id, title: pagina.title, caminho });
      visitar(pagina.subpaginas, caminho);
    }
  }

  for (const grupo of grupos) {
    for (const secao of grupo.secoes) {
      visitar(secao.paginas, `${grupo.name} / ${secao.name}`);
    }
  }

  return resultado;
}

function paraDataDoCampo(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

function formatarBytes(valor: string): string {
  const bytes = Number(valor);
  if (!Number.isFinite(bytes)) return valor;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DialogoDeTarefa({
  aberto,
  aoFechar,
  aoSalvar,
  tarefaId,
  colunaId,
}: {
  aberto: boolean;
  aoFechar: () => void;
  /** Chamado apos qualquer alteracao, para o quadro/lista recarregar. */
  aoSalvar: () => Promise<void>;
  /** Presente edita a tarefa existente; ausente cria uma nova. */
  tarefaId?: string;
  /** Coluna de destino ao criar. Ignorado ao editar. */
  colunaId?: string;
}) {
  const { grupos } = usarArvore();
  const paginas = useMemo(() => achatarPaginas(grupos), [grupos]);

  const [tarefa, setTarefa] = useState<TarefaCompleta | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<TaskPriority>('medium');
  const [prazo, setPrazo] = useState('');
  const [paginaSelecionada, setPaginaSelecionada] = useState<PaginaAchatada | null>(null);
  const [buscaPagina, setBuscaPagina] = useState('');

  const [novoItemChecklist, setNovoItemChecklist] = useState('');
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [anexosHabilitados, setAnexosHabilitados] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!aberto) return;

    anexosDisponiveis()
      .then(({ habilitado }) => setAnexosHabilitados(habilitado))
      .catch(() => setAnexosHabilitados(false));
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;

    setErro(null);
    setBuscaPagina('');

    if (!tarefaId) {
      setTarefa(null);
      setTitulo('');
      setDescricao('');
      setPrioridade('medium');
      setPrazo('');
      setPaginaSelecionada(null);
      return;
    }

    setCarregandoDetalhe(true);
    buscarTarefa(tarefaId)
      .then((completa) => {
        setTarefa(completa);
        setTitulo(completa.title);
        setDescricao(completa.description ?? '');
        setPrioridade(completa.priority);
        setPrazo(paraDataDoCampo(completa.dueDate));
        setPaginaSelecionada(
          completa.pagina
            ? { id: completa.pagina.id, title: completa.pagina.title, caminho: '' }
            : null,
        );
      })
      .catch((falha) => {
        setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel carregar a tarefa.');
      })
      .finally(() => setCarregandoDetalhe(false));
  }, [aberto, tarefaId]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const dueDate = prazo ? new Date(`${prazo}T00:00:00.000Z`).toISOString() : null;
    const pageId = paginaSelecionada?.id ?? null;

    if (tarefa) {
      const validacao = atualizarTarefaSchema.safeParse({
        title: titulo,
        description: descricao || null,
        priority: prioridade,
        dueDate,
        pageId,
      });

      if (!validacao.success) {
        setErro(validacao.error.issues[0]?.message ?? 'Dados invalidos');
        return;
      }

      setSalvando(true);
      try {
        await atualizarTarefa(tarefa.id, validacao.data);
        await aoSalvar();
        aoFechar();
      } catch (falha) {
        setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel salvar.');
      } finally {
        setSalvando(false);
      }
      return;
    }

    if (!colunaId) return;

    const validacao = criarTarefaSchema.safeParse({
      columnId: colunaId,
      title: titulo,
      description: descricao || null,
      priority: prioridade,
      dueDate,
      pageId,
    });

    if (!validacao.success) {
      setErro(validacao.error.issues[0]?.message ?? 'Dados invalidos');
      return;
    }

    setSalvando(true);
    try {
      await criarTarefa(validacao.data);
      await aoSalvar();
      aoFechar();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function adicionarChecklist() {
    if (!tarefa || !novoItemChecklist.trim()) return;

    try {
      const atualizada = await adicionarItemDeChecklist(tarefa.id, {
        label: novoItemChecklist.trim(),
      });
      setTarefa(atualizada);
      setNovoItemChecklist('');
      await aoSalvar();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel adicionar o item.');
    }
  }

  async function alternarChecklist(itemId: string, done: boolean) {
    if (!tarefa) return;

    try {
      const atualizada = await atualizarItemDeChecklist(tarefa.id, itemId, { done });
      setTarefa(atualizada);
      await aoSalvar();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel atualizar o item.');
    }
  }

  async function removerChecklist(itemId: string) {
    if (!tarefa) return;

    try {
      await removerItemDeChecklist(tarefa.id, itemId);
      setTarefa((atual) =>
        atual
          ? {
              ...atual,
              checklist: atual.checklist.filter((item) => item.id !== itemId),
              totalDeChecklist: atual.totalDeChecklist - 1,
            }
          : atual,
      );
      await aoSalvar();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel remover o item.');
    }
  }

  async function enviarArquivo(arquivo: File) {
    if (!tarefa) return;

    setErro(null);
    setEnviandoArquivo(true);

    try {
      const { url, storageKey } = await criarUrlDeUpload(tarefa.id, {
        fileName: arquivo.name,
        mimeType: arquivo.type || 'application/octet-stream',
        sizeBytes: arquivo.size,
      });

      await subirArquivo(url, arquivo);

      const atualizada = await confirmarUpload(tarefa.id, {
        fileName: arquivo.name,
        mimeType: arquivo.type || 'application/octet-stream',
        sizeBytes: arquivo.size,
        storageKey,
      });

      setTarefa(atualizada);
      await aoSalvar();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel enviar o arquivo.');
    } finally {
      setEnviandoArquivo(false);
      if (inputArquivo.current) inputArquivo.current.value = '';
    }
  }

  async function baixarAnexo(anexoId: string) {
    if (!tarefa) return;

    try {
      const { url } = await urlDeDownloadDoAnexo(tarefa.id, anexoId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel baixar o anexo.');
    }
  }

  async function removerAnexoDaTarefa(anexoId: string) {
    if (!tarefa) return;

    try {
      await removerAnexo(tarefa.id, anexoId);
      setTarefa((atual) =>
        atual
          ? {
              ...atual,
              anexos: atual.anexos.filter((anexo) => anexo.id !== anexoId),
              totalDeAnexos: atual.totalDeAnexos - 1,
            }
          : atual,
      );
      await aoSalvar();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel remover o anexo.');
    }
  }

  const resultadosDeBusca = buscaPagina.trim()
    ? paginas
        .filter((pagina) => pagina.title.toLowerCase().includes(buscaPagina.trim().toLowerCase()))
        .slice(0, 8)
    : [];

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={tarefa ? 'Editar tarefa' : 'Nova tarefa'}
      descricao="Prioridade, prazo, checklist e vinculo com uma pagina."
      larguraMaxima="max-w-xl"
    >
      {carregandoDetalhe ? (
        <p className="text-sm text-[var(--texto-suave)]">Carregando...</p>
      ) : (
        <form onSubmit={enviar} className="space-y-4" noValidate>
          {erro ? <Alert tipo="erro">{erro}</Alert> : null}

          <Input
            rotulo="Titulo"
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            placeholder="Revisar resumo de Banco de Dados"
            autoComplete="off"
            maxLength={200}
          />

          <Textarea
            rotulo="Descricao"
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            placeholder="Detalhes opcionais"
            maxLength={4000}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="block text-sm font-medium">Prioridade</span>
              <div role="radiogroup" aria-label="Prioridade" className="flex flex-wrap gap-1.5">
                {TASK_PRIORITIES.map((valor) => {
                  const ativo = prioridade === valor;

                  return (
                    <button
                      key={valor}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      onClick={() => setPrioridade(valor)}
                      className={cn(
                        'flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors',
                        ativo
                          ? 'border-[var(--destaque)] bg-[var(--destaque-suave)] text-[var(--destaque)]'
                          : 'border-[var(--borda)] text-[var(--texto-suave)] hover:border-[var(--borda-forte)]',
                      )}
                    >
                      {ativo ? <Check aria-hidden="true" className="size-3" /> : null}
                      {NOMES_DE_PRIORIDADE[valor]}
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              rotulo="Prazo"
              type="date"
              value={prazo}
              onChange={(evento) => setPrazo(evento.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-sm font-medium">Pagina vinculada</span>
            {paginaSelecionada ? (
              <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText
                    aria-hidden="true"
                    className="size-4 shrink-0 text-[var(--texto-tenue)]"
                  />
                  <span className="truncate">{paginaSelecionada.title}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPaginaSelecionada(null)}
                  aria-label="Remover vinculo com a pagina"
                  className="cursor-pointer text-[var(--texto-tenue)] hover:text-[var(--texto)]"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  aria-label="Buscar pagina"
                  value={buscaPagina}
                  onChange={(evento) => setBuscaPagina(evento.target.value)}
                  placeholder="Buscar uma pagina para vincular"
                  autoComplete="off"
                  className="h-10 w-full rounded-md border bg-[var(--superficie)] px-3 text-sm transition-colors placeholder:text-[var(--texto-tenue)] focus:border-[var(--destaque)]"
                />
                {resultadosDeBusca.length > 0 ? (
                  <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border p-1">
                    {resultadosDeBusca.map((pagina) => (
                      <li key={pagina.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setPaginaSelecionada(pagina);
                            setBuscaPagina('');
                          }}
                          className="flex w-full cursor-pointer flex-col rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--superficie-suave)]"
                        >
                          <span className="truncate text-sm">{pagina.title}</span>
                          <span className="text-2xs truncate text-[var(--texto-tenue)]">
                            {pagina.caminho}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </div>

          {tarefa ? (
            <>
              <div className="space-y-1.5">
                <span className="block text-sm font-medium">
                  Checklist{' '}
                  {tarefa.totalDeChecklist > 0
                    ? `(${tarefa.checklistConcluidos}/${tarefa.totalDeChecklist})`
                    : ''}
                </span>
                <ul className="space-y-1.5">
                  {tarefa.checklist.map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <Checkbox
                        marcado={item.done}
                        aoAlternar={(valor) => void alternarChecklist(item.id, valor)}
                        rotulo={item.label}
                      />
                      <span
                        className={cn(
                          'flex-1 text-sm',
                          item.done && 'text-[var(--texto-tenue)] line-through',
                        )}
                      >
                        {item.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => void removerChecklist(item.id)}
                        aria-label={`Remover item ${item.label}`}
                        className="hover:text-perigo-500 cursor-pointer text-[var(--texto-tenue)]"
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <input
                    value={novoItemChecklist}
                    onChange={(evento) => setNovoItemChecklist(evento.target.value)}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Enter') {
                        evento.preventDefault();
                        void adicionarChecklist();
                      }
                    }}
                    placeholder="Adicionar item"
                    maxLength={200}
                    className="h-9 flex-1 rounded-md border bg-[var(--superficie)] px-3 text-sm placeholder:text-[var(--texto-tenue)]"
                  />
                  <Button
                    type="button"
                    variante="secundario"
                    tamanho="sm"
                    onClick={() => void adicionarChecklist()}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>

              {anexosHabilitados ? (
                <div className="space-y-1.5">
                  <span className="block text-sm font-medium">
                    Anexos {tarefa.totalDeAnexos > 0 ? `(${tarefa.totalDeAnexos})` : ''}
                  </span>
                  <ul className="space-y-1.5">
                    {tarefa.anexos.map((anexo) => (
                      <li
                        key={anexo.id}
                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                      >
                        <button
                          type="button"
                          onClick={() => void baixarAnexo(anexo.id)}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                        >
                          <Paperclip
                            aria-hidden="true"
                            className="size-4 shrink-0 text-[var(--texto-tenue)]"
                          />
                          <span className="truncate">{anexo.fileName}</span>
                          <span className="text-2xs shrink-0 text-[var(--texto-tenue)]">
                            {formatarBytes(anexo.sizeBytes)}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void removerAnexoDaTarefa(anexo.id)}
                          aria-label={`Remover anexo ${anexo.fileName}`}
                          className="hover:text-perigo-500 shrink-0 cursor-pointer text-[var(--texto-tenue)]"
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <input
                    ref={inputArquivo}
                    type="file"
                    className="hidden"
                    onChange={(evento) => {
                      const arquivo = evento.target.files?.[0];
                      if (arquivo) void enviarArquivo(arquivo);
                    }}
                  />
                  <Button
                    type="button"
                    variante="secundario"
                    tamanho="sm"
                    carregando={enviandoArquivo}
                    onClick={() => inputArquivo.current?.click()}
                  >
                    <Paperclip aria-hidden="true" className="size-3.5" />
                    Anexar arquivo
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-[var(--texto-tenue)]">
              Salve a tarefa para adicionar checklist e anexos.
            </p>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            {tarefa ? (
              <Button
                type="button"
                variante="discreto"
                tamanho="sm"
                onClick={() => setExcluindo(true)}
                className="text-perigo-500"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                Mover para a lixeira
              </Button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <Button type="button" variante="secundario" onClick={aoFechar}>
                Fechar
              </Button>
              <Button type="submit" carregando={salvando}>
                {tarefa ? 'Salvar' : 'Criar tarefa'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {tarefa ? (
        <DialogoDeConfirmacao
          aberto={excluindo}
          aoFechar={() => setExcluindo(false)}
          titulo={`Mover "${tarefa.title}" para a lixeira?`}
          descricao="Voce pode restaurar a tarefa depois, pela Lixeira."
          rotuloDeConfirmacao="Mover para a lixeira"
          aoConfirmar={async () => {
            await excluirTarefa(tarefa.id);
            await aoSalvar();
            aoFechar();
          }}
        />
      ) : null}
    </Dialogo>
  );
}
