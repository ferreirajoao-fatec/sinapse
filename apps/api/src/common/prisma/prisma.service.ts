import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { escoparPorUsuario, type NivelDeAcesso, type PrismaEscopado } from './escopo-do-usuario';

/**
 * Cliente unico do Prisma para toda a aplicacao.
 * Abre a conexao quando o modulo sobe e fecha quando a aplicacao encerra.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'error' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
    });
  }

  /**
   * Cliente preso a um unico usuario.
   * Toda leitura e escrita de grupos, secoes, paginas e etiquetas passa por
   * aqui, de modo que o filtro de dono nunca depende de alguem lembrar dele.
   *
   * O nivel "leitura" ou "edicao" inclui as secoes compartilhadas com a conta.
   */
  paraUsuario(userId: string, nivel: NivelDeAcesso = 'dono'): PrismaEscopado {
    return escoparPorUsuario(this, userId, nivel);
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conexao com o PostgreSQL estabelecida');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Conexao com o PostgreSQL encerrada');
  }

  /**
   * Executa um SELECT 1 e devolve a latencia em milissegundos.
   * Usado pelo endpoint de saude para provar que o banco responde.
   */
  async checkConnection(): Promise<{
    connected: boolean;
    latencyMs: number | null;
    error: string | null;
  }> {
    const inicio = performance.now();

    try {
      await this.$queryRaw`SELECT 1`;
      return {
        connected: true,
        latencyMs: Math.round((performance.now() - inicio) * 100) / 100,
        error: null,
      };
    } catch (erro) {
      return {
        connected: false,
        latencyMs: null,
        error: erro instanceof Error ? erro.message : 'Erro desconhecido ao consultar o banco',
      };
    }
  }
}
