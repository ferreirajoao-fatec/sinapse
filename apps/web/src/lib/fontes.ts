import type { FontFamily } from '@sinapse/shared';

/**
 * Pilha CSS de cada fonte oferecida em Aparencia. "inter" repete a pilha
 * original de --font-sans (definida em globals.css); as demais reusam as
 * variaveis de next/font/google registradas em app/layout.tsx.
 */
export const PILHA_DE_FONTES: Record<FontFamily, string> = {
  inter: 'var(--fonte-sans), ui-sans-serif, system-ui, sans-serif',
  sistema: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  roboto: 'var(--fonte-roboto), ui-sans-serif, system-ui, sans-serif',
  lexend: 'var(--fonte-lexend), ui-sans-serif, system-ui, sans-serif',
};

export const ROTULO_DA_FONTE: Record<FontFamily, string> = {
  inter: 'Padrao',
  sistema: 'Sistema',
  roboto: 'Roboto',
  lexend: 'Lexend',
};

export const DESCRICAO_DA_FONTE: Record<FontFamily, string> = {
  inter: 'A fonte que o Sinapse usa por padrao',
  sistema: 'A mesma fonte do seu sistema operacional',
  roboto: 'Neutra e bastante conhecida',
  lexend: 'Desenhada para deixar a leitura mais facil',
};
