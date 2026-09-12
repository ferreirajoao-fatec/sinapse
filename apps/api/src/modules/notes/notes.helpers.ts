import { NotFoundException } from '@nestjs/common';
import type { EntityColor, Prisma } from '@prisma/client';
import type {
  AnexoDePagina,
  EtiquetaResumida,
  GrupoNaArvore,
  PaginaNaArvore,
  SecaoNaArvore,
} from '@sinapse/shared';

/** Trecho de pagina carregado do banco para montar a arvore. */
export interface PaginaBruta {
  id: string;
  title: string;
  icon: string | null;
  position: number;
  isFavorite: boolean;
  isPinned: boolean;
  archivedAt: Date | null;
  parentPageId: string | null;
}

/**
 * Monta a arvore de subpaginas a partir da lista plana vinda do banco.
 * Uma consulta so, montagem em memoria: evita uma consulta por nivel.
 */
export function montarSubpaginas(paginas: PaginaBruta[], paiId: string | null): PaginaNaArvore[] {
  return paginas
    .filter((pagina) => pagina.parentPageId === paiId)
    .sort((a, b) => a.position - b.position)
    .map((pagina) => ({
      id: pagina.id,
      title: pagina.title,
      icon: pagina.icon,
      position: pagina.position,
      isFavorite: pagina.isFavorite,
      isPinned: pagina.isPinned,
      archivedAt: pagina.archivedAt?.toISOString() ?? null,
      subpaginas: montarSubpaginas(paginas, pagina.id),
    }));
}

export interface SecaoBruta {
  id: string;
  name: string;
  icon: string | null;
  position: number;
  archivedAt: Date | null;
  pages: PaginaBruta[];
}

export function montarSecao(secao: SecaoBruta): SecaoNaArvore {
  return {
    id: secao.id,
    name: secao.name,
    icon: secao.icon,
    position: secao.position,
    archivedAt: secao.archivedAt?.toISOString() ?? null,
    paginas: montarSubpaginas(secao.pages, null),
  };
}

export interface GrupoBruto {
  id: string;
  name: string;
  icon: string | null;
  color: EntityColor;
  position: number;
  archivedAt: Date | null;
  sections: SecaoBruta[];
}

export function montarGrupo(grupo: GrupoBruto): GrupoNaArvore {
  return {
    id: grupo.id,
    name: grupo.name,
    icon: grupo.icon,
    color: grupo.color,
    position: grupo.position,
    archivedAt: grupo.archivedAt?.toISOString() ?? null,
    secoes: [...grupo.sections].sort((a, b) => a.position - b.position).map(montarSecao),
  };
}

export function montarEtiqueta(tag: {
  id: string;
  name: string;
  color: EntityColor;
}): EtiquetaResumida {
  return { id: tag.id, name: tag.name, color: tag.color };
}

/**
 * Extrai o texto puro de um documento ProseMirror.
 * Alimenta contentText, usado pela contagem de palavras e, na Etapa 6,
 * pela pesquisa global.
 */
export function extrairTexto(no: unknown): string {
  if (!no || typeof no !== 'object') return '';

  const registro = no as { type?: string; text?: string; content?: unknown[] };

  if (registro.type === 'text' && typeof registro.text === 'string') {
    return registro.text;
  }

  if (Array.isArray(registro.content)) {
    return registro.content.map(extrairTexto).filter(Boolean).join(' ');
  }

  return '';
}

export function contarPalavras(texto: string): number {
  return texto.split(/\s+/).filter(Boolean).length;
}

/** O campo Json do Prisma nao aceita tipos com propriedades opcionais. */
export function comoJson(valor: unknown): Prisma.InputJsonObject {
  return valor as Prisma.InputJsonObject;
}

export function montarAnexo(anexo: {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
  createdAt: Date;
}): AnexoDePagina {
  return {
    id: anexo.id,
    fileName: anexo.fileName,
    mimeType: anexo.mimeType,
    sizeBytes: anexo.sizeBytes.toString(),
    createdAt: anexo.createdAt.toISOString(),
  };
}

export function exigirEncontrado<T>(valor: T | null | undefined, mensagem: string): T {
  if (valor === null || valor === undefined) {
    throw new NotFoundException(mensagem);
  }
  return valor;
}

/** Documento vazio, usado quando uma pagina e criada. */
export const DOCUMENTO_VAZIO = { type: 'doc' as const, content: [] };

/** Campos da pagina carregados para montar a arvore. */
export const SELECAO_DE_PAGINAS = {
  id: true,
  title: true,
  icon: true,
  position: true,
  isFavorite: true,
  isPinned: true,
  archivedAt: true,
  parentPageId: true,
} as const;
