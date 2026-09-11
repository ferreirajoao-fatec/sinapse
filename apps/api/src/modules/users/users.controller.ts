import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  alterarSenhaSchema,
  atualizarPerfilSchema,
  atualizarPreferenciasSchema,
  excluirContaSchema,
  type AlterarSenhaInput,
  type AtualizarPerfilInput,
  type AtualizarPreferenciasInput,
  type ExcluirContaInput,
} from '@sinapse/shared';
import type { Response } from 'express';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { ValidacaoZod } from '../../common/pipes/zod-validation.pipe';
import { TokenService } from '../auth/token.service';
import { UsersService } from './users.service';

@ApiTags('Usuario')
@ApiBearerAuth()
@Controller('me')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Dados da conta autenticada' })
  buscar(@UsuarioAtual('id') userId: string) {
    return this.users.buscarPerfilPublico(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Atualiza nome e foto de perfil' })
  atualizar(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(atualizarPerfilSchema)) dados: AtualizarPerfilInput,
  ) {
    return this.users.atualizarPerfil(userId, dados);
  }

  @Patch('preferencias')
  @ApiOperation({ summary: 'Atualiza tema, idioma e acessibilidade' })
  atualizarPreferencias(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(atualizarPreferenciasSchema)) dados: AtualizarPreferenciasInput,
  ) {
    return this.users.atualizarPreferencias(userId, dados);
  }

  @Patch('senha')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Altera a senha, exigindo a senha atual' })
  async alterarSenha(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(alterarSenhaSchema)) dados: AlterarSenhaInput,
  ): Promise<void> {
    await this.users.alterarSenha(userId, dados);
  }

  @Get('exportar')
  @ApiOperation({ summary: 'Exporta os dados pessoais em JSON (LGPD)' })
  exportar(@UsuarioAtual('id') userId: string) {
    return this.users.exportarDados(userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui a conta e todos os dados vinculados' })
  async excluir(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(excluirContaSchema)) dados: ExcluirContaInput,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<void> {
    await this.users.excluirConta(userId, dados.senha);
    this.tokens.limparCookies(resposta);
  }
}
