'use client';

import type { AnexoDePagina, ConteudoDaPagina } from '@sinapse/shared';
import { EditorContent, useEditor, type Editor as InstanciaDoEditor } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import type { EstadoDaColaboracao, SessaoDeColaboracao } from '@/hooks/usar-colaboracao';
import { usarEstadoDoSalvamento } from '@/hooks/usar-estado-do-salvamento';
import { ApiError } from '@/lib/api';
import { detectarMac } from '@/lib/atalhos';
import { subirArquivo, urlDaImagemDaPagina } from '@/lib/anexos';
import { confirmarUploadDaPagina, criarUrlDeUploadDaPagina } from '@/lib/conteudos';
import { cn } from '@/lib/utils';
import { BarraDaTabela } from './barra-da-tabela';
import { BarraDeFerramentas } from './barra-de-ferramentas';
import { montarExtensoes } from './configuracao';
import { MenuDeComandos, type ReferenciaDoMenu } from './menu-de-comandos';
import { MenuFlutuante } from './menu-flutuante';
import { MenuFlutuanteImagem } from './menu-flutuante-imagem';
import { COMANDOS, normalizar } from './comandos';
import { IndicadorDeSalvamento } from './indicador-de-salvamento';
import { estadoDaBusca } from './extensoes/localizar-e-substituir';
import { PainelDeBusca, type PedidoDeBusca } from './painel-de-busca';

interface PosicaoDoMenu {
  x: number;
  y: number;
  termo: string;
  inicio: number;
}

const ATRIBUTOS_DO_CONTEUDO = {
  class: 'conteudo-do-editor focus:outline-none',
  role: 'textbox',
  'aria-multiline': 'true',
  'aria-label': 'Conteudo da anotacao',
};

/**
 * Editor de anotacoes, com edicao em tempo real.
 *
 * O documento vive num Y.Doc sincronizado pelo servidor de colaboracao: todos
 * que estao na pagina veem as alteracoes e os cursores uns dos outros, e o
 * servidor grava no banco. Nada de HTML no meio do caminho: o banco continua
 * guardando o JSON ProseMirror, que a busca e a IA leem por blocos.
 */
export function Editor({
  paginaId,
  conteudoInicial,
  colaboracao,
  usuario,
  somenteLeitura = false,
  modoFoco = false,
  aoMudarEstatisticas,
  aoAnexosAtualizados,
  pedidoDeBusca = 0,
}: {
  paginaId: string;
  /** Conteudo salvo, mostrado so enquanto a conexao em tempo real nao abre. */
  conteudoInicial: ConteudoDaPagina;
  colaboracao: {
    sessao: SessaoDeColaboracao | null;
    estado: EstadoDaColaboracao;
    pendentes: number;
  };
  usuario: { name: string; color: string };
  somenteLeitura?: boolean;
  modoFoco?: boolean;
  aoMudarEstatisticas?: (dados: { palavras: number; caracteres: number }) => void;
  /** Chamado apos subir uma imagem, para a lista de Anexos da pagina refletir o novo arquivo. */
  aoAnexosAtualizados?: (anexos: AnexoDePagina[]) => void;
  /** Incrementado pelo menu da anotacao para abrir o Localizar e substituir. */
  pedidoDeBusca?: number;
}) {
  const { sessao, estado: estadoDaConexao, pendentes } = colaboracao;
  const [jaSincronizou, setJaSincronizou] = useState(false);

  // Depois da primeira sincronizacao o editor ao vivo fica na tela mesmo se a
  // rede cair: o Yjs guarda o que for digitado e envia ao reconectar.
  useEffect(() => {
    if (estadoDaConexao === 'sincronizado') setJaSincronizou(true);
  }, [estadoDaConexao]);

  useEffect(() => {
    setJaSincronizou(false);
  }, [sessao]);

  if (!sessao || !jaSincronizou) {
    const falhou = estadoDaConexao === 'desconectado' || estadoDaConexao === 'sem-acesso';

    if (!falhou) {
      return <EsqueletoDoEditor />;
    }

    return (
      <div className="space-y-3">
        <Alert tipo="atencao" titulo="Edicao em tempo real indisponivel">
          {estadoDaConexao === 'sem-acesso'
            ? 'Voce nao tem mais acesso para editar esta pagina.'
            : 'Nao foi possivel conectar agora. Mostrando a ultima versao salva; tentando de novo...'}
        </Alert>
        <VisualizacaoEstatica conteudo={conteudoInicial} />
      </div>
    );
  }

  return (
    <EditorAoVivo
      key={paginaId}
      paginaId={paginaId}
      sessao={sessao}
      estadoDaConexao={estadoDaConexao}
      pendentes={pendentes}
      usuario={usuario}
      somenteLeitura={somenteLeitura}
      modoFoco={modoFoco}
      aoMudarEstatisticas={aoMudarEstatisticas}
      aoAnexosAtualizados={aoAnexosAtualizados}
      pedidoDeBusca={pedidoDeBusca}
    />
  );
}

function EsqueletoDoEditor() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="animate-pulsar h-9 rounded-md bg-[var(--superficie-suave)]" />
      <div className="animate-pulsar h-64 rounded-md bg-[var(--superficie-suave)]" />
    </div>
  );
}

/** Ultima versao salva, so para leitura, enquanto nao ha conexao. */
function VisualizacaoEstatica({ conteudo }: { conteudo: ConteudoDaPagina }) {
  const editor = useEditor({
    extensions: montarExtensoes(),
    content: conteudo,
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: ATRIBUTOS_DO_CONTEUDO },
  });

  return editor ? <EditorContent editor={editor} className="pt-4" /> : <EsqueletoDoEditor />;
}

function EditorAoVivo({
  paginaId,
  sessao,
  estadoDaConexao,
  pendentes,
  usuario,
  somenteLeitura,
  modoFoco,
  aoMudarEstatisticas,
  aoAnexosAtualizados,
  pedidoDeBusca,
}: {
  paginaId: string;
  sessao: SessaoDeColaboracao;
  estadoDaConexao: EstadoDaColaboracao;
  pendentes: number;
  usuario: { name: string; color: string };
  somenteLeitura: boolean;
  modoFoco: boolean;
  aoMudarEstatisticas?: (dados: { palavras: number; caracteres: number }) => void;
  aoAnexosAtualizados?: (anexos: AnexoDePagina[]) => void;
  pedidoDeBusca: number;
}) {
  const [menu, setMenu] = useState<PosicaoDoMenu | null>(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [erroDeImagem, setErroDeImagem] = useState<string | null>(null);
  const [busca, setBusca] = useState<PedidoDeBusca | null>(null);
  const referenciaDoMenu = useRef<ReferenciaDoMenu>(null);
  const inputDeImagem = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLDivElement>(null);

  const estado = usarEstadoDoSalvamento(estadoDaConexao, pendentes);

  const editor = useEditor(
    {
      extensions: montarExtensoes(undefined, { ...sessao, usuario }),
      editable: !somenteLeitura,
      // Necessario no Next: sem isso o HTML do servidor difere do cliente.
      immediatelyRender: false,
      editorProps: { attributes: ATRIBUTOS_DO_CONTEUDO },
      onUpdate: ({ editor: instancia }) => {
        if (!somenteLeitura) atualizarMenu(instancia);
      },
      onSelectionUpdate: ({ editor: instancia }) => atualizarMenu(instancia),
    },
    // Um editor por sessao: trocar de pagina cria outro Y.Doc.
    [sessao],
  );

  /**
   * Detecta o "/" digitado no inicio de um bloco vazio ou apos um espaco.
   *
   * Fizemos a deteccao aqui, e nao pela extensao Suggestion com Tippy, para
   * desenhar a lista com os componentes do design system e manter o mesmo
   * comportamento de teclado da paleta Ctrl+K.
   */
  const atualizarMenu = useCallback((instancia: InstanciaDoEditor) => {
    const { state } = instancia;
    const { $from, empty } = state.selection;

    if (!empty || instancia.isActive('codeBlock')) {
      setMenu(null);
      return;
    }

    const textoAntes = $from.parent.textBetween(0, $from.parentOffset, '\n', '\0');
    const encontrado = /(?:^|\s)\/([^/\s]*)$/.exec(textoAntes);

    if (!encontrado) {
      setMenu(null);
      return;
    }

    const termo = encontrado[1] ?? '';
    const posicaoDaBarra = $from.pos - termo.length - 1;
    const coordenadas = instancia.view.coordsAtPos(posicaoDaBarra);
    const caixa = container.current?.getBoundingClientRect();

    setMenu({
      termo,
      inicio: posicaoDaBarra,
      x: coordenadas.left - (caixa?.left ?? 0),
      y: coordenadas.bottom - (caixa?.top ?? 0) + 6,
    });
  }, []);

  const enviarImagem = useCallback(
    async (arquivo: File) => {
      if (!editor) return;

      setErroDeImagem(null);
      setEnviandoImagem(true);

      try {
        const { url, storageKey } = await criarUrlDeUploadDaPagina(paginaId, {
          fileName: arquivo.name,
          mimeType: arquivo.type || 'application/octet-stream',
          sizeBytes: arquivo.size,
        });

        await subirArquivo(url, arquivo);

        const atualizada = await confirmarUploadDaPagina(paginaId, {
          fileName: arquivo.name,
          mimeType: arquivo.type || 'application/octet-stream',
          sizeBytes: arquivo.size,
          storageKey,
        });

        aoAnexosAtualizados?.(atualizada.anexos);

        const novoAnexo = atualizada.anexos[atualizada.anexos.length - 1];
        if (novoAnexo) {
          editor
            .chain()
            .focus()
            .setImage({ src: urlDaImagemDaPagina(paginaId, novoAnexo.id) })
            .run();
        }
      } catch (falha) {
        setErroDeImagem(
          falha instanceof ApiError ? falha.message : 'Nao foi possivel enviar a imagem.',
        );
      } finally {
        setEnviandoImagem(false);
        if (inputDeImagem.current) inputDeImagem.current.value = '';
      }
    },
    [editor, paginaId, aoAnexosAtualizados],
  );

  const escolherComando = useCallback(
    (comandoId: string) => {
      if (!editor || !menu) return;

      const comando = COMANDOS.find((item) => item.id === comandoId);
      if (!comando) return;

      const range = { from: menu.inicio, to: editor.state.selection.from };
      setMenu(null);
      comando.executar({ editor, range });
    },
    [editor, menu],
  );

  /** Abre (ou refoca) o Localizar, usando a selecao como termo inicial. */
  const abrirBusca = useCallback(() => {
    if (!editor) return;

    const { from, to, $from, $to } = editor.state.selection;
    const selecionado =
      from !== to && $from.sameParent($to) ? editor.state.doc.textBetween(from, to) : '';

    setMenu(null);
    setBusca((atual) => ({
      id: (atual?.id ?? 0) + 1,
      termo: selecionado.length > 0 && selecionado.length <= 200 ? selecionado : null,
    }));
  }, [editor]);

  /** Fecha o painel e devolve o foco ao editor, com o cursor no resultado atual. */
  const fecharBusca = useCallback(() => {
    setBusca(null);
    if (!editor || editor.isDestroyed) return;

    const estado = estadoDaBusca(editor.state);
    const ocorrencia = estado.ocorrencias[estado.atual];
    if (ocorrencia) {
      editor.chain().focus().setTextSelection(ocorrencia).run();
    } else {
      editor.commands.focus();
    }
  }, [editor]);

  // Abertura pelo menu da anotacao (inclusive no celular).
  useEffect(() => {
    if (pedidoDeBusca > 0) abrirBusca();
    // So reage a novos pedidos, nao a troca da funcao.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoDeBusca]);

  // Teclado do menu de comandos e atalho de gravacao imediata.
  useEffect(() => {
    if (!editor) return;

    const ehMac = detectarMac();

    function aoPressionar(evento: KeyboardEvent) {
      if (!editor) return;

      // Ctrl+F (Cmd+F no Mac) abre a busca da anotacao so quando o foco esta no
      // editor ou no painel; fora dele, fica a busca do navegador.
      const modificador = ehMac
        ? evento.metaKey && !evento.ctrlKey
        : evento.ctrlKey && !evento.metaKey;
      if (
        modificador &&
        !evento.altKey &&
        !evento.shiftKey &&
        evento.key.toLowerCase() === 'f' &&
        focoNoEditor(evento.target) &&
        !haModalAberto()
      ) {
        evento.preventDefault();
        evento.stopPropagation();
        abrirBusca();
        return;
      }

      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 's') {
        // Ja e salvo a cada alteracao; so evita a janela "salvar como" do navegador.
        evento.preventDefault();
        return;
      }

      // Esc dentro do texto tambem fecha a busca, se o menu "/" nao estiver aberto.
      if (
        !menu &&
        busca &&
        evento.key === 'Escape' &&
        evento.target instanceof Node &&
        editor.view.dom.contains(evento.target)
      ) {
        evento.preventDefault();
        evento.stopPropagation();
        fecharBusca();
        return;
      }

      if (!menu) return;

      if (evento.key === 'Escape') {
        evento.preventDefault();
        setMenu(null);
        return;
      }

      if (referenciaDoMenu.current?.aoPressionar(evento)) {
        evento.preventDefault();
      }
    }

    /**
     * O foco pode estar no texto, na barra de ferramentas ou no painel. Em modo
     * de leitura o texto nao recebe foco, entao vale tambem uma selecao feita
     * com o mouse dentro da anotacao.
     */
    function focoNoEditor(alvo: EventTarget | null): boolean {
      if (!editor) return false;
      if (alvo instanceof Node && container.current?.contains(alvo)) return true;
      if (alvo !== document.body) return false;
      const ancora = window.getSelection()?.anchorNode;
      return Boolean(ancora && editor.view.dom.contains(ancora));
    }

    window.addEventListener('keydown', aoPressionar, true);
    return () => window.removeEventListener('keydown', aoPressionar, true);
  }, [editor, menu, busca, abrirBusca, fecharBusca]);

  useEffect(() => {
    editor?.setEditable(!somenteLeitura);
  }, [editor, somenteLeitura]);

  const palavras = editor?.storage.characterCount.words() ?? 0;
  const caracteres = editor?.storage.characterCount.characters() ?? 0;

  useEffect(() => {
    aoMudarEstatisticas?.({ palavras, caracteres });
  }, [palavras, caracteres, aoMudarEstatisticas]);

  if (!editor) {
    return <EsqueletoDoEditor />;
  }

  return (
    <div ref={container} className="relative">
      {/* Ferramentas e busca ficam juntas no topo enquanto se rola a anotacao. */}
      <div className="sticky top-14 z-20 lg:top-0">
        {!somenteLeitura ? (
          <BarraDeFerramentas
            editor={editor}
            aoEscolherImagem={() => inputDeImagem.current?.click()}
          />
        ) : null}
        {busca ? (
          <div className="flex pt-1">
            <PainelDeBusca
              editor={editor}
              pedido={busca}
              somenteLeitura={somenteLeitura}
              aoFechar={fecharBusca}
            />
          </div>
        ) : null}
      </div>
      {!somenteLeitura ? <MenuFlutuante editor={editor} /> : null}
      {!somenteLeitura ? <MenuFlutuanteImagem editor={editor} /> : null}

      {!somenteLeitura ? (
        <input
          ref={inputDeImagem}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(evento) => {
            const arquivo = evento.target.files?.[0];
            if (arquivo) void enviarImagem(arquivo);
          }}
        />
      ) : null}

      <div className={cn('pt-4', modoFoco && 'mx-auto max-w-2xl')}>
        {!somenteLeitura ? (
          <div className="pb-2">
            <BarraDaTabela editor={editor} />
          </div>
        ) : null}

        {erroDeImagem ? (
          <p role="alert" className="text-perigo-500 pb-2 text-xs">
            {erroDeImagem}
          </p>
        ) : null}
        {enviandoImagem ? (
          <p className="pb-2 text-xs text-[var(--texto-tenue)]">Enviando imagem...</p>
        ) : null}

        <EditorContent editor={editor} />
      </div>

      {menu ? (
        <div className="absolute z-40" style={{ left: menu.x, top: menu.y }}>
          <MenuDeComandos
            ref={referenciaDoMenu}
            termo={menu.termo}
            aoEscolher={(comando) => escolherComando(comando.id)}
          />
        </div>
      ) : null}

      {!somenteLeitura ? (
        <div className="flex justify-end pt-4">
          <IndicadorDeSalvamento estado={estado} palavras={palavras} caracteres={caracteres} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Com uma janela modal aberta (dialogo, paleta, gaveta), os atalhos da pagina
 * ficam com ela; o Ctrl+F nao e interceptado.
 */
function haModalAberto(): boolean {
  return Boolean(
    document.querySelector('dialog[open], [aria-modal="true"]:not([aria-hidden="true"])'),
  );
}

/** Reexportado para quem precisa filtrar comandos fora deste arquivo. */
export { normalizar };
