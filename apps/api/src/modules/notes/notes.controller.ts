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
  atualizarEtiquetaSchema,
  atualizarGrupoSchema,
  atualizarPaginaSchema,
  atualizarSecaoSchema,
  criarEtiquetaSchema,
  criarGrupoSchema,
  criarPaginaSchema,
  criarSecaoSchema,
  definirEtiquetasSchema,
  moverPaginaSchema,
  reordenarSchema,
  TIPOS_NA_LIXEIRA,
  type AtualizarEtiquetaInput,
  type AtualizarGrupoInput,
  type AtualizarPaginaInput,
  type AtualizarSecaoInput,
  type CriarEtiquetaInput,
  type CriarGrupoInput,
  type CriarPaginaInput,
  type CriarSecaoInput,
  type DefinirEtiquetasInput,
  type MoverPaginaInput,
  type ReordenarInput,
  type TipoNaLixeira,
} from '@sinapse/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { ValidacaoZod } from '../../common/pipes/zod-validation.pipe';
import { GroupsService } from './groups.service';
import { PagesService } from './pages.service';
import { SectionsService } from './sections.service';
import { TagsService } from './tags.service';
import { TrashService } from './trash.service';

@ApiTags('Anotacoes')
@ApiBearerAuth()
@Controller()
export class NotesController {
  constructor(
    private readonly grupos: GroupsService,
    private readonly secoes: SectionsService,
    private readonly paginas: PagesService,
    private readonly etiquetas: TagsService,
    private readonly lixeira: TrashService,
  ) {}

  // ---------------------------------------------------------------------------
  // Arvore
  // ---------------------------------------------------------------------------

  @Get('tree')
  @ApiOperation({ summary: 'Arvore completa de grupos, secoes e paginas' })
  arvore(@UsuarioAtual('id') userId: string, @Query('arquivados') arquivados?: string) {
    return this.grupos.arvore(userId, arquivados === 'true');
  }

  // ---------------------------------------------------------------------------
  // Grupos
  // ---------------------------------------------------------------------------

  @Post('groups')
  @ApiOperation({ summary: 'Cria um grupo' })
  criarGrupo(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(criarGrupoSchema)) dados: CriarGrupoInput,
  ) {
    return this.grupos.criar(userId, dados);
  }

  @Patch('groups/:id')
  @ApiOperation({ summary: 'Renomeia, troca icone ou cor, arquiva ou desarquiva' })
  atualizarGrupo(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidacaoZod(atualizarGrupoSchema)) dados: AtualizarGrupoInput,
  ) {
    return this.grupos.atualizar(userId, id, dados);
  }

  @Delete('groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Move o grupo e o conteudo dele para a lixeira' })
  excluirGrupo(@UsuarioAtual('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.grupos.excluir(userId, id);
  }

  @Post('groups/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Salva a nova ordem dos grupos' })
  reordenarGrupos(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(reordenarSchema)) dados: ReordenarInput,
  ) {
    return this.grupos.reordenar(userId, dados);
  }

  // ---------------------------------------------------------------------------
  // Secoes
  // ---------------------------------------------------------------------------

  @Post('sections')
  @ApiOperation({ summary: 'Cria uma secao dentro de um grupo' })
  criarSecao(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(criarSecaoSchema)) dados: CriarSecaoInput,
  ) {
    return this.secoes.criar(userId, dados);
  }

  @Patch('sections/:id')
  @ApiOperation({ summary: 'Renomeia, troca icone, arquiva ou desarquiva' })
  atualizarSecao(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidacaoZod(atualizarSecaoSchema)) dados: AtualizarSecaoInput,
  ) {
    return this.secoes.atualizar(userId, id, dados);
  }

  @Delete('sections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Move a secao e as paginas dela para a lixeira' })
  excluirSecao(@UsuarioAtual('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.secoes.excluir(userId, id);
  }

  @Post('sections/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Salva a nova ordem das secoes' })
  reordenarSecoes(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(reordenarSchema)) dados: ReordenarInput,
  ) {
    return this.secoes.reordenar(userId, dados);
  }

  // ---------------------------------------------------------------------------
  // Paginas
  // ---------------------------------------------------------------------------

  @Get('pages/recentes')
  @ApiOperation({ summary: 'Paginas abertas recentemente' })
  paginasRecentes(@UsuarioAtual('id') userId: string) {
    return this.paginas.recentes(userId);
  }

  @Get('pages/favoritas')
  @ApiOperation({ summary: 'Paginas marcadas como favoritas' })
  paginasFavoritas(@UsuarioAtual('id') userId: string) {
    return this.paginas.favoritas(userId);
  }

  @Get('pages/:id')
  @ApiOperation({ summary: 'Conteudo completo de uma pagina' })
  buscarPagina(@UsuarioAtual('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.paginas.buscar(userId, id);
  }

  @Post('pages')
  @ApiOperation({ summary: 'Cria uma pagina ou subpagina' })
  criarPagina(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(criarPaginaSchema)) dados: CriarPaginaInput,
  ) {
    return this.paginas.criar(userId, dados);
  }

  @Patch('pages/:id')
  @ApiOperation({ summary: 'Atualiza titulo, icone, conteudo, favorito ou arquivamento' })
  atualizarPagina(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidacaoZod(atualizarPaginaSchema)) dados: AtualizarPaginaInput,
  ) {
    return this.paginas.atualizar(userId, id, dados);
  }

  @Delete('pages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Move a pagina e as subpaginas para a lixeira' })
  excluirPagina(@UsuarioAtual('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.paginas.excluir(userId, id);
  }

  @Post('pages/:id/mover')
  @ApiOperation({ summary: 'Move a pagina para outra secao ou pagina superior' })
  moverPagina(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidacaoZod(moverPaginaSchema)) dados: MoverPaginaInput,
  ) {
    return this.paginas.mover(userId, id, dados);
  }

  @Post('pages/:id/duplicar')
  @ApiOperation({ summary: 'Cria uma copia da pagina na mesma secao' })
  duplicarPagina(@UsuarioAtual('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.paginas.duplicar(userId, id);
  }

  @Post('pages/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Salva a nova ordem das paginas' })
  reordenarPaginas(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(reordenarSchema)) dados: ReordenarInput,
  ) {
    return this.paginas.reordenar(userId, dados);
  }

  @Post('pages/:id/etiquetas')
  @ApiOperation({ summary: 'Define a lista completa de etiquetas da pagina' })
  definirEtiquetas(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidacaoZod(definirEtiquetasSchema)) dados: DefinirEtiquetasInput,
  ) {
    return this.paginas.definirEtiquetas(userId, id, dados);
  }

  // ---------------------------------------------------------------------------
  // Etiquetas
  // ---------------------------------------------------------------------------

  @Get('tags')
  @ApiOperation({ summary: 'Etiquetas do usuario, com a contagem de paginas' })
  listarEtiquetas(@UsuarioAtual('id') userId: string) {
    return this.etiquetas.listar(userId);
  }

  @Post('tags')
  @ApiOperation({ summary: 'Cria uma etiqueta' })
  criarEtiqueta(
    @UsuarioAtual('id') userId: string,
    @Body(new ValidacaoZod(criarEtiquetaSchema)) dados: CriarEtiquetaInput,
  ) {
    return this.etiquetas.criar(userId, dados);
  }

  @Patch('tags/:id')
  @ApiOperation({ summary: 'Renomeia ou troca a cor de uma etiqueta' })
  atualizarEtiqueta(
    @UsuarioAtual('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidacaoZod(atualizarEtiquetaSchema)) dados: AtualizarEtiquetaInput,
  ) {
    return this.etiquetas.atualizar(userId, id, dados);
  }

  @Delete('tags/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui a etiqueta, sem apagar as paginas' })
  excluirEtiqueta(@UsuarioAtual('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.etiquetas.excluir(userId, id);
  }

  // ---------------------------------------------------------------------------
  // Lixeira
  // ---------------------------------------------------------------------------

  @Get('trash')
  @ApiOperation({ summary: 'Itens na lixeira' })
  listarLixeira(@UsuarioAtual('id') userId: string) {
    return this.lixeira.listar(userId);
  }

  @Post('trash/:tipo/:id/restaurar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Restaura o item e o que caiu junto com ele' })
  restaurar(
    @UsuarioAtual('id') userId: string,
    @Param('tipo') tipo: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.lixeira.restaurar(userId, this.validarTipo(tipo), id);
  }

  @Delete('trash/:tipo/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui o item definitivamente' })
  excluirDefinitivamente(
    @UsuarioAtual('id') userId: string,
    @Param('tipo') tipo: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.lixeira.excluirDefinitivamente(userId, this.validarTipo(tipo), id);
  }

  @Delete('trash')
  @ApiOperation({ summary: 'Esvazia a lixeira' })
  esvaziarLixeira(@UsuarioAtual('id') userId: string) {
    return this.lixeira.esvaziar(userId);
  }

  private validarTipo(tipo: string): TipoNaLixeira {
    if (!TIPOS_NA_LIXEIRA.includes(tipo as TipoNaLixeira)) {
      throw new BadRequestException('Tipo invalido. Use grupo, secao ou pagina.');
    }

    return tipo as TipoNaLixeira;
  }
}
