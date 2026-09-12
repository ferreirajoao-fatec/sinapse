import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  atualizarEventoSchema,
  criarEventoSchema,
  type AtualizarEventoInput,
  type CriarEventoInput,
} from '@sinapse/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { ValidacaoZod } from '../../common/pipes/zod-validation.pipe';
import { CalendarService } from './calendar.service';

@ApiTags('Calendario')
@ApiBearerAuth()
@Controller()
export class CalendarController {
  constructor(private readonly calendario: CalendarService) {}

  @Get('calendar-events')
  @ApiOperation({ summary: 'Ocorrencias de eventos dentro de um intervalo de datas' })
  listar(
    @UsuarioAtual('id') userId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('arquivados') arquivados?: string,
  ) {
    const desde = this.validarData(from, 'from');
    const ate = this.validarData(to, 'to');

    return this.calendario.listarOcorrencias(userId, desde, ate, arquivados === 'true');
  }

  @Post('calendar-events')
  @ApiOperation({ summary: 'Cria um evento' })
  criar(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(criarEventoSchema)) dados: CriarEventoInput,
  ) {
    return this.calendario.criar(userId, dados);
  }

  @Get('calendar-events/:id')
  @ApiOperation({ summary: 'Detalhe completo de um evento' })
  buscar(@UsuarioAtual('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.calendario.buscar(userId, id);
  }

  @Patch('calendar-events/:id')
  @ApiOperation({ summary: 'Atualiza, arquiva ou desarquiva um evento' })
  atualizar(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidacaoZod(atualizarEventoSchema)) dados: AtualizarEventoInput,
  ) {
    return this.calendario.atualizar(userId, id, dados);
  }

  @Delete('calendar-events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Move o evento para a lixeira' })
  excluir(@UsuarioAtual('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.calendario.excluir(userId, id);
  }

  private validarData(valor: string | undefined, campo: string): Date {
    if (!valor) {
      throw new BadRequestException(`Informe o parametro "${campo}".`);
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      throw new BadRequestException(`Data invalida em "${campo}".`);
    }

    return data;
  }
}
