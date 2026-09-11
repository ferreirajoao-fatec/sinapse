'use client';

import { BubbleMenu, type Editor } from '@tiptap/react';
import {
  Bold,
  Code,
  Highlighter,
  Italic,
  Link2,
  Link2Off,
  Palette,
  Strikethrough,
  Underline as UnderlineIcone,
} from 'lucide-react';
import { useState } from 'react';
import { CORES_DE_MARCACAO, CORES_DE_TEXTO } from './configuracao';
import { cn } from '@/lib/utils';

/**
 * Barra que aparece sobre o texto selecionado.
 *
 * So traz o que se aplica a uma selecao: marcacoes de trecho. Comandos de
 * bloco ficam na barra fixa e no menu "/", para nao poluir a selecao.
 */
export function MenuFlutuante({ editor }: { editor: Editor }) {
  const [painel, setPainel] = useState<'cor' | 'marcacao' | null>(null);

  function definirLink() {
    const atual = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Endereco do link', atual ?? 'https://');

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    if (!/^(https?:\/\/|mailto:)/i.test(url)) {
      window.alert('Use um endereco comecando com https:// ou mailto:');
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 120, maxWidth: 'none' }}
      shouldShow={({ editor: instancia, from, to }) => {
        // Sem barra dentro de bloco de codigo, onde negrito nao faz sentido.
        if (instancia.isActive('codeBlock')) return false;
        return from !== to;
      }}
    >
      <div className="superficie flex items-center gap-0.5 p-1 shadow-elevada">
        <BotaoDeMarca
          rotulo="Negrito"
          atalho="Ctrl B"
          Icone={Bold}
          ativo={editor.isActive('bold')}
          aoClicar={() => editor.chain().focus().toggleBold().run()}
        />
        <BotaoDeMarca
          rotulo="Italico"
          atalho="Ctrl I"
          Icone={Italic}
          ativo={editor.isActive('italic')}
          aoClicar={() => editor.chain().focus().toggleItalic().run()}
        />
        <BotaoDeMarca
          rotulo="Sublinhado"
          atalho="Ctrl U"
          Icone={UnderlineIcone}
          ativo={editor.isActive('underline')}
          aoClicar={() => editor.chain().focus().toggleUnderline().run()}
        />
        <BotaoDeMarca
          rotulo="Tachado"
          Icone={Strikethrough}
          ativo={editor.isActive('strike')}
          aoClicar={() => editor.chain().focus().toggleStrike().run()}
        />
        <BotaoDeMarca
          rotulo="Codigo em linha"
          Icone={Code}
          ativo={editor.isActive('code')}
          aoClicar={() => editor.chain().focus().toggleCode().run()}
        />

        <span className="mx-0.5 h-5 w-px bg-[var(--borda)]" aria-hidden="true" />

        <div className="relative">
          <BotaoDeMarca
            rotulo="Cor do texto"
            Icone={Palette}
            ativo={painel === 'cor'}
            aoClicar={() => setPainel(painel === 'cor' ? null : 'cor')}
          />
          {painel === 'cor' ? (
            <div className="superficie absolute top-full left-0 z-50 mt-1 flex w-40 flex-wrap gap-1 p-2 shadow-elevada">
              {CORES_DE_TEXTO.map((cor) => (
                <button
                  key={cor.rotulo}
                  type="button"
                  title={cor.rotulo}
                  aria-label={cor.rotulo}
                  onClick={() => {
                    if (cor.valor) {
                      editor.chain().focus().setColor(cor.valor).run();
                    } else {
                      editor.chain().focus().unsetColor().run();
                    }
                    setPainel(null);
                  }}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-md border text-sm font-semibold transition-transform hover:scale-110"
                  style={{ color: cor.amostra }}
                >
                  A
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <BotaoDeMarca
            rotulo="Marca-texto"
            Icone={Highlighter}
            ativo={editor.isActive('highlight') || painel === 'marcacao'}
            aoClicar={() => setPainel(painel === 'marcacao' ? null : 'marcacao')}
          />
          {painel === 'marcacao' ? (
            <div className="superficie absolute top-full left-0 z-50 mt-1 flex w-40 flex-wrap gap-1 p-2 shadow-elevada">
              {CORES_DE_MARCACAO.map((cor) => (
                <button
                  key={cor.rotulo}
                  type="button"
                  title={cor.rotulo}
                  aria-label={cor.rotulo}
                  onClick={() => {
                    editor.chain().focus().setHighlight({ color: cor.valor }).run();
                    setPainel(null);
                  }}
                  className="size-7 cursor-pointer rounded-md border transition-transform hover:scale-110"
                  style={{ backgroundColor: cor.valor }}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetHighlight().run();
                  setPainel(null);
                }}
                className="h-7 flex-1 cursor-pointer rounded-md border px-2 text-2xs transition-colors hover:bg-[var(--superficie-suave)]"
              >
                Remover
              </button>
            </div>
          ) : null}
        </div>

        <span className="mx-0.5 h-5 w-px bg-[var(--borda)]" aria-hidden="true" />

        <BotaoDeMarca
          rotulo={editor.isActive('link') ? 'Editar link' : 'Inserir link'}
          Icone={Link2}
          ativo={editor.isActive('link')}
          aoClicar={definirLink}
        />
        {editor.isActive('link') ? (
          <BotaoDeMarca
            rotulo="Remover link"
            Icone={Link2Off}
            aoClicar={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
          />
        ) : null}
      </div>
    </BubbleMenu>
  );
}

function BotaoDeMarca({
  rotulo,
  atalho,
  Icone,
  ativo = false,
  aoClicar,
}: {
  rotulo: string;
  atalho?: string;
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
      title={atalho ? `${rotulo} (${atalho})` : rotulo}
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
