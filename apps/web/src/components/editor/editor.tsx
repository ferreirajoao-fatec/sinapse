'use client';

import type { AnexoDePagina, ConteudoDaPagina } from '@sinapse/shared';
import { EditorContent, useEditor, type Editor as InstanciaDoEditor } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usarAutosave } from '@/hooks/usar-autosave';
import { ApiError } from '@/lib/api';
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

interface PosicaoDoMenu {
  x: number;
  y: number;
  termo: string;
  inicio: number;
}

/**
 * Editor de anotacoes.
 *
 * O conteudo trafega como JSON ProseMirror, do mesmo jeito que fica no banco.
 * Nada de HTML no meio do caminho: manter a estrutura permite que a busca da
 * Etapa 6 e a IA da Etapa 9 leiam o documento por blocos.
 */
export function Editor({
  paginaId,
  conteudoInicial,
  somenteLeitura = false,
  modoFoco = false,
  aoSalvar,
  aoMudarEstatisticas,
  aoAnexosAtualizados,
}: {
  paginaId: string;
  conteudoInicial: ConteudoDaPagina;
  somenteLeitura?: boolean;
  modoFoco?: boolean;
  aoSalvar: (conteudo: ConteudoDaPagina) => Promise<void>;
  aoMudarEstatisticas?: (dados: { palavras: number; caracteres: number }) => void;
  /** Chamado apos subir uma imagem, para a lista de Anexos da pagina refletir o novo arquivo. */
  aoAnexosAtualizados?: (anexos: AnexoDePagina[]) => void;
}) {
  const [menu, setMenu] = useState<PosicaoDoMenu | null>(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [erroDeImagem, setErroDeImagem] = useState<string | null>(null);
  const referenciaDoMenu = useRef<ReferenciaDoMenu>(null);
  const inputDeImagem = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLDivElement>(null);

  const { estado, agendar, gravarAgora } = usarAutosave<ConteudoDaPagina>({ aoSalvar });

  const editor = useEditor({
    extensions: montarExtensoes(),
    content: conteudoInicial,
    editable: !somenteLeitura,
    // Necessario no Next: sem isso o HTML do servidor difere do cliente.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'conteudo-do-editor focus:outline-none',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Conteudo da anotacao',
      },
    },
    onUpdate: ({ editor: instancia }) => {
      if (somenteLeitura) return;

      agendar(instancia.getJSON() as ConteudoDaPagina);
      atualizarMenu(instancia);
    },
    onSelectionUpdate: ({ editor: instancia }) => atualizarMenu(instancia),
  });

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

  // Teclado do menu de comandos e atalho de gravacao imediata.
  useEffect(() => {
    if (!editor) return;

    function aoPressionar(evento: KeyboardEvent) {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 's') {
        evento.preventDefault();
        void gravarAgora();
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

    window.addEventListener('keydown', aoPressionar, true);
    return () => window.removeEventListener('keydown', aoPressionar, true);
  }, [editor, menu, gravarAgora]);

  // Conteudo trocado ao navegar para outra pagina.
  useEffect(() => {
    if (!editor) return;

    const atual = JSON.stringify(editor.getJSON());
    const novo = JSON.stringify(conteudoInicial);

    if (atual !== novo) {
      editor.commands.setContent(conteudoInicial, false);
    }
    // Reagir apenas a troca de documento, nao a cada tecla digitada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conteudoInicial, editor]);

  useEffect(() => {
    editor?.setEditable(!somenteLeitura);
  }, [editor, somenteLeitura]);

  const palavras = editor?.storage.characterCount.words() ?? 0;
  const caracteres = editor?.storage.characterCount.characters() ?? 0;

  useEffect(() => {
    aoMudarEstatisticas?.({ palavras, caracteres });
  }, [palavras, caracteres, aoMudarEstatisticas]);

  if (!editor) {
    return (
      <div className="space-y-3" aria-hidden="true">
        <div className="animate-pulsar h-9 rounded-md bg-[var(--superficie-suave)]" />
        <div className="animate-pulsar h-64 rounded-md bg-[var(--superficie-suave)]" />
      </div>
    );
  }

  return (
    <div ref={container} className="relative">
      {!somenteLeitura ? (
        <BarraDeFerramentas
          editor={editor}
          aoEscolherImagem={() => inputDeImagem.current?.click()}
        />
      ) : null}
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

/** Reexportado para quem precisa filtrar comandos fora deste arquivo. */
export { normalizar };
