import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Junta classes do Tailwind resolvendo conflitos.
 * Ex.: cn('p-2', condicao && 'p-4') resulta em 'p-4'.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formata bytes em uma unidade legivel. */
export function formatarBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  const indice = Math.floor(Math.log(bytes) / Math.log(1024));
  const valor = bytes / Math.pow(1024, indice);
  return `${valor.toFixed(indice === 0 ? 0 : 1)} ${unidades[indice]}`;
}
