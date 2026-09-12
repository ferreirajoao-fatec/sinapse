'use client';

import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImagemIcone,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TabelaIcone,
  Underline as UnderlineIcone,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Barra fixa acima do editor.
 *
 * Traz o que se usa com mais frequencia. O conjunto completo continua acessivel
 * pelo menu "/" e pelos atalhos, para nao transformar a barra em um painel.
 */
export function BarraDeFerramentas({
  editor,
  aoEscolherImagem,
}: {
  editor: Editor;
  /** Abre o seletor de arquivo para subir e inserir uma imagem. */
  aoEscolherImagem?: () => void;
}) {
  return (
    <div className="bg-[var(--fundo)]/95 sticky top-14 z-10 -mx-1 flex flex-wrap items-center gap-0.5 border-b px-1 py-1.5 backdrop-blur lg:top-0">
      <Botao
        rotulo="Desfazer"
        atalho="Ctrl Z"
        Icone={Undo2}
        desabilitado={!editor.can().undo()}
        aoClicar={() => editor.chain().focus().undo().run()}
      />
      <Botao
        rotulo="Refazer"
        atalho="Ctrl Shift Z"
        Icone={Redo2}
        desabilitado={!editor.can().redo()}
        aoClicar={() => editor.chain().focus().redo().run()}
      />

      <Separador />

      <Botao
        rotulo="Titulo 1"
        Icone={Heading1}
        ativo={editor.isActive('heading', { level: 1 })}
        aoClicar={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <Botao
        rotulo="Titulo 2"
        Icone={Heading2}
        ativo={editor.isActive('heading', { level: 2 })}
        aoClicar={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <Botao
        rotulo="Titulo 3"
        Icone={Heading3}
        ativo={editor.isActive('heading', { level: 3 })}
        aoClicar={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />

      <Separador />

      <Botao
        rotulo="Negrito"
        atalho="Ctrl B"
        Icone={Bold}
        ativo={editor.isActive('bold')}
        aoClicar={() => editor.chain().focus().toggleBold().run()}
      />
      <Botao
        rotulo="Italico"
        atalho="Ctrl I"
        Icone={Italic}
        ativo={editor.isActive('italic')}
        aoClicar={() => editor.chain().focus().toggleItalic().run()}
      />
      <Botao
        rotulo="Sublinhado"
        atalho="Ctrl U"
        Icone={UnderlineIcone}
        ativo={editor.isActive('underline')}
        aoClicar={() => editor.chain().focus().toggleUnderline().run()}
      />
      <Botao
        rotulo="Tachado"
        Icone={Strikethrough}
        ativo={editor.isActive('strike')}
        aoClicar={() => editor.chain().focus().toggleStrike().run()}
      />

      <Separador />

      <Botao
        rotulo="Lista com marcadores"
        Icone={List}
        ativo={editor.isActive('bulletList')}
        aoClicar={() => editor.chain().focus().toggleBulletList().run()}
      />
      <Botao
        rotulo="Lista numerada"
        Icone={ListOrdered}
        ativo={editor.isActive('orderedList')}
        aoClicar={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <Botao
        rotulo="Lista de tarefas"
        Icone={CheckSquare}
        ativo={editor.isActive('taskList')}
        aoClicar={() => editor.chain().focus().toggleTaskList().run()}
      />

      <Separador />

      <Botao
        rotulo="Alinhar a esquerda"
        Icone={AlignLeft}
        ativo={editor.isActive({ textAlign: 'left' })}
        aoClicar={() => editor.chain().focus().setTextAlign('left').run()}
      />
      <Botao
        rotulo="Centralizar"
        Icone={AlignCenter}
        ativo={editor.isActive({ textAlign: 'center' })}
        aoClicar={() => editor.chain().focus().setTextAlign('center').run()}
      />
      <Botao
        rotulo="Alinhar a direita"
        Icone={AlignRight}
        ativo={editor.isActive({ textAlign: 'right' })}
        aoClicar={() => editor.chain().focus().setTextAlign('right').run()}
      />
      <Botao
        rotulo="Justificar"
        Icone={AlignJustify}
        ativo={editor.isActive({ textAlign: 'justify' })}
        aoClicar={() => editor.chain().focus().setTextAlign('justify').run()}
      />

      <Separador />

      <Botao
        rotulo="Citacao"
        Icone={Quote}
        ativo={editor.isActive('blockquote')}
        aoClicar={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <Botao
        rotulo="Bloco de codigo"
        Icone={Code2}
        ativo={editor.isActive('codeBlock')}
        aoClicar={() => editor.chain().focus().toggleCodeBlock().run()}
      />
      <Botao
        rotulo="Linha divisoria"
        Icone={Minus}
        aoClicar={() => editor.chain().focus().setHorizontalRule().run()}
      />
      <Botao
        rotulo="Inserir tabela"
        Icone={TabelaIcone}
        ativo={editor.isActive('table')}
        aoClicar={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      />
      {aoEscolherImagem ? (
        <Botao rotulo="Inserir imagem" Icone={ImagemIcone} aoClicar={aoEscolherImagem} />
      ) : null}
    </div>
  );
}

function Separador() {
  return <span className="mx-1 h-5 w-px bg-[var(--borda)]" aria-hidden="true" />;
}

function Botao({
  rotulo,
  atalho,
  Icone,
  ativo = false,
  desabilitado = false,
  aoClicar,
}: {
  rotulo: string;
  atalho?: string;
  Icone: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  ativo?: boolean;
  desabilitado?: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={desabilitado}
      aria-label={rotulo}
      aria-pressed={ativo}
      title={atalho ? `${rotulo} (${atalho})` : rotulo}
      className={cn(
        'flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        ativo
          ? 'bg-[var(--destaque-suave)] text-[var(--destaque)]'
          : 'text-[var(--texto-suave)] hover:bg-[var(--superficie-suave)] hover:text-[var(--texto)]',
      )}
    >
      <Icone aria-hidden className="size-4" />
    </button>
  );
}
