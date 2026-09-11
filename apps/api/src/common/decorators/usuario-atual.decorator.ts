import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { RequisicaoAutenticada, UsuarioDaRequisicao } from '../types/requisicao-autenticada';

/**
 * Injeta o usuario autenticado no metodo do controller.
 *
 * O identificador vem SEMPRE do token, nunca do corpo ou da URL.
 * E isso que impede um usuario de agir em nome de outro.
 */
export const UsuarioAtual = createParamDecorator(
  (campo: keyof UsuarioDaRequisicao | undefined, contexto: ExecutionContext) => {
    const requisicao = contexto.switchToHttp().getRequest<RequisicaoAutenticada>();

    if (!requisicao.usuario) {
      throw new UnauthorizedException('Sessao nao encontrada');
    }

    return campo ? requisicao.usuario[campo] : requisicao.usuario;
  },
);
