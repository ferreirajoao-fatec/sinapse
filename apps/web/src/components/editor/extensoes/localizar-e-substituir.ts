import { Extension } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { yUndoPluginKey } from 'y-prosemirror';
import {
  encontrarOcorrencias,
  substituirNaTransacao,
  substituirTodasNaTransacao,
  type Ocorrencia,
  type OpcoesDeBusca,
} from '../busca/motor';

export interface EstadoDaBusca {
  ativa: boolean;
  termo: string;
  opcoes: OpcoesDeBusca;
  ocorrencias: Ocorrencia[];
  /** Indice da ocorrencia atual, ou -1 quando nao ha nenhuma. */
  atual: number;
  decoracoes: DecorationSet;
}

type Acao =
  | { tipo: 'buscar'; termo: string; opcoes: OpcoesDeBusca; aPartirDe: number }
  | { tipo: 'ir'; indice: number }
  | { tipo: 'retomar'; posicao: number }
  | { tipo: 'limpar' };

export const chaveDaBusca = new PluginKey<EstadoDaBusca>('localizarESubstituir');

const OPCOES_PADRAO: OpcoesDeBusca = { diferenciarMaiusculas: false, palavraInteira: false };

const INATIVA: EstadoDaBusca = {
  ativa: false,
  termo: '',
  opcoes: OPCOES_PADRAO,
  ocorrencias: [],
  atual: -1,
  decoracoes: DecorationSet.empty,
};

/** Primeira ocorrencia a partir da posicao; volta ao inicio se nao houver. */
function indiceAPartirDe(ocorrencias: Ocorrencia[], posicao: number): number {
  if (ocorrencias.length === 0) return -1;
  const indice = ocorrencias.findIndex((ocorrencia) => ocorrencia.from >= posicao);
  return indice === -1 ? 0 : indice;
}

function montarDecoracoes(
  doc: EditorState['doc'],
  ocorrencias: Ocorrencia[],
  atual: number,
): DecorationSet {
  if (ocorrencias.length === 0) return DecorationSet.empty;

  return DecorationSet.create(
    doc,
    ocorrencias.map((ocorrencia, indice) =>
      Decoration.inline(ocorrencia.from, ocorrencia.to, {
        class:
          indice === atual ? 'resultado-da-busca resultado-da-busca-atual' : 'resultado-da-busca',
      }),
    ),
  );
}

function comOcorrencias(
  base: EstadoDaBusca,
  doc: EditorState['doc'],
  ocorrencias: Ocorrencia[],
  atual: number,
): EstadoDaBusca {
  return { ...base, ocorrencias, atual, decoracoes: montarDecoracoes(doc, ocorrencias, atual) };
}

/**
 * Plugin de localizar e substituir dentro da anotacao aberta.
 *
 * Os destaques sao decoracoes do ProseMirror: existem so na tela, nunca entram
 * no documento, no Yjs, no historico ou na exportacao. Buscar e navegar usam
 * transacoes que nao alteram o documento, entao a anotacao nao fica "alterada"
 * so por ter aberto a busca.
 */
export function criarPluginDeBusca(): Plugin<EstadoDaBusca> {
  return new Plugin<EstadoDaBusca>({
    key: chaveDaBusca,
    state: {
      init: () => INATIVA,
      apply(tr, anterior) {
        const acao = tr.getMeta(chaveDaBusca) as Acao | undefined;

        if (acao?.tipo === 'limpar') return INATIVA;

        if (acao?.tipo === 'buscar') {
          const ocorrencias = encontrarOcorrencias(tr.doc, acao.termo, acao.opcoes);
          return comOcorrencias(
            { ...anterior, ativa: true, termo: acao.termo, opcoes: acao.opcoes },
            tr.doc,
            ocorrencias,
            indiceAPartirDe(ocorrencias, acao.aPartirDe),
          );
        }

        if (!anterior.ativa) return anterior;

        if (tr.docChanged) {
          // Alteracao local ou de outra pessoa: refaz a busca e tenta manter
          // a mesma ocorrencia como atual.
          const ocorrencias = encontrarOcorrencias(tr.doc, anterior.termo, anterior.opcoes);
          const atualAntes = anterior.ocorrencias[anterior.atual];
          const posicao =
            acao?.tipo === 'retomar'
              ? acao.posicao
              : atualAntes
                ? tr.mapping.map(atualAntes.from, -1)
                : 0;
          return comOcorrencias(
            anterior,
            tr.doc,
            ocorrencias,
            indiceAPartirDe(ocorrencias, posicao),
          );
        }

        if (acao?.tipo === 'ir' && anterior.ocorrencias.length > 0) {
          const total = anterior.ocorrencias.length;
          const indice = ((acao.indice % total) + total) % total;
          return comOcorrencias(anterior, tr.doc, anterior.ocorrencias, indice);
        }

        return anterior;
      },
    },
    props: {
      decorations(state) {
        return chaveDaBusca.getState(state)?.decoracoes;
      },
    },
  });
}

export const LocalizarESubstituir = Extension.create({
  name: 'localizarESubstituir',

  addProseMirrorPlugins() {
    return [criarPluginDeBusca()];
  },
});

export function estadoDaBusca(state: EditorState): EstadoDaBusca {
  return chaveDaBusca.getState(state) ?? INATIVA;
}

/** O que os comandos usam da view; facilita testar sem navegador. */
type VisaoDoEditor = Pick<EditorView, 'state' | 'dispatch' | 'editable'>;

/** Transacao so de interface: nao entra em nenhum historico. */
function despacharAcao(view: VisaoDoEditor, acao: Acao): void {
  view.dispatch(view.state.tr.setMeta(chaveDaBusca, acao).setMeta('addToHistory', false));
}

/**
 * Atualiza termo e opcoes. A ocorrencia atual passa a ser a primeira depois do
 * cursor, como nos editores de texto em geral.
 */
export function buscar(view: VisaoDoEditor, termo: string, opcoes: OpcoesDeBusca): void {
  const { from } = view.state.selection;
  const atual = estadoDaBusca(view.state).ocorrencias[estadoDaBusca(view.state).atual];
  // Enquanto se digita, a busca fica ancorada na ocorrencia atual, sem pular.
  despacharAcao(view, { tipo: 'buscar', termo, opcoes, aPartirDe: atual?.from ?? from });
}

export function irParaOcorrencia(view: VisaoDoEditor, indice: number): void {
  despacharAcao(view, { tipo: 'ir', indice });
}

export function limparBusca(view: VisaoDoEditor): void {
  if (estadoDaBusca(view.state).ativa) despacharAcao(view, { tipo: 'limpar' });
}

/**
 * Isola a substituicao no historico de desfazer. Com colaboracao, o desfazer
 * e o Y.UndoManager, que junta alteracoes proximas no tempo; sem, e o
 * prosemirror-history. Nos dois casos a substituicao vira uma etapa so.
 */
function despacharComoEtapaUnica(view: VisaoDoEditor, tr: Transaction): void {
  const gerenciador = yUndoPluginKey.getState(view.state)?.undoManager;
  gerenciador?.stopCapturing();
  view.dispatch(closeHistory(tr));
  yUndoPluginKey.getState(view.state)?.undoManager?.stopCapturing();
}

/** Troca a ocorrencia atual e avanca para a proxima. */
export function substituirAtual(view: VisaoDoEditor, novoTexto: string): boolean {
  const estado = estadoDaBusca(view.state);
  const ocorrencia = estado.ocorrencias[estado.atual];
  if (!view.editable || !ocorrencia) return false;

  const tr = view.state.tr;
  substituirNaTransacao(tr, view.state.schema, ocorrencia, novoTexto);
  tr.setMeta(chaveDaBusca, {
    tipo: 'retomar',
    posicao: ocorrencia.from + novoTexto.length,
  } satisfies Acao);
  despacharComoEtapaUnica(view, tr);
  return true;
}

/** Troca todas as ocorrencias de uma vez. Devolve quantas foram trocadas. */
export function substituirTodas(view: VisaoDoEditor, novoTexto: string): number {
  const { ocorrencias } = estadoDaBusca(view.state);
  if (!view.editable || ocorrencias.length === 0) return 0;

  const tr = view.state.tr;
  const total = substituirTodasNaTransacao(tr, view.state.schema, ocorrencias, novoTexto);
  despacharComoEtapaUnica(view, tr);
  return total;
}
