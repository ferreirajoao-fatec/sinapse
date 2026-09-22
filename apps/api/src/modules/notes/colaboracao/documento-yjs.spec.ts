import { describe, expect, it } from 'vitest';
import { yXmlFragmentToProsemirrorJSON } from 'y-prosemirror';
import * as Y from 'yjs';
import { CAMPO_DO_EDITOR, jsonParaYDoc, vazio, yDocParaJson, type NoJson } from './documento-yjs';

/**
 * O navegador le e escreve o documento com o y-prosemirror. Estes testes
 * garantem que a conversao feita pela API produz a mesma estrutura que ele.
 */

/** Documento com um pouco de tudo que o editor produz. */
const DOCUMENTO: { type: 'doc'; content: NoJson[] } = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1, textAlign: 'left' },
      content: [{ type: 'text', text: 'Titulo' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'center' },
      content: [
        { type: 'text', text: 'normal ' },
        { type: 'text', text: 'negrito', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' e ' },
        {
          type: 'text',
          text: 'link',
          marks: [
            {
              type: 'link',
              attrs: { href: 'https://exemplo.com', target: '_blank', rel: null, class: null },
            },
            { type: 'italic' },
          ],
        },
        { type: 'hardBreak' },
        {
          type: 'text',
          text: 'depois da quebra',
          marks: [{ type: 'textStyle', attrs: { color: '#5b4bd6' } }],
        },
      ],
    },
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'feito' }] }],
        },
      ],
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableHeader',
              attrs: { colspan: 1, rowspan: 1, colwidth: [120] },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
            },
          ],
        },
      ],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'sql' },
      content: [{ type: 'text', text: 'select 1;' }],
    },
    {
      type: 'blocoInformativo',
      attrs: { tom: 'atencao' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'cuidado' }] }],
    },
    {
      type: 'image',
      attrs: { src: '/api/v1/pages/x/anexos/y/imagem', alt: null, align: 'direita', width: 320 },
    },
    { type: 'paragraph' },
  ],
};

/** Atributos nulos nao vao para o Yjs, exatamente como no y-prosemirror. */
function semNulos(no: NoJson): NoJson {
  const limpo: NoJson = { type: no.type };

  if (no.text !== undefined) limpo.text = no.text;

  const attrs = Object.fromEntries(
    Object.entries(no.attrs ?? {}).filter(([, valor]) => valor !== null && valor !== undefined),
  );
  if (Object.keys(attrs).length > 0) limpo.attrs = attrs;

  if (no.marks) {
    limpo.marks = no.marks.map((marca) =>
      marca.attrs && Object.keys(marca.attrs).length > 0
        ? { type: marca.type, attrs: marca.attrs }
        : { type: marca.type },
    );
  }

  if (no.content?.length) limpo.content = no.content.map(semNulos);

  return limpo;
}

describe('documento Yjs', () => {
  it('ida e volta preserva o documento', () => {
    const ydoc = jsonParaYDoc(DOCUMENTO);

    expect(yDocParaJson(ydoc)).toEqual({
      type: 'doc',
      content: DOCUMENTO.content.map(semNulos),
    });
  });

  it('gera a mesma estrutura que o y-prosemirror le no navegador', () => {
    const ydoc = jsonParaYDoc(DOCUMENTO);
    const lidoPeloYProsemirror = yXmlFragmentToProsemirrorJSON(
      ydoc.getXmlFragment(CAMPO_DO_EDITOR),
    ) as { content: NoJson[] };

    // O y-prosemirror sempre escreve attrs nas marcas, mesmo vazio; tirando
    // essa diferenca cosmetica, o conteudo e identico ao que produzimos.
    const normalizado = JSON.parse(
      JSON.stringify(lidoPeloYProsemirror.content).replace(/,"attrs":\{\}/g, ''),
    ) as NoJson[];

    expect(normalizado).toEqual(yDocParaJson(ydoc).content);
  });

  it('agrupa textos vizinhos em um unico Y.XmlText, com as marcas como formatacao', () => {
    const ydoc = jsonParaYDoc(DOCUMENTO);
    const paragrafo = ydoc.getXmlFragment(CAMPO_DO_EDITOR).get(1) as Y.XmlElement;
    const primeiroTexto = paragrafo.get(0) as Y.XmlText;

    expect(primeiroTexto).toBeInstanceOf(Y.XmlText);
    expect(primeiroTexto.toDelta()).toEqual([
      { insert: 'normal ' },
      { insert: 'negrito', attributes: { bold: {} } },
      { insert: ' e ' },
      {
        insert: 'link',
        attributes: {
          link: { href: 'https://exemplo.com', target: '_blank', rel: null, class: null },
          italic: {},
        },
      },
    ]);
  });

  it('documento vazio continua vazio', () => {
    const ydoc = jsonParaYDoc({ content: [] });

    expect(vazio(ydoc)).toBe(true);
    expect(yDocParaJson(ydoc)).toEqual({ type: 'doc', content: [] });
  });

  it('o estado binario sobrevive a gravacao e leitura', () => {
    const original = jsonParaYDoc(DOCUMENTO);
    const copia = new Y.Doc();

    Y.applyUpdate(copia, Y.encodeStateAsUpdate(original));

    expect(yDocParaJson(copia)).toEqual(yDocParaJson(original));
  });
});
