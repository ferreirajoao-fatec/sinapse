import type { Editor, Range } from '@tiptap/core';
import {
  AlertTriangle,
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImagemIcone,
  List,
  ListOrdered,
  Minus,
  Quote,
  Table as TabelaIcone,
  Type,
  type LucideIcon,
} from 'lucide-react';

export interface ComandoDoEditor {
  id: string;
  rotulo: string;
  descricao: string;
  Icone: LucideIcon;
  grupo: 'Texto' | 'Listas' | 'Blocos' | 'Midia';
  /** Termos alternativos que tambem encontram o comando. */
  termos: string[];
  executar: (argumentos: { editor: Editor; range: Range }) => void;
}

/** Remove acentos para que "codigo" encontre "código" e vice-versa. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export const COMANDOS: ComandoDoEditor[] = [
  {
    id: 'texto',
    rotulo: 'Texto',
    descricao: 'Paragrafo comum',
    Icone: Type,
    grupo: 'Texto',
    termos: ['paragrafo', 'p'],
    executar: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    id: 'titulo1',
    rotulo: 'Titulo 1',
    descricao: 'Titulo de secao principal',
    Icone: Heading1,
    grupo: 'Texto',
    termos: ['h1', 'cabecalho'],
    executar: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    id: 'titulo2',
    rotulo: 'Titulo 2',
    descricao: 'Subtitulo',
    Icone: Heading2,
    grupo: 'Texto',
    termos: ['h2', 'subtitulo'],
    executar: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    id: 'titulo3',
    rotulo: 'Titulo 3',
    descricao: 'Subtitulo menor',
    Icone: Heading3,
    grupo: 'Texto',
    termos: ['h3'],
    executar: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    id: 'lista',
    rotulo: 'Lista com marcadores',
    descricao: 'Itens sem ordem definida',
    Icone: List,
    grupo: 'Listas',
    termos: ['bullet', 'ul', 'topicos'],
    executar: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: 'lista-numerada',
    rotulo: 'Lista numerada',
    descricao: 'Itens em sequencia',
    Icone: ListOrdered,
    grupo: 'Listas',
    termos: ['ol', 'ordenada', 'numeros'],
    executar: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: 'lista-de-tarefas',
    rotulo: 'Lista de tarefas',
    descricao: 'Itens com caixa de marcacao',
    Icone: CheckSquare,
    grupo: 'Listas',
    termos: ['todo', 'checklist', 'afazeres'],
    executar: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    id: 'citacao',
    rotulo: 'Citacao',
    descricao: 'Trecho destacado de outra fonte',
    Icone: Quote,
    grupo: 'Blocos',
    termos: ['quote', 'blockquote'],
    executar: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    id: 'bloco-informativo',
    rotulo: 'Bloco informativo',
    descricao: 'Caixa de destaque colorida',
    Icone: AlertTriangle,
    grupo: 'Blocos',
    termos: ['callout', 'aviso', 'destaque', 'dica'],
    executar: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).alternarBlocoInformativo('informacao').run(),
  },
  {
    id: 'codigo',
    rotulo: 'Bloco de codigo',
    descricao: 'Codigo com realce de sintaxe',
    Icone: Code2,
    grupo: 'Blocos',
    termos: ['code', 'programacao'],
    executar: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    id: 'divisor',
    rotulo: 'Linha divisoria',
    descricao: 'Separa duas partes do texto',
    Icone: Minus,
    grupo: 'Blocos',
    termos: ['hr', 'separador', 'linha'],
    executar: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    id: 'tabela',
    rotulo: 'Tabela',
    descricao: 'Tabela de 3 por 3, com cabecalho',
    Icone: TabelaIcone,
    grupo: 'Blocos',
    termos: ['table', 'grade'],
    executar: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    id: 'imagem',
    rotulo: 'Imagem por endereco',
    descricao: 'Insere uma imagem a partir de uma URL',
    Icone: ImagemIcone,
    grupo: 'Midia',
    termos: ['image', 'figura', 'foto'],
    executar: ({ editor, range }) => {
      const url = window.prompt('Endereco da imagem (https://...)');
      editor.chain().focus().deleteRange(range).run();

      if (url && /^https?:\/\//i.test(url)) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },
];
