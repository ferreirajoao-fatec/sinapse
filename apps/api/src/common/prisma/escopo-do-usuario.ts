import type { PrismaClient } from '@prisma/client';

/**
 * Isolamento entre contas, aplicado na camada de acesso a dados.
 *
 * Em vez de confiar que cada consulta se lembre de filtrar por usuario, o
 * cliente devolvido por escoparPorUsuario injeta o filtro sozinho. Um servico
 * que esqueca do filtro continua isolado.
 *
 * Duas decisoes sustentam isso:
 *
 * 1. Cada modelo declara COMO se chega ate o dono. Grupo e etiqueta tem o
 *    campo direto; secao chega pelo grupo; pagina, pela secao.
 *
 * 2. As operacoes que buscam um registro unico pelo id (findUnique, update,
 *    delete) sao BLOQUEADAS nestes modelos. Elas nao aceitam um filtro extra
 *    de forma confiavel, entao seriam a brecha por onde um id alheio passaria.
 *    Chamar uma delas lanca erro na hora, e o teste quebra em vez de vazar.
 *    Os servicos usam findFirst, updateMany e deleteMany no lugar.
 */

type Filtro = (userId: string) => Record<string, unknown>;

/** Caminho de cada modelo ate o usuario dono. */
const CAMINHO_ATE_O_DONO: Record<string, Filtro> = {
  group: (userId) => ({ userId }),
  tag: (userId) => ({ userId }),
  section: (userId) => ({ group: { userId } }),
  page: (userId) => ({ section: { group: { userId } } }),
  pageVersion: (userId) => ({ page: { section: { group: { userId } } } }),
  pageTag: (userId) => ({ tag: { userId } }),
  taskColumn: (userId) => ({ userId }),
  task: (userId) => ({ column: { userId } }),
  taskChecklistItem: (userId) => ({ task: { column: { userId } } }),
  taskAttachment: (userId) => ({ task: { column: { userId } } }),
};

/** Operacoes em que o filtro pode ser injetado com seguranca. */
const OPERACOES_FILTRAVEIS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

/** Operacoes proibidas nos modelos do usuario. */
const OPERACOES_BLOQUEADAS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'update',
  'delete',
  'upsert',
]);

/**
 * Devolve um cliente Prisma preso a um unico usuario.
 * O userId vem sempre do token de sessao, nunca do corpo da requisicao.
 */
export function escoparPorUsuario(prisma: PrismaClient, userId: string) {
  return prisma.$extends({
    name: 'escopo-do-usuario',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const chave = model.charAt(0).toLowerCase() + model.slice(1);
          const filtro = CAMINHO_ATE_O_DONO[chave];

          // Modelos fora da lista (usuario, sessao, log) seguem sem alteracao:
          // eles ja sao acessados por servicos que recebem o userId direto.
          if (!filtro) {
            return query(args);
          }

          if (OPERACOES_BLOQUEADAS.has(operation)) {
            throw new Error(
              `A operacao "${operation}" nao pode ser usada em ${model} pelo cliente escopado, ` +
                'porque nao aceita o filtro de dono com seguranca. ' +
                'Use findFirst, updateMany ou deleteMany.',
            );
          }

          if (!OPERACOES_FILTRAVEIS.has(operation)) {
            // create, createMany e afins: a posse do pai e conferida no servico.
            return query(args);
          }

          const argumentos = (args ?? {}) as { where?: Record<string, unknown> };

          return query({
            ...argumentos,
            where: { AND: [argumentos.where ?? {}, filtro(userId)] },
          } as typeof args);
        },
      },
    },
  });
}

export type PrismaEscopado = ReturnType<typeof escoparPorUsuario>;
