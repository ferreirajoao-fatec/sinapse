'use client';

import type { ConteudoDaPagina, EtiquetaResumida, PaginaCompleta } from '@sinapse/shared';
import {
  ArrowRightLeft,
  BookOpen,
  ChevronRight,
  Copy,
  FilePlus2,
  Focus,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Star,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DialogoDeConfirmacao } from '@/components/conteudos/dialogo-de-confirmacao';
import { DialogoDeMover } from '@/components/conteudos/dialogo-de-mover';
import { MenuSuspenso, type AcaoDoMenu } from '@/components/conteudos/menu-suspenso';
import { SeletorDeEtiquetas } from '@/components/conteudos/seletor-de-etiquetas';
import { SeletorDeIcone } from '@/components/conteudos/seletor-de-icone';
import { Editor } from '@/components/editor/editor';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialogo } from '@/components/ui/dialogo';
import { Skeleton } from '@/components/ui/skeleton';
import { usarArvore } from '@/hooks/usar-arvore';
import { formatarBytes, subirArquivo } from '@/lib/anexos';
import { ApiError } from '@/lib/api';
import {
  anexosDeNotasDisponiveis,
  atualizarPagina,
  buscarPagina,
  confirmarUploadDaPagina,
  criarPagina,
  criarUrlDeUploadDaPagina,
  definirEtiquetasDaPagina,
  duplicarPagina,
  excluirPagina,
  removerAnexoDaPagina,
  urlDeDownloadDoAnexoDaPagina,
} from '@/lib/conteudos';
import { corDeConteudo, iconeDeConteudo } from '@/lib/icones-de-conteudo';
import { cn } from '@/lib/utils';

export default function PaginaDaAnotacao() {
  const parametros = useParams<{ paginaId: string }>();
  const paginaId = parametros.paginaId;
  const router = useRouter();
  const { recarregar, abrirCaminho } = usarArvore();

  const [pagina, setPagina] = useState<PaginaCompleta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [estatisticas, setEstatisticas] = useState({ palavras: 0, caracteres: 0 });
  const [modoFoco, setModoFoco] = useState(false);
  const [modoLeitura, setModoLeitura] = useState(false);
  const [dialogo, setDialogo] = useState<'icone' | 'etiquetas' | 'mover' | 'excluir' | null>(null);

  const [anexosHabilitados, setAnexosHabilitados] = useState(false);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [erroDeAnexo, setErroDeAnexo] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const temporizadorDoTitulo = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    anexosDeNotasDisponiveis()
      .then(({ habilitado }) => setAnexosHabilitados(habilitado))
      .catch(() => setAnexosHabilitados(false));
  }, []);

  useEffect(() => {
    let cancelado = false;

    setPagina(null);
    setErro(null);
    setErroDeAnexo(null);
    setModoFoco(false);
    setModoLeitura(false);

    void buscarPagina(paginaId)
      .then((dados) => {
        if (cancelado) return;
        setPagina(dados);
        setTitulo(dados.title);
        setEstatisticas({ palavras: dados.wordCount, caracteres: dados.contentText.length });
        // Abre o caminho na barra lateral ao entrar direto pela URL.
        abrirCaminho([dados.caminho.grupoId, dados.caminho.secaoId]);
      })
      .catch((falha) => {
        if (cancelado) return;
        setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel abrir esta pagina.');
      });

    return () => {
      cancelado = true;
    };
  }, [paginaId, abrirCaminho]);

  /** O titulo tem espera propria: ele tambem alimenta a barra lateral. */
  const salvarTitulo = useCallback(
    (novo: string) => {
      if (temporizadorDoTitulo.current) clearTimeout(temporizadorDoTitulo.current);

      temporizadorDoTitulo.current = setTimeout(async () => {
        try {
          const atualizada = await atualizarPagina(paginaId, { title: novo });
          setPagina((atual) => (atual ? { ...atual, title: atualizada.title } : atualizada));
          await recarregar();
        } catch {
          // O texto digitado permanece; a proxima alteracao reenvia.
        }
      }, 800);
    },
    [paginaId, recarregar],
  );

  useEffect(() => {
    return () => {
      if (temporizadorDoTitulo.current) clearTimeout(temporizadorDoTitulo.current);
    };
  }, []);

  /** Salvamento do conteudo, chamado pelo editor. */
  const salvarConteudo = useCallback(
    async (conteudo: ConteudoDaPagina) => {
      const atualizada = await atualizarPagina(paginaId, { content: conteudo });
      setPagina((atual) => (atual ? { ...atual, wordCount: atualizada.wordCount } : atualizada));
    },
    [paginaId],
  );

  // Esc sai do modo de foco.
  useEffect(() => {
    if (!modoFoco) return;

    function aoPressionar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setModoFoco(false);
    }

    window.addEventListener('keydown', aoPressionar);
    return () => window.removeEventListener('keydown', aoPressionar);
  }, [modoFoco]);

  if (erro) {
    return (
      <div className="space-y-4">
        <Alert tipo="erro" titulo="Pagina indisponivel">
          {erro}
        </Alert>
        <Link
          href="/notas"
          className="text-sm text-[var(--destaque)] underline-offset-4 hover:underline"
        >
          Voltar para as anotacoes
        </Link>
      </div>
    );
  }

  if (!pagina) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const Icone = iconeDeConteudo(pagina.icon);

  async function alternarFavorito() {
    if (!pagina) return;
    const atualizada = await atualizarPagina(pagina.id, { isFavorite: !pagina.isFavorite });
    setPagina(atualizada);
    await recarregar();
  }

  async function enviarArquivo(arquivo: File) {
    if (!pagina) return;

    setErroDeAnexo(null);
    setEnviandoArquivo(true);

    try {
      const { url, storageKey } = await criarUrlDeUploadDaPagina(pagina.id, {
        fileName: arquivo.name,
        mimeType: arquivo.type || 'application/octet-stream',
        sizeBytes: arquivo.size,
      });

      await subirArquivo(url, arquivo);

      const atualizada = await confirmarUploadDaPagina(pagina.id, {
        fileName: arquivo.name,
        mimeType: arquivo.type || 'application/octet-stream',
        sizeBytes: arquivo.size,
        storageKey,
      });

      setPagina(atualizada);
    } catch (falha) {
      setErroDeAnexo(
        falha instanceof ApiError ? falha.message : 'Nao foi possivel enviar o arquivo.',
      );
    } finally {
      setEnviandoArquivo(false);
      if (inputArquivo.current) inputArquivo.current.value = '';
    }
  }

  async function baixarAnexo(anexoId: string) {
    if (!pagina) return;

    try {
      const { url } = await urlDeDownloadDoAnexoDaPagina(pagina.id, anexoId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (falha) {
      setErroDeAnexo(
        falha instanceof ApiError ? falha.message : 'Nao foi possivel baixar o anexo.',
      );
    }
  }

  async function removerAnexoDaAnotacao(anexoId: string) {
    if (!pagina) return;

    try {
      await removerAnexoDaPagina(pagina.id, anexoId);
      setPagina((atual) =>
        atual ? { ...atual, anexos: atual.anexos.filter((anexo) => anexo.id !== anexoId) } : atual,
      );
    } catch (falha) {
      setErroDeAnexo(
        falha instanceof ApiError ? falha.message : 'Nao foi possivel remover o anexo.',
      );
    }
  }

  const acoes: AcaoDoMenu[] = [
    {
      id: 'leitura',
      rotulo: modoLeitura ? 'Voltar a editar' : 'Modo de leitura',
      Icone: modoLeitura ? Pencil : BookOpen,
      aoEscolher: () => setModoLeitura((atual) => !atual),
    },
    {
      id: 'foco',
      rotulo: 'Modo de foco',
      Icone: Focus,
      aoEscolher: () => setModoFoco(true),
    },
    {
      id: 'subpagina',
      rotulo: 'Nova subpagina',
      Icone: FilePlus2,
      separadorAntes: true,
      aoEscolher: async () => {
        const nova = await criarPagina({
          sectionId: pagina.sectionId,
          parentPageId: pagina.id,
          title: 'Sem titulo',
        });
        await recarregar();
        router.push(`/notas/${nova.id}`);
      },
    },
    {
      id: 'mover',
      rotulo: 'Mover para outra secao',
      Icone: ArrowRightLeft,
      aoEscolher: () => setDialogo('mover'),
    },
    {
      id: 'duplicar',
      rotulo: 'Duplicar pagina',
      Icone: Copy,
      aoEscolher: async () => {
        const copia = await duplicarPagina(pagina.id);
        await recarregar();
        router.push(`/notas/${copia.id}`);
      },
    },
    {
      id: 'excluir',
      rotulo: 'Mover para a lixeira',
      Icone: Trash2,
      perigosa: true,
      separadorAntes: true,
      aoEscolher: () => setDialogo('excluir'),
    },
  ];

  const editor = (
    <Editor
      key={pagina.id}
      paginaId={pagina.id}
      conteudoInicial={pagina.content}
      somenteLeitura={modoLeitura}
      modoFoco={modoFoco}
      aoSalvar={salvarConteudo}
      aoMudarEstatisticas={setEstatisticas}
      aoAnexosAtualizados={(anexos) => setPagina((atual) => (atual ? { ...atual, anexos } : atual))}
    />
  );

  // No modo de foco, o editor ocupa a tela inteira sobre o restante.
  if (modoFoco) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--fundo)]">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="flex items-center justify-between pb-6">
            <span className="text-2xs text-[var(--texto-tenue)]">
              Modo de foco - pressione Esc para sair
            </span>
            <button
              type="button"
              onClick={() => setModoFoco(false)}
              className="cursor-pointer rounded-md border px-3 py-1 text-xs transition-colors hover:bg-[var(--superficie-suave)]"
            >
              Sair do foco
            </button>
          </div>

          <h1 className="pb-4 font-serif text-3xl tracking-tight">{pagina.title}</h1>
          {editor}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-5', modoLeitura && 'modo-de-leitura')}>
      <nav aria-label="Trilha de navegacao">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-[var(--texto-suave)]">
          <li>
            <Link
              href="/notas"
              className="underline-offset-4 hover:text-[var(--texto)] hover:underline"
            >
              Anotacoes
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight aria-hidden="true" className="size-3.5 text-[var(--texto-tenue)]" />
            {pagina.caminho.grupo}
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight aria-hidden="true" className="size-3.5 text-[var(--texto-tenue)]" />
            {pagina.caminho.secao}
          </li>
        </ol>
      </nav>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setDialogo('icone')}
            aria-label="Trocar o icone da pagina"
            title="Trocar o icone"
            className="mt-1 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--texto-suave)] transition-colors hover:bg-[var(--superficie-suave)]"
          >
            <Icone aria-hidden="true" className="size-6" />
          </button>

          {modoLeitura ? (
            <h1 className="min-w-0 flex-1 font-serif text-3xl tracking-tight">{pagina.title}</h1>
          ) : (
            <input
              type="text"
              value={titulo}
              onChange={(evento) => {
                setTitulo(evento.target.value);
                salvarTitulo(evento.target.value);
              }}
              placeholder="Sem titulo"
              aria-label="Titulo da pagina"
              maxLength={200}
              className="min-w-0 flex-1 bg-transparent font-serif text-3xl tracking-tight outline-none placeholder:text-[var(--texto-tenue)]"
            />
          )}

          <div className="mt-1 flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void alternarFavorito()}
              aria-label={pagina.isFavorite ? 'Remover dos favoritos' : 'Marcar como favorita'}
              aria-pressed={pagina.isFavorite}
              className={cn(
                'flex size-9 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-[var(--superficie-suave)]',
                pagina.isFavorite ? 'text-atencao-500' : 'text-[var(--texto-tenue)]',
              )}
            >
              <Star
                aria-hidden="true"
                className={cn('size-4', pagina.isFavorite && 'fill-current')}
              />
            </button>

            <MenuSuspenso
              rotulo="Acoes da pagina"
              acoes={acoes}
              gatilho={() => (
                <span className="flex size-9 items-center justify-center rounded-md text-[var(--texto-tenue)] transition-colors hover:bg-[var(--superficie-suave)] hover:text-[var(--texto)]">
                  <MoreHorizontal aria-hidden="true" className="size-4" />
                </span>
              )}
            />
          </div>
        </div>

        <div className="pl-13 flex flex-wrap items-center gap-2">
          {pagina.tags.map((etiqueta) => (
            <span
              key={etiqueta.id}
              className={cn(
                'text-2xs rounded-full px-2.5 py-0.5 font-medium',
                corDeConteudo(etiqueta.color).fundo,
                corDeConteudo(etiqueta.color).texto,
              )}
            >
              {etiqueta.name}
            </span>
          ))}

          {!modoLeitura ? (
            <button
              type="button"
              onClick={() => setDialogo('etiquetas')}
              className="text-2xs cursor-pointer rounded-full border border-dashed px-2.5 py-0.5 text-[var(--texto-tenue)] transition-colors hover:text-[var(--texto-suave)]"
            >
              {pagina.tags.length === 0 ? 'Adicionar etiquetas' : 'Editar etiquetas'}
            </button>
          ) : null}

          {modoLeitura ? (
            <span className="text-2xs ml-auto text-[var(--texto-tenue)]">
              Modo de leitura - {estatisticas.palavras} palavras
            </span>
          ) : null}
        </div>
      </div>

      {anexosHabilitados && (pagina.anexos.length > 0 || !modoLeitura) ? (
        <div className="pl-13 space-y-1.5">
          <span className="block text-sm font-medium">
            Anexos {pagina.anexos.length > 0 ? `(${pagina.anexos.length})` : ''}
          </span>

          {erroDeAnexo ? <Alert tipo="erro">{erroDeAnexo}</Alert> : null}

          {pagina.anexos.length > 0 ? (
            <ul className="max-w-md space-y-1.5">
              {pagina.anexos.map((anexo) => (
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
                  {!modoLeitura ? (
                    <button
                      type="button"
                      onClick={() => void removerAnexoDaAnotacao(anexo.id)}
                      aria-label={`Remover anexo ${anexo.fileName}`}
                      className="hover:text-perigo-500 shrink-0 cursor-pointer text-[var(--texto-tenue)]"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {!modoLeitura ? (
            <>
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
            </>
          ) : null}
        </div>
      ) : null}

      {editor}

      {/* --- Dialogos --- */}

      <Dialogo
        aberto={dialogo === 'icone'}
        aoFechar={() => setDialogo(null)}
        titulo="Icone da pagina"
        descricao="Ajuda a reconhecer a pagina na barra lateral."
      >
        <SeletorDeIcone
          valor={pagina.icon}
          aoEscolher={async (chave) => {
            const atualizada = await atualizarPagina(pagina.id, { icon: chave });
            setPagina(atualizada);
            await recarregar();
            setDialogo(null);
          }}
        />
      </Dialogo>

      <Dialogo
        aberto={dialogo === 'etiquetas'}
        aoFechar={() => setDialogo(null)}
        titulo="Etiquetas"
        descricao="Etiquetas cruzam grupos e ajudam a reunir assuntos parecidos."
      >
        <SeletorDeEtiquetas
          selecionadas={pagina.tags}
          aoAlterar={async (etiquetas: EtiquetaResumida[]) => {
            const atualizada = await definirEtiquetasDaPagina(pagina.id, {
              tagIds: etiquetas.map((etiqueta) => etiqueta.id),
            });
            setPagina(atualizada);
          }}
        />
      </Dialogo>

      {dialogo === 'mover' ? (
        <DialogoDeMover
          aberto
          aoFechar={() => setDialogo(null)}
          pagina={pagina}
          aoMover={setPagina}
        />
      ) : null}

      <DialogoDeConfirmacao
        aberto={dialogo === 'excluir'}
        aoFechar={() => setDialogo(null)}
        titulo={`Mover "${pagina.title}" para a lixeira?`}
        descricao="Voce pode restaurar depois, na lixeira."
        rotuloDeConfirmacao="Mover para a lixeira"
        aoConfirmar={async () => {
          await excluirPagina(pagina.id);
          await recarregar();
          router.push('/notas');
        }}
      />
    </div>
  );
}
