import { describe, expect, it } from 'vitest';
import {
  montarColuna,
  montarTarefaCompleta,
  montarTarefaResumida,
  type ColunaBruta,
  type TarefaBruta,
  type TarefaCompletaBruta,
} from './tasks.helpers';

function tarefaResumida(overrides: Partial<TarefaBruta> = {}): TarefaBruta {
  return {
    id: 'tarefa-1',
    columnId: 'coluna-1',
    title: 'Estudar',
    priority: 'medium',
    dueDate: null,
    completedAt: null,
    archivedAt: null,
    position: 0,
    pageId: null,
    page: null,
    checklist: [],
    _count: { attachments: 0 },
    ...overrides,
  };
}

describe('montagem de tarefas resumidas', () => {
  it('calcula o progresso do checklist', () => {
    const resumida = montarTarefaResumida(
      tarefaResumida({ checklist: [{ done: true }, { done: false }, { done: true }] }),
    );

    expect(resumida.totalDeChecklist).toBe(3);
    expect(resumida.checklistConcluidos).toBe(2);
  });

  it('formata datas como ISO e mantem nulos', () => {
    const resumida = montarTarefaResumida(
      tarefaResumida({ dueDate: new Date('2026-09-20T00:00:00.000Z') }),
    );

    expect(resumida.dueDate).toBe('2026-09-20T00:00:00.000Z');
    expect(resumida.completedAt).toBeNull();
  });

  it('resume a pagina vinculada quando presente', () => {
    const semPagina = montarTarefaResumida(tarefaResumida());
    const comPagina = montarTarefaResumida(
      tarefaResumida({ pageId: 'pagina-1', page: { id: 'pagina-1', title: 'Aula 1' } }),
    );

    expect(semPagina.pagina).toBeNull();
    expect(comPagina.pagina).toEqual({ id: 'pagina-1', title: 'Aula 1' });
  });
});

describe('montagem de colunas', () => {
  it('ordena as tarefas por posicao', () => {
    const coluna: ColunaBruta = {
      id: 'coluna-1',
      name: 'A Fazer',
      color: 'indigo',
      position: 0,
      archivedAt: null,
      tasks: [
        tarefaResumida({ id: 'segunda', position: 1 }),
        tarefaResumida({ id: 'primeira', position: 0 }),
      ],
    };

    const montada = montarColuna(coluna);

    expect(montada.tarefas.map((tarefa) => tarefa.id)).toEqual(['primeira', 'segunda']);
  });
});

describe('montagem do detalhe completo', () => {
  function tarefaCompleta(overrides: Partial<TarefaCompletaBruta> = {}): TarefaCompletaBruta {
    return {
      id: 'tarefa-1',
      columnId: 'coluna-1',
      title: 'Estudar',
      description: null,
      priority: 'medium',
      dueDate: null,
      completedAt: null,
      archivedAt: null,
      position: 0,
      pageId: null,
      page: null,
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      updatedAt: new Date('2026-09-01T00:00:00.000Z'),
      checklist: [],
      attachments: [],
      ...overrides,
    };
  }

  it('converte o tamanho do anexo (BigInt) para string', () => {
    const completa = montarTarefaCompleta(
      tarefaCompleta({
        attachments: [
          {
            id: 'anexo-1',
            fileName: 'notas.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 123456789012n,
            createdAt: new Date('2026-09-01T00:00:00.000Z'),
          },
        ],
      }),
    );

    expect(completa.anexos[0]?.sizeBytes).toBe('123456789012');
    expect(completa.totalDeAnexos).toBe(1);
  });

  it('inclui os itens do checklist com seus dados', () => {
    const completa = montarTarefaCompleta(
      tarefaCompleta({
        checklist: [{ id: 'item-1', label: 'Ler capitulo 1', done: true, position: 0 }],
      }),
    );

    expect(completa.checklist).toEqual([
      { id: 'item-1', label: 'Ler capitulo 1', done: true, position: 0 },
    ]);
    expect(completa.checklistConcluidos).toBe(1);
  });
});
