import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { COOKIE_ACESSO } from '@sinapse/shared';
import { CHAVE_ROTA_PUBLICA } from '../decorators/publico.decorator';
import type { RequisicaoAutenticada } from '../types/requisicao-autenticada';

interface ConteudoDoToken {
  sub: string;
  email: string;
}

/**
 * Guard global: toda rota exige sessao, exceto as marcadas com @Publico().
 *
 * O token e lido preferencialmente do cookie httpOnly. O cabecalho
 * Authorization e aceito como alternativa, para facilitar testes e
 * integracoes que nao usam navegador.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const ehPublica = this.reflector.getAllAndOverride<boolean>(CHAVE_ROTA_PUBLICA, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    if (ehPublica) {
      return true;
    }

    const requisicao = contexto.switchToHttp().getRequest<RequisicaoAutenticada>();
    const token = this.extrairToken(requisicao);

    if (!token) {
      throw new UnauthorizedException('Entre na sua conta para continuar');
    }

    try {
      const conteudo = await this.jwtService.verifyAsync<ConteudoDoToken>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      requisicao.usuario = { id: conteudo.sub, email: conteudo.email };
      return true;
    } catch {
      throw new UnauthorizedException('Sua sessao expirou. Entre novamente.');
    }
  }

  private extrairToken(requisicao: RequisicaoAutenticada): string | null {
    const doCookie = (requisicao.cookies as Record<string, string> | undefined)?.[COOKIE_ACESSO];
    if (doCookie) {
      return doCookie;
    }

    const cabecalho = requisicao.headers.authorization;
    if (cabecalho?.startsWith('Bearer ')) {
      return cabecalho.slice(7);
    }

    return null;
  }
}
