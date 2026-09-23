'use client';

import { BubbleMenu, type Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Barra que aparece sobre a imagem selecionada, para escolher o alinhamento.
 *
 * "Centro" mantem a imagem no fluxo do texto (equivalente ao "alinhado com o
 * texto" do Word). "Esquerda"/"direita" flutuam na margem, com o texto
 * passando ao redor - o mais proximo do "quadrado" do Word que a web permite
 * sem simular o layout inteiro (ver nota em imagem-alinhavel.ts).
 */
export function MenuFlutuanteImagem({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="menuFlutuanteImagem"
      tippyOptions={{ duration: 120, maxWidth: 'none', placement: 'top' }}
      shouldShow={({ editor: instancia }) => {
        if (!instancia.isEditable) return false;
        const { selection } = instancia.state;
        return selection instanceof NodeSelection && selection.node.type.name === 'image';
      }}
    >
      <div className="superficie shadow-elevada flex items-center gap-0.5 p-1">
        <BotaoDeAlinhamento
          rotulo="Alinhar com o texto"
          Icone={AlignCenter}
          ativo={editor.isActive('image', { align: 'centro' })}
          aoClicar={() => editor.chain().focus().definirAlinhamentoDaImagem('centro').run()}
        />
        <BotaoDeAlinhamento
          rotulo="Flutuar a esquerda"
          Icone={AlignLeft}
          ativo={editor.isActive('image', { align: 'esquerda' })}
          aoClicar={() => editor.chain().focus().definirAlinhamentoDaImagem('esquerda').run()}
        />
        <BotaoDeAlinhamento
          rotulo="Flutuar a direita"
          Icone={AlignRight}
          ativo={editor.isActive('image', { align: 'direita' })}
          aoClicar={() => editor.chain().focus().definirAlinhamentoDaImagem('direita').run()}
        />

        <span className="mx-0.5 h-5 w-px bg-[var(--borda)]" aria-hidden="true" />

        <BotaoDeAlinhamento
          rotulo="Remover imagem"
          Icone={Trash2}
          aoClicar={() => editor.chain().focus().deleteSelection().run()}
        />
      </div>
    </BubbleMenu>
  );
}

function BotaoDeAlinhamento({
  rotulo,
  Icone,
  ativo = false,
  aoClicar,
}: {
  rotulo: string;
  Icone: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  ativo?: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={rotulo}
      aria-pressed={ativo}
      title={rotulo}
      className={cn(
        'flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors',
        ativo
          ? 'bg-[var(--destaque-suave)] text-[var(--destaque)]'
          : 'text-[var(--texto-suave)] hover:bg-[var(--superficie-suave)] hover:text-[var(--texto)]',
      )}
    >
      <Icone aria-hidden className="size-4" />
    </button>
  );
}
