import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * Valida o corpo da requisicao com um schema Zod compartilhado.
 * Usar o mesmo schema do frontend garante mensagens de erro identicas
 * nos dois lados, em portugues.
 */
export class ValidacaoZod<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(valor: unknown): T {
    const resultado = this.schema.safeParse(valor);

    if (!resultado.success) {
      const campos: Record<string, string> = {};

      for (const problema of resultado.error.issues) {
        const caminho = problema.path.join('.') || 'corpo';
        campos[caminho] ??= problema.message;
      }

      throw new BadRequestException({
        message: Object.values(campos)[0] ?? 'Dados invalidos',
        campos,
      });
    }

    return resultado.data;
  }
}
