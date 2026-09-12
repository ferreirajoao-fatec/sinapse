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
  adicionarItemDeChecklistSchema,
  atualizarColunaDeTarefasSchema,
  atualizarItemDeChecklistSchema,
  atualizarTarefaSchema,
  confirmarUploadSchema,
  criarColunaDeTarefasSchema,
  criarTarefaSchema,
  criarUrlDeUploadSchema,
  moverTarefaSchema,
  reordenarSchema,
  TASK_PRIORITIES,
  type AdicionarItemDeChecklistInput,
  type AtualizarColunaDeTarefasInput,
  type AtualizarItemDeChecklistInput,
  type AtualizarTarefaInput,
  type ConfirmarUploadInput,
  type CriarColunaDeTarefasInput,
  type CriarTarefaInput,
  type CriarUrlDeUploadInput,
  type MoverTarefaInput,
  type ReordenarInput,
  type TaskPriority,
} from '@sinapse/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { ValidacaoZod } from '../../common/pipes/zod-validation.pipe';
import { TaskColumnsService } from './task-columns.service';
import { TasksService } from './tasks.service';

@ApiTags('Tarefas')
@ApiBearerAuth()
@Controller()
export class TasksController {
  constructor(
    private readonly colunas: TaskColumnsService,
    private readonly tarefas: TasksService,
  ) {}

  // ---------------------------------------------------------------------------
  // Colunas (quadro Kanban)
  // ---------------------------------------------------------------------------

  @Get('task-columns')
  @ApiOperation({ summary: 'Quadro completo: colunas com as tarefas ja aninhadas' })
  quadro(@UsuarioAtual('id') userId: string, @Query('arquivadas') arquivadas?: string) {
    return this.colunas.quadro(userId, arquivadas === 'true');
  }

  @Post('task-columns')
  @ApiOperation({ summary: 'Cria uma coluna de tarefas' })
  criarColuna(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(criarColunaDeTarefasSchema)) dados: CriarColunaDeTarefasInput,
  ) {
    return this.colunas.criar(userId, dados);
  }

  @Patch('task-columns/:id')
  @ApiOperation({ summary: 'Renomeia, troca a cor, arquiva ou desarquiva a coluna' })
  atualizarColuna(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidacaoZod(atualizarColunaDeTarefasSchema)) dados: AtualizarColunaDeTarefasInput,
  ) {
    return this.colunas.atualizar(userId, id, dados);
  }

  @Delete('task-columns/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Move a coluna e as tarefas dela para a lixeira' })
  excluirColuna(@UsuarioAtual('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.colunas.excluir(userId, id);
  }

  @Post('task-columns/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Salva a nova ordem das colunas' })
  reordenarColunas(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(reordenarSchema)) dados: ReordenarInput,
  ) {
    return this.colunas.reordenar(userId, dados);
  }

  // ---------------------------------------------------------------------------
  // Tarefas (visao de lista, com filtros)
  // ---------------------------------------------------------------------------

  @Get('tasks/anexos/disponivel')
  @ApiOperation({ summary: 'Informa se o envio de anexos esta configurado' })
  anexosDisponivel() {
    return { habilitado: this.tarefas.anexosHabilitados };
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Lista tarefas com filtros' })
  listar(
    @UsuarioAtual('id') userId: string,
    @Query('columnId') columnId?: string,
    @Query('priority') priority?: string,
    @Query('pageId') pageId?: string,
    @Query('concluida') concluida?: string,
    @Query('atrasada') atrasada?: string,
    @Query('arquivadas') arquivadas?: string,
  ) {
    return this.tarefas.listar(userId, {
      columnId,
      priority: this.validarPrioridade(priority),
      pageId,
      concluida: concluida === undefined ? undefined : concluida === 'true',
      atrasada: atrasada === 'true',
      arquivadas: arquivadas === 'true',
    });
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Cria uma tarefa dentro de uma coluna' })
  criarTarefa(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(criarTarefaSchema)) dados: CriarTarefaInput,
  ) {
    return this.tarefas.criar(userId, dados);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Detalhe completo de uma tarefa' })
  buscarTarefa(@UsuarioAtual('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.tarefas.buscar(userId, id);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Atualiza titulo, prioridade, prazo, pagina, conclui ou arquiva' })
  atualizarTarefa(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidacaoZod(atualizarTarefaSchema)) dados: AtualizarTarefaInput,
  ) {
    return this.tarefas.atualizar(userId, id, dados);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Move a tarefa para a lixeira' })
  excluirTarefa(@UsuarioAtual('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.tarefas.excluir(userId, id);
  }

  @Post('tasks/:id/mover')
  @ApiOperation({ summary: 'Move a tarefa para outra coluna (drag do Kanban)' })
  moverTarefa(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidacaoZod(moverTarefaSchema)) dados: MoverTarefaInput,
  ) {
    return this.tarefas.mover(userId, id, dados);
  }

  @Post('tasks/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Salva a nova ordem das tarefas dentro da coluna' })
  reordenarTarefas(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(reordenarSchema)) dados: ReordenarInput,
  ) {
    return this.tarefas.reordenar(userId, dados);
  }

  // ---------------------------------------------------------------------------
  // Checklist
  // ---------------------------------------------------------------------------

  @Post('tasks/:id/checklist')
  @ApiOperation({ summary: 'Adiciona um item ao checklist da tarefa' })
  adicionarItemDeChecklist(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidacaoZod(adicionarItemDeChecklistSchema)) dados: AdicionarItemDeChecklistInput,
  ) {
    return this.tarefas.adicionarItemDeChecklist(userId, id, dados);
  }

  @Patch('tasks/:id/checklist/:itemId')
  @ApiOperation({ summary: 'Marca, desmarca ou renomeia um item do checklist' })
  atualizarItemDeChecklist(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body(new ValidacaoZod(atualizarItemDeChecklistSchema)) dados: AtualizarItemDeChecklistInput,
  ) {
    return this.tarefas.atualizarItemDeChecklist(userId, id, itemId, dados);
  }

  @Delete('tasks/:id/checklist/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um item do checklist' })
  removerItemDeChecklist(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.tarefas.removerItemDeChecklist(userId, id, itemId);
  }

  // ---------------------------------------------------------------------------
  // Anexos
  // ---------------------------------------------------------------------------

  @Post('tasks/:id/anexos/upload-url')
  @ApiOperation({ summary: 'Gera uma URL assinada para subir um anexo direto no storage' })
  criarUrlDeUpload(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidacaoZod(criarUrlDeUploadSchema)) dados: CriarUrlDeUploadInput,
  ) {
    return this.tarefas.criarUrlDeUpload(userId, id, dados);
  }

  @Post('tasks/:id/anexos')
  @ApiOperation({ summary: 'Confirma que o upload terminou e registra o anexo' })
  confirmarUpload(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidacaoZod(confirmarUploadSchema)) dados: ConfirmarUploadInput,
  ) {
    return this.tarefas.confirmarUpload(userId, id, dados);
  }

  @Get('tasks/:id/anexos/:anexoId/download-url')
  @ApiOperation({ summary: 'Gera uma URL assinada temporaria para baixar o anexo' })
  urlDeDownload(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('anexoId', ParseUUIDPipe) anexoId: string,
  ) {
    return this.tarefas.urlDeDownload(userId, id, anexoId);
  }

  @Delete('tasks/:id/anexos/:anexoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove o anexo' })
  removerAnexo(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('anexoId', ParseUUIDPipe) anexoId: string,
  ) {
    return this.tarefas.removerAnexo(userId, id, anexoId);
  }

  private validarPrioridade(valor?: string): TaskPriority | undefined {
    if (valor === undefined) return undefined;

    if (!TASK_PRIORITIES.includes(valor as TaskPriority)) {
      throw new BadRequestException('Prioridade invalida. Use low, medium, high ou urgent.');
    }

    return valor as TaskPriority;
  }
}
