import { mergeAttributes, Node } from '@tiptap/core';

export type TomDoBloco = 'informacao' | 'atencao' | 'sucesso' | 'perigo';

export const TONS_DO_BLOCO: { valor: TomDoBloco; rotulo: string; emoji: string }[] = [
  { valor: 'informacao', rotulo: 'Informacao', emoji: '💡' },
  { valor: 'atencao', rotulo: 'Atencao', emoji: '⚠️' },
  { valor: 'sucesso', rotulo: 'Dica', emoji: '✅' },
  { valor: 'perigo', rotulo: 'Cuidado', emoji: '🚫' },
];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blocoInformativo: {
      definirBlocoInformativo: (tom?: TomDoBloco) => ReturnType;
      alternarBlocoInformativo: (tom?: TomDoBloco) => ReturnType;
    };
  }
}

/**
 * Bloco de destaque, do tipo "callout".
 *
 * Guardado como um no proprio, e nao como uma citacao com classe: assim o
 * tom (informacao, atencao, dica, cuidado) sobrevive a exportacao e continua
 * legivel para a IA na Etapa 9.
 */
export const BlocoInformativo = Node.create({
  name: 'blocoInformativo',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      tom: {
        default: 'informacao' as TomDoBloco,
        parseHTML: (elemento) => elemento.getAttribute('data-tom') ?? 'informacao',
        renderHTML: (atributos) => ({ 'data-tom': atributos.tom as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-bloco-informativo]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-bloco-informativo': '', class: 'bloco-informativo' }),
      0,
    ];
  },

  addCommands() {
    return {
      definirBlocoInformativo:
        (tom = 'informacao') =>
        ({ commands }) =>
          commands.wrapIn(this.name, { tom }),

      alternarBlocoInformativo:
        (tom = 'informacao') =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { tom }),
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-i': () => this.editor.commands.alternarBlocoInformativo(),
    };
  },
});
