import { describe, expect, it } from 'vitest';
import { contarPalavras, extrairTexto, montarSubpaginas, type PaginaBruta } from './notes.helpers';

function pagina(id: string, parentPageId: string | null, position = 0): PaginaBruta {
  return {
    id,
    title: id,
    icon: null,
    position,
    isFavorite: false,
    isPinned: false,
    archivedAt: null,
    parentPageId,
  };
}

describe('montagem da arvore de paginas', () => {
  it('aninha subpaginas em varios niveis', () => {
    const arvore = montarSubpaginas(
      [
        pagina('raiz', null),
        pagina('filha', 'raiz'),
        pagina('neta', 'filha'),
        pagina('outra-raiz', null, 1),
      ],
      null,
    );

    expect(arvore).toHaveLength(2);
    expect(arvore[0]?.id).toBe('raiz');
    expect(arvore[0]?.subpaginas[0]?.id).toBe('filha');
    expect(arvore[0]?.subpaginas[0]?.subpaginas[0]?.id).toBe('neta');
  });

  it('respeita a posicao ao ordenar', () => {
    const arvore = montarSubpaginas(
      [pagina('segunda', null, 1), pagina('primeira', null, 0)],
      null,
    );

    expect(arvore.map((item) => item.id)).toEqual(['primeira', 'segunda']);
  });

  it('ignora paginas cujo pai nao esta na lista', () => {
    const arvore = montarSubpaginas([pagina('orfa', 'pai-que-sumiu')], null);
    expect(arvore).toHaveLength(0);
  });
});

describe('extracao de texto do editor', () => {
  it('junta o texto de nos aninhados', () => {
    const documento = {
      type: 'doc',
      content: [
        { type: 'heading', content: [{ type: 'text', text: 'Normalizacao' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'A terceira forma normal' },
            { type: 'text', text: 'elimina dependencias.' },
          ],
        },
      ],
    };

    const texto = extrairTexto(documento);

    expect(texto).toContain('Normalizacao');
    expect(texto).toContain('elimina dependencias.');
  });

  it('devolve vazio para documento sem conteudo', () => {
    expect(extrairTexto({ type: 'doc', content: [] })).toBe('');
    expect(extrairTexto(null)).toBe('');
  });

  it('conta palavras ignorando espacos extras', () => {
    expect(contarPalavras('  uma   frase com  cinco palavras ')).toBe(5);
    expect(contarPalavras('')).toBe(0);
  });
});
