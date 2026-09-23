import type { Mark, Node as NoProseMirror, Schema } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';

export interface OpcoesDeBusca {
  diferenciarMaiusculas: boolean;
  palavraInteira: boolean;
}

/** Trecho encontrado, em posicoes do documento ProseMirror. */
export interface Ocorrencia {
  from: number;
  to: number;
}

/**
 * Ocupa o lugar de quebras de linha, imagens e outros nos sem texto dentro de
 * um bloco. Nenhum termo digitado contem esse caractere, entao a busca nunca
 * "atravessa" uma imagem, e cada no continua valendo exatamente uma posicao.
 */
const SEM_TEXTO = '\u{FFFC}';

/** Letras (com acento), marcas combinantes, numeros e sublinhado. */
const CARACTERE_DE_PALAVRA = /[\p{L}\p{M}\p{N}_]/u;

function escapar(texto: string): string {
  // Com a flag "u", so estes caracteres (e a barra) aceitam escape.
  return texto.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/**
 * Monta a expressao da busca a partir do termo digitado, sempre de forma
 * literal: ".", "*", "(" e companhia valem como texto.
 *
 * O termo e procurado nas duas normalizacoes Unicode (NFC e NFD), porque texto
 * colado de PDFs costuma trazer "a" + acento separados. A expressao casa o
 * texto original, sem transforma-lo, para que cada indice continue apontando
 * para a mesma posicao do documento.
 *
 * "Palavra inteira" so exige fronteira nas pontas do termo que sao letras ou
 * numeros: "casa" nao encontra "casamento", e "R$" continua encontrando "R$5".
 */
export function montarExpressao(termo: string, opcoes: OpcoesDeBusca): RegExp | null {
  if (termo.length === 0) return null;

  const formas = [...new Set([termo, termo.normalize('NFC'), termo.normalize('NFD')])];
  let corpo = formas.map(escapar).join('|');
  corpo = formas.length > 1 ? `(?:${corpo})` : corpo;

  if (opcoes.palavraInteira) {
    const caracteres = Array.from(termo);
    const primeiro = caracteres[0] ?? '';
    const ultimo = caracteres[caracteres.length - 1] ?? '';
    const fronteira = '[\\p{L}\\p{M}\\p{N}_]';
    if (CARACTERE_DE_PALAVRA.test(primeiro)) corpo = `(?<!${fronteira})${corpo}`;
    if (CARACTERE_DE_PALAVRA.test(ultimo)) corpo = `${corpo}(?!${fronteira})`;
  }

  return new RegExp(corpo, opcoes.diferenciarMaiusculas ? 'gu' : 'giu');
}

/**
 * Procura o termo no texto visivel da anotacao.
 *
 * A busca e feita bloco a bloco (paragrafo, titulo, item, celula...), juntando
 * os pedacos de texto do bloco. Assim uma palavra meio em negrito e encontrada,
 * mas o fim de um paragrafo nunca se junta ao inicio do seguinte. Atributos
 * (endereco de links, imagens, cores) nao fazem parte do texto e ficam de fora.
 */
export function encontrarOcorrencias(
  doc: NoProseMirror,
  termo: string,
  opcoes: OpcoesDeBusca,
): Ocorrencia[] {
  const expressao = montarExpressao(termo, opcoes);
  if (!expressao) return [];

  const ocorrencias: Ocorrencia[] = [];

  doc.descendants((no, posicao) => {
    if (!no.isTextblock) return true;

    let texto = '';
    no.forEach((filho) => {
      texto += filho.isText ? (filho.text ?? '') : SEM_TEXTO.repeat(filho.nodeSize);
    });

    const inicio = posicao + 1;
    for (const achado of texto.matchAll(expressao)) {
      if (achado[0].length === 0) continue;
      ocorrencias.push({
        from: inicio + achado.index,
        to: inicio + achado.index + achado[0].length,
      });
    }

    // Blocos de texto nao tem outros blocos dentro.
    return false;
  });

  return ocorrencias;
}

/**
 * Formatacao do texto que entra no lugar da ocorrencia.
 *
 * Regra: o texto novo herda as marcas do primeiro caractere encontrado. Em
 * "**ca**sa", trocar por "lar" gera "**lar**". E a mesma coisa que acontece ao
 * selecionar o trecho e digitar por cima, entao nao surpreende.
 */
export function marcasDaOcorrencia(doc: NoProseMirror, ocorrencia: Ocorrencia): readonly Mark[] {
  return doc.nodeAt(ocorrencia.from)?.marks ?? [];
}

/** Troca uma ocorrencia na transacao, respeitando a regra de formatacao. */
export function substituirNaTransacao(
  tr: Transaction,
  schema: Schema,
  ocorrencia: Ocorrencia,
  novoTexto: string,
): void {
  if (novoTexto.length === 0) {
    tr.delete(ocorrencia.from, ocorrencia.to);
    return;
  }

  const marcas = marcasDaOcorrencia(tr.doc, ocorrencia);
  const pai = tr.doc.resolve(ocorrencia.from).parent;
  // Um bloco de codigo nao aceita marcas; filtra o que o bloco nao permite.
  const permitidas = marcas.filter((marca) => pai.type.allowsMarkType(marca.type));
  tr.replaceWith(ocorrencia.from, ocorrencia.to, schema.text(novoTexto, permitidas));
}

/**
 * Troca todas as ocorrencias listadas numa unica transacao.
 *
 * A lista e a do inicio da operacao, percorrida de tras para frente para que
 * as posicoes ainda nao processadas continuem validas. O texto inserido nunca
 * e procurado de novo, entao trocar "casa" por "casas" nao entra em laco.
 */
export function substituirTodasNaTransacao(
  tr: Transaction,
  schema: Schema,
  ocorrencias: readonly Ocorrencia[],
  novoTexto: string,
): number {
  for (let indice = ocorrencias.length - 1; indice >= 0; indice -= 1) {
    substituirNaTransacao(tr, schema, ocorrencias[indice], novoTexto);
  }
  return ocorrencias.length;
}
