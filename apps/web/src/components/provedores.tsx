'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { ProvedorDaArvore } from '@/hooks/usar-arvore';
import { ProvedorDeNavegacao } from '@/hooks/usar-navegacao';
import { ProvedorDeUsuario } from '@/hooks/usar-usuario';

/**
 * Provedores globais do aplicativo.
 * A ordem importa: a arvore de conteudos depende da sessao carregada.
 */
export function Provedores({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ProvedorDeUsuario>
        <ProvedorDaArvore>
          <ProvedorDeNavegacao>{children}</ProvedorDeNavegacao>
        </ProvedorDaArvore>
      </ProvedorDeUsuario>
    </ThemeProvider>
  );
}
