import CharacterCount from '@tiptap/extension-character-count';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { common, createLowlight } from 'lowlight';
import type * as Y from 'yjs';
import { BlocoInformativo } from './extensoes/bloco-informativo';
import { ImagemAlinhavel } from './extensoes/imagem-alinhavel';

/** Realce de sintaxe apenas das linguagens comuns, para nao inchar o pacote. */
export const lowlight = createLowlight(common);

/** Linguagens oferecidas no seletor do bloco de codigo. */
export const LINGUAGENS = [
  { valor: 'plaintext', rotulo: 'Texto simples' },
  { valor: 'javascript', rotulo: 'JavaScript' },
  { valor: 'typescript', rotulo: 'TypeScript' },
  { valor: 'python', rotulo: 'Python' },
  { valor: 'java', rotulo: 'Java' },
  { valor: 'csharp', rotulo: 'C#' },
  { valor: 'cpp', rotulo: 'C++' },
  { valor: 'c', rotulo: 'C' },
  { valor: 'sql', rotulo: 'SQL' },
  { valor: 'json', rotulo: 'JSON' },
  { valor: 'xml', rotulo: 'HTML e XML' },
  { valor: 'css', rotulo: 'CSS' },
  { valor: 'bash', rotulo: 'Terminal' },
  { valor: 'php', rotulo: 'PHP' },
  { valor: 'go', rotulo: 'Go' },
  { valor: 'rust', rotulo: 'Rust' },
  { valor: 'markdown', rotulo: 'Markdown' },
];

/** Cores de texto, com contraste suficiente nos dois temas. */
export const CORES_DE_TEXTO = [
  { valor: '', rotulo: 'Padrao', amostra: 'var(--texto)' },
  { valor: '#5b4bd6', rotulo: 'Indigo', amostra: '#5b4bd6' },
  { valor: '#0f9d8f', rotulo: 'Turquesa', amostra: '#0f9d8f' },
  { valor: '#2f9e57', rotulo: 'Verde', amostra: '#2f9e57' },
  { valor: '#c8830f', rotulo: 'Ambar', amostra: '#c8830f' },
  { valor: '#d34a45', rotulo: 'Vermelho', amostra: '#d34a45' },
  { valor: '#78776f', rotulo: 'Cinza', amostra: '#78776f' },
];

/** Marca-texto: tons claros o bastante para o texto preto continuar legivel. */
export const CORES_DE_MARCACAO = [
  { valor: '#fbeacd', rotulo: 'Amarelo' },
  { valor: '#cdefe9', rotulo: 'Turquesa' },
  { valor: '#d7f0dd', rotulo: 'Verde' },
  { valor: '#fadedd', rotulo: 'Rosa' },
  { valor: '#dcd8fb', rotulo: 'Lilas' },
  { valor: '#e7e6e3', rotulo: 'Cinza' },
];

/**
 * Extensoes do editor.
 *
 * O documento gerado e um JSON ProseMirror, guardado como esta no campo
 * content da pagina. Manter o formato estruturado, em vez de HTML, permite
 * que a Etapa 9 leia o conteudo por blocos e cite a origem de cada resumo.
 */
export interface OpcoesDeColaboracao {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  usuario: { name: string; color: string };
}

/**
 * Com colaboracao, o documento vive no Yjs: o historico de desfazer passa a
 * ser o da extensao Collaboration (cada pessoa desfaz so o que ela fez), e os
 * cursores de quem esta na pagina aparecem com nome e cor.
 */
export function montarExtensoes(
  placeholder = 'Digite / para ver os comandos',
  colaboracao?: OpcoesDeColaboracao,
) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false, // substituido pela versao com realce de sintaxe
      horizontalRule: { HTMLAttributes: { class: 'linha-divisoria' } },
      ...(colaboracao ? { history: false as const } : {}),
    }),
    ...(colaboracao
      ? [
          Collaboration.configure({ document: colaboracao.ydoc }),
          CollaborationCursor.configure({
            provider: colaboracao.provider,
            user: colaboracao.usuario,
          }),
        ]
      : []),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      // Sem javascript: nem data:, para nao abrir espaco a script injetado.
      protocols: ['http', 'https', 'mailto'],
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    ImagemAlinhavel.configure({ inline: false, allowBase64: false }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext' }),
    BlocoInformativo,
    CharacterCount,
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') return 'Titulo';
        return placeholder;
      },
    }),
  ];
}
