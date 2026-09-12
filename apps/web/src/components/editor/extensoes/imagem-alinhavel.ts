import TiptapImage from '@tiptap/extension-image';

export type AlinhamentoDaImagem = 'centro' | 'esquerda' | 'direita';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imagemAlinhavel: {
      definirAlinhamentoDaImagem: (alinhamento: AlinhamentoDaImagem) => ReturnType;
    };
  }
}

/**
 * Estende a imagem padrao do Tiptap com um modo de alinhamento:
 *
 * - "centro": bloco no fluxo do texto, centralizado (como no Word "alinhado com o texto").
 * - "esquerda"/"direita": flutua na margem e o texto passa ao redor dela
 *   (equivalente web do "quadrado" do Word - CSS float, nao posicionamento livre).
 *
 * draggable:true permite arrastar a imagem para outro paragrafo, o jeito
 * nativo do ProseMirror de mudar onde ela fica ancorada no documento.
 */
export const ImagemAlinhavel = TiptapImage.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'centro' as AlinhamentoDaImagem,
        parseHTML: (elemento) =>
          (elemento.getAttribute('data-align') as AlinhamentoDaImagem | null) ?? 'centro',
        renderHTML: (atributos) => ({ 'data-align': atributos.align as AlinhamentoDaImagem }),
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      definirAlinhamentoDaImagem:
        (alinhamento: AlinhamentoDaImagem) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { align: alinhamento }),
    };
  },
});
