'use client';

import type { Editor } from '@tiptap/react';
import { Columns3, Rows3, Trash2 } from 'lucide-react';

/**
 * Controles que so aparecem com o cursor dentro de uma tabela.
 * Manter isso fora da barra principal evita quatro botoes inuteis
 * permanentemente visiveis.
 */
export function BarraDaTabela({ editor }: { editor: Editor }) {
  if (!editor.isActive('table')) {
    return null;
  }

  return (
    <div className="animate-surgir flex flex-wrap items-center gap-2 rounded-md border bg-[var(--superficie-suave)] px-3 py-2 text-xs">
      <span className="flex items-center gap-1.5 font-medium text-[var(--texto-suave)]">
        <Columns3 aria-hidden="true" className="size-3.5" />
        Tabela
      </span>

      <Acao rotulo="Coluna antes" aoClicar={() => editor.chain().focus().addColumnBefore().run()} />
      <Acao rotulo="Coluna depois" aoClicar={() => editor.chain().focus().addColumnAfter().run()} />
      <Acao rotulo="Remover coluna" aoClicar={() => editor.chain().focus().deleteColumn().run()} />

      <span className="h-4 w-px bg-[var(--borda-forte)]" aria-hidden="true" />

      <span className="flex items-center gap-1.5 font-medium text-[var(--texto-suave)]">
        <Rows3 aria-hidden="true" className="size-3.5" />
      </span>
      <Acao rotulo="Linha acima" aoClicar={() => editor.chain().focus().addRowBefore().run()} />
      <Acao rotulo="Linha abaixo" aoClicar={() => editor.chain().focus().addRowAfter().run()} />
      <Acao rotulo="Remover linha" aoClicar={() => editor.chain().focus().deleteRow().run()} />

      <span className="h-4 w-px bg-[var(--borda-forte)]" aria-hidden="true" />

      <Acao
        rotulo="Mesclar ou dividir"
        aoClicar={() => editor.chain().focus().mergeOrSplit().run()}
      />

      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="text-perigo-700 dark:text-perigo-500 ml-auto flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 transition-colors hover:bg-[var(--superficie)]"
      >
        <Trash2 aria-hidden="true" className="size-3.5" />
        Excluir tabela
      </button>
    </div>
  );
}

function Acao({ rotulo, aoClicar }: { rotulo: string; aoClicar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      className="cursor-pointer rounded-sm px-2 py-1 text-[var(--texto-suave)] transition-colors hover:bg-[var(--superficie)] hover:text-[var(--texto)]"
    >
      {rotulo}
    </button>
  );
}
