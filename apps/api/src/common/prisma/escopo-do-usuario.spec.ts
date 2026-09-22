import { describe, expect, it } from 'vitest';
import { escoparPorUsuario } from './escopo-do-usuario';

/**
 * Verifica o comportamento da extensao sem tocar no banco: um cliente falso
 * registra o que a extensao pediu, e conferimos o filtro injetado.
 */
function clienteFalso() {
  const chamadas: { model: string; operation: string; args: unknown }[] = [];

  const cliente = {
    $extends(configuracao: {
      query: {
        $allModels: {
          $allOperations: (contexto: {
            model: string;
            operation: string;
            args: unknown;
            query: (args: unknown) => Promise<unknown>;
          }) => Promise<unknown>;
        };
      };
    }) {
      const executar = configuracao.query.$allModels.$allOperations;

      const chamar = (model: string, operation: string) => (args: unknown) =>
        executar({
          model,
          operation,
          args,
          query: async (finais: unknown) => {
            chamadas.push({ model, operation, args: finais });
            return finais;
          },
        });

      return {
        group: {
          findMany: chamar('Group', 'findMany'),
          update: chamar('Group', 'update'),
          create: chamar('Group', 'create'),
        },
        page: { findFirst: chamar('Page', 'findFirst') },
        user: { findFirst: chamar('User', 'findFirst') },
      };
    },
  };

  return { cliente, chamadas };
}

describe('escopo do usuario', () => {
  it('injeta o filtro de dono nos grupos', async () => {
    const { cliente, chamadas } = clienteFalso();
    const db = escoparPorUsuario(cliente as never, 'usuario-1') as unknown as {
      group: { findMany: (args: unknown) => Promise<unknown> };
    };

    await db.group.findMany({ where: { deletedAt: null } });

    expect(chamadas[0]?.args).toEqual({
      where: { AND: [{ deletedAt: null }, { userId: 'usuario-1' }] },
    });
  });

  it('chega ate o dono da pagina pela secao e pelo grupo', async () => {
    const { cliente, chamadas } = clienteFalso();
    const db = escoparPorUsuario(cliente as never, 'usuario-2') as unknown as {
      page: { findFirst: (args: unknown) => Promise<unknown> };
    };

    await db.page.findFirst({ where: { id: 'abc' } });

    expect(chamadas[0]?.args).toEqual({
      where: { AND: [{ id: 'abc' }, { section: { group: { userId: 'usuario-2' } } }] },
    });
  });

  it('no nivel de leitura, aceita tambem os membros da secao', async () => {
    const { cliente, chamadas } = clienteFalso();
    const db = escoparPorUsuario(cliente as never, 'usuario-6', 'leitura') as unknown as {
      page: { findFirst: (args: unknown) => Promise<unknown> };
    };

    await db.page.findFirst({ where: { id: 'abc' } });

    expect(chamadas[0]?.args).toEqual({
      where: {
        AND: [
          { id: 'abc' },
          {
            section: {
              OR: [
                { group: { userId: 'usuario-6' } },
                { members: { some: { userId: 'usuario-6' } } },
              ],
            },
          },
        ],
      },
    });
  });

  it('no nivel de edicao, exige o papel de editor', async () => {
    const { cliente, chamadas } = clienteFalso();
    const db = escoparPorUsuario(cliente as never, 'usuario-7', 'edicao') as unknown as {
      page: { findFirst: (args: unknown) => Promise<unknown> };
    };

    await db.page.findFirst({ where: { id: 'abc' } });

    expect(chamadas[0]?.args).toEqual({
      where: {
        AND: [
          { id: 'abc' },
          {
            section: {
              OR: [
                { group: { userId: 'usuario-7' } },
                { members: { some: { userId: 'usuario-7', role: 'editor' } } },
              ],
            },
          },
        ],
      },
    });
  });

  it('grupos continuam so do dono, mesmo no nivel de leitura', async () => {
    const { cliente, chamadas } = clienteFalso();
    const db = escoparPorUsuario(cliente as never, 'usuario-8', 'leitura') as unknown as {
      group: { findMany: (args: unknown) => Promise<unknown> };
    };

    await db.group.findMany({});

    expect(chamadas[0]?.args).toEqual({ where: { AND: [{}, { userId: 'usuario-8' }] } });
  });

  it('bloqueia update, que nao aceita o filtro com seguranca', async () => {
    const { cliente } = clienteFalso();
    const db = escoparPorUsuario(cliente as never, 'usuario-3') as unknown as {
      group: { update: (args: unknown) => Promise<unknown> };
    };

    await expect(db.group.update({ where: { id: 'abc' } })).rejects.toThrow(
      /nao pode ser usada em Group/,
    );
  });

  it('deixa create passar, porque a posse do pai e conferida no servico', async () => {
    const { cliente, chamadas } = clienteFalso();
    const db = escoparPorUsuario(cliente as never, 'usuario-4') as unknown as {
      group: { create: (args: unknown) => Promise<unknown> };
    };

    await db.group.create({ data: { name: 'Novo' } });

    expect(chamadas[0]?.args).toEqual({ data: { name: 'Novo' } });
  });

  it('nao mexe em modelos fora da lista', async () => {
    const { cliente, chamadas } = clienteFalso();
    const db = escoparPorUsuario(cliente as never, 'usuario-5') as unknown as {
      user: { findFirst: (args: unknown) => Promise<unknown> };
    };

    await db.user.findFirst({ where: { id: 'usuario-5' } });

    expect(chamadas[0]?.args).toEqual({ where: { id: 'usuario-5' } });
  });
});
