import * as Y from 'yjs';

/**
 * Conversao entre o JSON ProseMirror guardado em pages.content e o documento
 * Yjs usado na edicao em tempo real.
 *
 * O formato segue exatamente o do y-prosemirror (a biblioteca que o editor usa
 * no navegador): cada no vira um Y.XmlElement com os atributos nao nulos, e
 * textos vizinhos viram um unico Y.XmlText em que cada marca e um atributo de
 * formatacao ({ bold: {} }, { link: { href } }). Fazemos a conversao aqui, sem
 * o schema do editor, para a API nao depender dos pacotes do Tiptap; o teste
 * documento-yjs.spec.ts confere o resultado contra o proprio y-prosemirror.
 */

/** Nome do fragmento que a extensao Collaboration do Tiptap usa por padrao. */
export const CAMPO_DO_EDITOR = 'default';

interface MarcaJson {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface NoJson {
  type: string;
  attrs?: Record<string, unknown>;
  content?: NoJson[];
  text?: string;
  marks?: MarcaJson[];
}

export interface DocumentoJson {
  type: 'doc';
  content: NoJson[];
}

/** Preenche o documento Yjs (vazio) com o conteudo JSON da pagina. */
export function preencherYDoc(ydoc: Y.Doc, documento: { content?: NoJson[] }): void {
  const fragmento = ydoc.getXmlFragment(CAMPO_DO_EDITOR);

  ydoc.transact(() => {
    fragmento.insert(0, criarFilhos(documento.content ?? []));
  });
}

export function jsonParaYDoc(documento: { content?: NoJson[] }): Y.Doc {
  const ydoc = new Y.Doc();
  preencherYDoc(ydoc, documento);
  return ydoc;
}

/** Textos seguidos formam um so Y.XmlText, como no y-prosemirror. */
function criarFilhos(nos: NoJson[]): (Y.XmlElement | Y.XmlText)[] {
  const filhos: (Y.XmlElement | Y.XmlText)[] = [];
  let textos: NoJson[] = [];

  const fecharTextos = () => {
    if (textos.length === 0) return;

    const texto = new Y.XmlText();
    texto.applyDelta(
      textos.map((no) => ({ insert: no.text ?? '', attributes: marcasParaAtributos(no.marks) })),
    );
    filhos.push(texto);
    textos = [];
  };

  for (const no of nos) {
    if (no.type === 'text') {
      if (no.text) textos.push(no);
      continue;
    }

    fecharTextos();
    filhos.push(criarElemento(no));
  }

  fecharTextos();
  return filhos;
}

function criarElemento(no: NoJson): Y.XmlElement {
  const elemento = new Y.XmlElement(no.type);

  for (const [chave, valor] of Object.entries(no.attrs ?? {})) {
    if (valor !== null && valor !== undefined) {
      // Os atributos aceitam qualquer valor JSON; a tipagem do Yjs e mais estreita.
      elemento.setAttribute(chave, valor as string);
    }
  }

  elemento.insert(0, criarFilhos(no.content ?? []));
  return elemento;
}

function marcasParaAtributos(marcas: MarcaJson[] | undefined): Record<string, unknown> {
  const atributos: Record<string, unknown> = {};

  for (const marca of marcas ?? []) {
    atributos[marca.type] = marca.attrs ?? {};
  }

  return atributos;
}

/** Le o documento Yjs de volta para o JSON ProseMirror guardado em pages.content. */
export function yDocParaJson(ydoc: Y.Doc): DocumentoJson {
  const fragmento = ydoc.getXmlFragment(CAMPO_DO_EDITOR);

  return { type: 'doc', content: fragmento.toArray().flatMap(serializar) };
}

function serializar(item: Y.XmlElement | Y.XmlText | Y.XmlHook): NoJson[] {
  if (item instanceof Y.XmlText) {
    const delta = item.toDelta() as { insert: unknown; attributes?: Record<string, unknown> }[];

    return delta
      .filter((trecho) => typeof trecho.insert === 'string' && trecho.insert.length > 0)
      .map((trecho) => {
        const no: NoJson = { type: 'text', text: trecho.insert as string };
        const nomes = Object.keys(trecho.attributes ?? {});

        if (nomes.length > 0) {
          no.marks = nomes.map((nome) => {
            const attrs = trecho.attributes![nome] as Record<string, unknown> | null;
            const marca: MarcaJson = { type: nomeDaMarca(nome) };
            if (attrs && Object.keys(attrs).length > 0) marca.attrs = attrs;
            return marca;
          });
        }

        return no;
      });
  }

  if (item instanceof Y.XmlElement) {
    const no: NoJson = { type: item.nodeName };
    const attrs = item.getAttributes() as Record<string, unknown>;

    if (Object.keys(attrs).length > 0) no.attrs = attrs;

    const filhos = item.toArray().flatMap((filho) => serializar(filho as Y.XmlElement));
    if (filhos.length > 0) no.content = filhos;

    return [no];
  }

  return [];
}

/** Marcas que podem se sobrepor ganham um sufixo de hash no y-prosemirror. */
function nomeDaMarca(atributo: string): string {
  const [nome] = atributo.split('--');
  return nome ?? atributo;
}

/** Verdadeiro enquanto o documento Yjs ainda nao recebeu conteudo nenhum. */
export function vazio(ydoc: Y.Doc): boolean {
  return ydoc.getXmlFragment(CAMPO_DO_EDITOR).length === 0;
}
