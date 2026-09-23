import { getSchema } from '@tiptap/core';
import { history, redo, undo } from '@tiptap/pm/history';
import type { Node as NoProseMirror } from '@tiptap/pm/model';
import { EditorState, type Transaction } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';
import { montarExtensoes } from '../configuracao';
import {
  buscar,
  criarPluginDeBusca,
  estadoDaBusca,
  irParaOcorrencia,
  limparBusca,
  substituirAtual,
  substituirTodas,
} from '../extensoes/localizar-e-substituir';
import { encontrarOcorrencias, type OpcoesDeBusca } from './motor';

const schema = getSchema(montarExtensoes());

const PADRAO: OpcoesDeBusca = { diferenciarMaiusculas: false, palavraInteira: false };

type Conteudo = Record<string, unknown>;

const texto = (valor: string, marcas?: Conteudo[]): Conteudo =>
  marcas ? { type: 'text', text: valor, marks: marcas } : { type: 'text', text: valor };
const paragrafo = (...filhos: Conteudo[]): Conteudo => ({ type: 'paragraph', content: filhos });
const negrito = { type: 'bold' };

function documento(...blocos: Conteudo[]): NoProseMirror {
  return schema.nodeFromJSON({ type: 'doc', content: blocos });
}

/** O minimo de uma EditorView para os comandos, sem navegador. */
function criarVisao(doc: NoProseMirror, editable = true) {
  let state = EditorState.create({ schema, doc, plugins: [criarPluginDeBusca(), history()] });
  const transacoes: Transaction[] = [];
  return {
    get state() {
      return state;
    },
    dispatch(tr: Transaction) {
      transacoes.push(tr);
      state = state.apply(tr);
    },
    editable,
    transacoes,
  };
}

/** Texto dos blocos, separados por "|", para comparar resultados de forma legivel. */
function textoDe(doc: NoProseMirror): string {
  const blocos: string[] = [];
  doc.descendants((no) => {
    if (no.isTextblock) {
      blocos.push(no.textContent);
      return false;
    }
    return true;
  });
  return blocos.join('|');
}

function trechos(doc: NoProseMirror, termo: string, opcoes: Partial<OpcoesDeBusca> = {}) {
  return encontrarOcorrencias(doc, termo, { ...PADRAO, ...opcoes }).map(({ from, to }) =>
    doc.textBetween(from, to),
  );
}

describe('localizar', () => {
  it('encontra varias ocorrencias e navega nos dois sentidos, voltando ao inicio', () => {
    const visao = criarVisao(documento(paragrafo(texto('casa, casa e casa'))));
    buscar(visao, 'casa', PADRAO);

    expect(estadoDaBusca(visao.state).ocorrencias).toHaveLength(3);
    expect(estadoDaBusca(visao.state).atual).toBe(0);

    irParaOcorrencia(visao, estadoDaBusca(visao.state).atual + 1);
    irParaOcorrencia(visao, estadoDaBusca(visao.state).atual + 1);
    expect(estadoDaBusca(visao.state).atual).toBe(2);

    irParaOcorrencia(visao, estadoDaBusca(visao.state).atual + 1);
    expect(estadoDaBusca(visao.state).atual).toBe(0);

    irParaOcorrencia(visao, estadoDaBusca(visao.state).atual - 1);
    expect(estadoDaBusca(visao.state).atual).toBe(2);
  });

  it('campo vazio nao gera resultados nem destaques', () => {
    const visao = criarVisao(documento(paragrafo(texto('casa'))));
    buscar(visao, '', PADRAO);

    expect(estadoDaBusca(visao.state).ocorrencias).toEqual([]);
    expect(estadoDaBusca(visao.state).decoracoes.find()).toEqual([]);
  });

  it('busca acentos e caracteres especiais de forma literal', () => {
    const doc = documento(paragrafo(texto('A ação (x.y*)? custa [R$ 5] e axy nao.')));

    expect(trechos(doc, 'ação')).toEqual(['ação']);
    expect(trechos(doc, 'acao')).toEqual([]);
    expect(trechos(doc, '(x.y*)?')).toEqual(['(x.y*)?']);
    expect(trechos(doc, '[R$ 5]')).toEqual(['[R$ 5]']);
    // "." nao vale como "qualquer caractere".
    expect(trechos(doc, 'a.y')).toEqual([]);
    expect(trechos(doc, '\\')).toEqual([]);
  });

  it('encontra texto acentuado mesmo com acento decomposto (NFD)', () => {
    const doc = documento(paragrafo(texto('Revisao da licao: lição'.normalize('NFD'))));
    expect(trechos(doc, 'lição')).toHaveLength(1);
  });

  it('diferencia maiusculas e minusculas quando a opcao esta ativa', () => {
    const doc = documento(paragrafo(texto('Casa casa CASA')));

    expect(trechos(doc, 'casa')).toEqual(['Casa', 'casa', 'CASA']);
    expect(trechos(doc, 'Casa', { diferenciarMaiusculas: true })).toEqual(['Casa']);
    expect(trechos(doc, 'casa', { diferenciarMaiusculas: true })).toEqual(['casa']);
    // Sem diferenciar, acentos maiusculos tambem casam.
    expect(trechos(documento(paragrafo(texto('ÉPOCA época'))), 'época')).toHaveLength(2);
  });

  it('palavra inteira nao encontra "casamento" e respeita acentos', () => {
    const doc = documento(paragrafo(texto('casa, casamento, casa. Minha casa! Acasalar')));
    expect(trechos(doc, 'casa', { palavraInteira: true })).toEqual(['casa', 'casa', 'casa']);

    // "é" dentro de "café" nao e palavra inteira; sozinho, e.
    const acentos = documento(paragrafo(texto('O café é bom, é sim. Pé')));
    expect(
      encontrarOcorrencias(acentos, 'é', { ...PADRAO, palavraInteira: true }).map((o) => o.from),
    ).toHaveLength(2);

    // Letra acentuada colada nao conta como fronteira.
    expect(
      trechos(documento(paragrafo(texto('casaé casa'))), 'casa', { palavraInteira: true }),
    ).toEqual(['casa']);
    // Pontas sem letra nao exigem fronteira.
    expect(
      trechos(documento(paragrafo(texto('R$5 e R$ 6'))), 'R$', { palavraInteira: true }),
    ).toEqual(['R$', 'R$']);
  });

  it('encontra palavra dividida entre trechos com formatacoes diferentes', () => {
    const doc = documento(paragrafo(texto('uma '), texto('ca', [negrito]), texto('sa bonita')));
    expect(trechos(doc, 'casa')).toEqual(['casa']);
  });

  it('nao junta o fim de um paragrafo com o inicio do seguinte, nem atravessa quebras', () => {
    const doc = documento(
      paragrafo(texto('termina em ca')),
      paragrafo(texto('sa comeca aqui')),
      paragrafo(texto('ca'), { type: 'hardBreak' }, texto('sa')),
    );
    expect(trechos(doc, 'casa')).toEqual([]);
    expect(trechos(doc, 'ca sa')).toEqual([]);
  });

  it('pesquisa o texto visivel do link, mas nao o endereco', () => {
    const link = { type: 'link', attrs: { href: 'https://exemplo.com/casa' } };
    const doc = documento(paragrafo(texto('veja '), texto('esta casa', [link])));

    expect(trechos(doc, 'casa')).toEqual(['casa']);
    expect(trechos(doc, 'exemplo')).toEqual([]);
  });

  it('pesquisa listas, tabelas e blocos de codigo', () => {
    const doc = documento(
      { type: 'bulletList', content: [{ type: 'listItem', content: [paragrafo(texto('casa'))] }] },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [{ type: 'tableCell', content: [paragrafo(texto('casa na tabela'))] }],
          },
        ],
      },
      { type: 'codeBlock', content: [texto('const casa = 1;')] },
    );
    expect(trechos(doc, 'casa')).toHaveLength(3);
  });

  it('buscar e navegar nao alteram o documento nem entram no historico', () => {
    const doc = documento(paragrafo(texto('casa casa')));
    const visao = criarVisao(doc);

    buscar(visao, 'casa', PADRAO);
    irParaOcorrencia(visao, 1);
    limparBusca(visao);

    expect(visao.transacoes.every((tr) => !tr.docChanged)).toBe(true);
    expect(visao.state.doc.eq(doc)).toBe(true);
    expect(undo(visao.state)).toBe(false);
    // Destaques sao decoracoes: nada deles aparece no JSON salvo.
    expect(JSON.stringify(visao.state.doc.toJSON())).not.toContain('resultado-da-busca');
    expect(estadoDaBusca(visao.state).decoracoes.find()).toEqual([]);
  });

  it('recalcula quando o documento muda por fora (outra pessoa editando)', () => {
    const visao = criarVisao(documento(paragrafo(texto('casa'))));
    buscar(visao, 'casa', PADRAO);

    visao.dispatch(visao.state.tr.insertText(' outra casa', 5));

    expect(estadoDaBusca(visao.state).ocorrencias).toHaveLength(2);
    expect(estadoDaBusca(visao.state).decoracoes.find()).toHaveLength(2);
  });
});

describe('substituir', () => {
  it('substitui a atual, atualiza a contagem e avanca para a proxima', () => {
    const visao = criarVisao(documento(paragrafo(texto('casa, casa e casa'))));
    buscar(visao, 'casa', PADRAO);
    irParaOcorrencia(visao, 1);

    expect(substituirAtual(visao, 'lar')).toBe(true);

    expect(textoDe(visao.state.doc)).toBe('casa, lar e casa');
    const estado = estadoDaBusca(visao.state);
    expect(estado.ocorrencias).toHaveLength(2);
    // A proxima disponivel e a terceira original, agora de indice 1.
    expect(
      visao.state.doc.textBetween(
        estado.ocorrencias[estado.atual].from - 2,
        estado.ocorrencias[estado.atual].from,
      ),
    ).toBe('e ');
  });

  it('substitui todas e informa a quantidade', () => {
    const visao = criarVisao(documento(paragrafo(texto('casa, casa')), paragrafo(texto('Casa'))));
    buscar(visao, 'casa', PADRAO);

    expect(substituirTodas(visao, 'lar')).toBe(3);
    expect(textoDe(visao.state.doc)).toBe('lar, lar|lar');
    expect(estadoDaBusca(visao.state).ocorrencias).toEqual([]);
  });

  it('respeita as opcoes de busca na substituicao', () => {
    const visao = criarVisao(documento(paragrafo(texto('Casa casa casamento'))));
    buscar(visao, 'casa', { diferenciarMaiusculas: true, palavraInteira: true });

    expect(substituirTodas(visao, 'lar')).toBe(1);
    expect(textoDe(visao.state.doc)).toBe('Casa lar casamento');
  });

  it('permite substituir por texto vazio', () => {
    const visao = criarVisao(documento(paragrafo(texto('uma casa grande'))));
    buscar(visao, 'casa ', PADRAO);

    expect(substituirAtual(visao, '')).toBe(true);
    expect(textoDe(visao.state.doc)).toBe('uma grande');

    buscar(visao, 'a', PADRAO);
    substituirTodas(visao, '');
    expect(textoDe(visao.state.doc)).toBe('um grnde');
  });

  it('troca "casa" por "casas" uma unica vez, sem laco', () => {
    const visao = criarVisao(documento(paragrafo(texto('casa e casa'))));
    buscar(visao, 'casa', PADRAO);

    expect(substituirTodas(visao, 'casas')).toBe(2);
    expect(textoDe(visao.state.doc)).toBe('casas e casas');

    // Substituir a atual tambem avanca para depois do texto inserido.
    const outra = criarVisao(documento(paragrafo(texto('casa e casa'))));
    buscar(outra, 'casa', PADRAO);
    substituirAtual(outra, 'casas');
    substituirAtual(outra, 'casas');
    expect(textoDe(outra.state.doc)).toBe('casas e casas');
  });

  it('desfaz e refaz a substituicao em massa numa unica etapa', () => {
    const original = documento(paragrafo(texto('casa, casa')), paragrafo(texto('casa')));
    const visao = criarVisao(original);
    buscar(visao, 'casa', PADRAO);
    substituirTodas(visao, 'lar');
    const substituido = visao.state.doc;

    expect(undo(visao.state, visao.dispatch)).toBe(true);
    expect(visao.state.doc.eq(original)).toBe(true);
    // Nao sobrou nada para desfazer: tudo estava numa etapa so.
    expect(undo(visao.state)).toBe(false);

    expect(redo(visao.state, visao.dispatch)).toBe(true);
    expect(visao.state.doc.eq(substituido)).toBe(true);
  });

  it('nao junta a substituicao com a digitacao anterior no desfazer', () => {
    const visao = criarVisao(documento(paragrafo(texto('casa'))));
    visao.dispatch(visao.state.tr.insertText('!', 5));
    buscar(visao, 'casa', PADRAO);
    substituirTodas(visao, 'lar');

    undo(visao.state, visao.dispatch);
    expect(textoDe(visao.state.doc)).toBe('casa!');
  });

  it('preserva estrutura e formatacao fora do trecho alterado', () => {
    const link = { type: 'link', attrs: { href: 'https://exemplo.com/casa' } };
    const montar = (palavra: string) =>
      documento(
        { type: 'heading', attrs: { level: 2 }, content: [texto(`Titulo da ${palavra}`)] },
        paragrafo(
          texto('antes ', [negrito]),
          texto(palavra, [link]),
          texto(' depois', [{ type: 'italic' }]),
        ),
        {
          type: 'orderedList',
          content: [{ type: 'listItem', content: [paragrafo(texto(`item ${palavra}`))] }],
        },
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [{ type: 'tableCell', content: [paragrafo(texto(`celula ${palavra}`))] }],
            },
          ],
        },
      );
    const visao = criarVisao(montar('casa'));
    buscar(visao, 'casa', PADRAO);

    expect(substituirTodas(visao, 'lar')).toBe(4);
    // Mesma estrutura, mesmas marcas e o endereco do link intacto.
    expect(visao.state.doc.eq(montar('lar'))).toBe(true);
  });

  it('o texto novo herda a formatacao do primeiro caractere encontrado', () => {
    const visao = criarVisao(
      documento(paragrafo(texto('uma '), texto('ca', [negrito]), texto('sa bonita'))),
    );
    buscar(visao, 'casa', PADRAO);
    substituirAtual(visao, 'moradia');

    expect(visao.state.doc.child(0).toJSON().content).toEqual([
      texto('uma '),
      texto('moradia', [negrito]),
      texto(' bonita'),
    ]);
  });

  it('bloqueia substituicoes em anotacao somente para leitura, mas permite localizar', () => {
    const doc = documento(paragrafo(texto('casa')));
    const visao = criarVisao(doc, false);
    buscar(visao, 'casa', PADRAO);

    expect(estadoDaBusca(visao.state).ocorrencias).toHaveLength(1);
    expect(substituirAtual(visao, 'lar')).toBe(false);
    expect(substituirTodas(visao, 'lar')).toBe(0);
    expect(visao.state.doc.eq(doc)).toBe(true);
  });
});
