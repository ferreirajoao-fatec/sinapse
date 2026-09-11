'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { usarNavegacao } from '@/hooks/usar-navegacao';
import { usarPreferencias } from '@/hooks/usar-preferencias';
import { estaDigitando } from '@/lib/atalhos';

/** Sequencias iniciadas por G, no estilo "ir para". */
const DESTINOS: Record<string, string> = {
  i: '/',
  n: '/notas',
  t: '/tarefas',
  c: '/calendario',
  l: '/lixeira',
  p: '/configuracoes/perfil',
};

/**
 * Registra os atalhos globais de teclado.
 *
 * Duas regras evitam surpresas: nada dispara enquanto o foco esta em um campo
 * de texto, e a sequencia "G seguido de letra" expira em 1,2 segundo, para que
 * um G digitado por engano nao fique armado esperando a proxima tecla.
 */
export function usarAtalhos(): void {
  const router = useRouter();
  const navegacao = usarNavegacao();
  const { alternarClaroEscuro } = usarPreferencias();

  const aguardandoDestino = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function aoPressionar(evento: KeyboardEvent) {
      const tecla = evento.key.toLowerCase();

      if (evento.ctrlKey || evento.metaKey) {
        if (tecla === 'k') {
          evento.preventDefault();
          navegacao.abrirPaleta();
          return;
        }

        // Ctrl+B e Ctrl+S pertencem ao editor quando o foco esta nele:
        // negrito e salvar valem mais ali do que recolher a barra lateral.
        if (estaDigitando(evento.target) && (tecla === 'b' || tecla === 's')) {
          return;
        }

        if (tecla === 'b') {
          evento.preventDefault();
          navegacao.alternarRecolhida();
          return;
        }

        if (tecla === 'j') {
          evento.preventDefault();
          alternarClaroEscuro();
          return;
        }

        return;
      }

      if (estaDigitando(evento.target)) {
        return;
      }

      if (evento.key === '?') {
        evento.preventDefault();
        navegacao.abrirAjuda();
        return;
      }

      if (aguardandoDestino.current) {
        aguardandoDestino.current = false;
        if (temporizador.current) clearTimeout(temporizador.current);

        const destino = DESTINOS[tecla];
        if (destino) {
          evento.preventDefault();
          router.push(destino);
        }
        return;
      }

      if (tecla === 'g') {
        aguardandoDestino.current = true;
        if (temporizador.current) clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => {
          aguardandoDestino.current = false;
        }, 1200);
      }
    }

    window.addEventListener('keydown', aoPressionar);

    return () => {
      window.removeEventListener('keydown', aoPressionar);
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [router, navegacao, alternarClaroEscuro]);
}
