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
