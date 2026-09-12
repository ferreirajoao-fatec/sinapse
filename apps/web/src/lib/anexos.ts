import { API_URL } from './api';

/**
 * Endereco estavel para usar direto em <img src>: redireciona (302) para
 * uma URL assinada nova a cada acesso, entao nunca expira feito a URL de
 * download. As imagens embutidas na anotacao apontam para ele.
 */
export function urlDaImagemDaPagina(paginaId: string, anexoId: string): string {
  return `${API_URL}/pages/${paginaId}/anexos/${anexoId}/imagem`;
}

export function formatarBytes(valor: string): string {
  const bytes = Number(valor);
  if (!Number.isFinite(bytes)) return valor;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Sobe o arquivo direto no storage usando a URL assinada. Nunca passa pela API. */
export async function subirArquivo(url: string, arquivo: File): Promise<void> {
  const resposta = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': arquivo.type },
    body: arquivo,
  });

  if (!resposta.ok) {
    throw new Error('Nao foi possivel enviar o arquivo.');
  }
}
