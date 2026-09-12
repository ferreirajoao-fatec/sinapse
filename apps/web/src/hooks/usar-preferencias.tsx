'use client';

import type { FontFamily, Theme } from '@sinapse/shared';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef } from 'react';
import { usarUsuario } from '@/hooks/usar-usuario';
import { atualizarPreferencias } from '@/lib/auth';
import { PILHA_DE_FONTES } from '@/lib/fontes';

/**
 * Mantem aparencia e acessibilidade sincronizadas entre o navegador e a conta.
 *
 * O next-themes guarda o tema no navegador, o que faz a pagina carregar sem
 * piscar. A conta guarda a mesma informacao no servidor, para que a escolha
 * acompanhe o usuario em qualquer dispositivo. Este hook liga os dois.
 */
export function usarPreferencias() {
  const { usuario, definirUsuario } = usarUsuario();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const jaAplicouDoServidor = useRef(false);

  const fonte = usuario?.preferences.fontFamily ?? 'inter';
  const escala = usuario?.preferences.fontScale ?? 100;
  const movimentoReduzido = usuario?.preferences.reducedMotion ?? false;

  // Ao carregar a sessao, o que esta salvo na conta vence o que esta no navegador.
  useEffect(() => {
    if (!usuario || jaAplicouDoServidor.current) return;

    jaAplicouDoServidor.current = true;

    if (usuario.preferences.theme !== theme) {
      setTheme(usuario.preferences.theme);
    }
  }, [usuario, theme, setTheme]);

  // A escala vira uma variavel CSS: todo o layout usa rem, entao tudo acompanha.
  useEffect(() => {
    document.documentElement.style.setProperty('--escala-fonte', String(escala / 100));
  }, [escala]);

  // Mesma ideia: troca a fonte do sistema inteiro sobrescrevendo --font-sans.
  useEffect(() => {
    document.documentElement.style.setProperty('--font-sans', PILHA_DE_FONTES[fonte]);
  }, [fonte]);

  useEffect(() => {
    document.documentElement.classList.toggle('movimento-reduzido', movimentoReduzido);
  }, [movimentoReduzido]);

  const definirTema = useCallback(
    async (novo: Theme) => {
      setTheme(novo);

      if (!usuario) return;

      // Atualiza a tela na hora e reconcilia com a resposta do servidor.
      definirUsuario({ ...usuario, preferences: { ...usuario.preferences, theme: novo } });

      try {
        definirUsuario(await atualizarPreferencias({ theme: novo }));
      } catch {
        // Falhar em salvar no servidor nao pode desfazer a escolha visual.
      }
    },
    [setTheme, usuario, definirUsuario],
  );

  const definirFonte = useCallback(
    async (nova: FontFamily) => {
      if (!usuario) return;

      definirUsuario({ ...usuario, preferences: { ...usuario.preferences, fontFamily: nova } });

      try {
        definirUsuario(await atualizarPreferencias({ fontFamily: nova }));
      } catch {
        // idem
      }
    },
    [usuario, definirUsuario],
  );

  const definirEscala = useCallback(
    async (nova: number) => {
      if (!usuario) return;

      definirUsuario({ ...usuario, preferences: { ...usuario.preferences, fontScale: nova } });

      try {
        definirUsuario(await atualizarPreferencias({ fontScale: nova }));
      } catch {
        // idem
      }
    },
    [usuario, definirUsuario],
  );

  const definirMovimentoReduzido = useCallback(
    async (valor: boolean) => {
      if (!usuario) return;

      definirUsuario({
        ...usuario,
        preferences: { ...usuario.preferences, reducedMotion: valor },
      });

      try {
        definirUsuario(await atualizarPreferencias({ reducedMotion: valor }));
      } catch {
        // idem
      }
    },
    [usuario, definirUsuario],
  );

  const alternarClaroEscuro = useCallback(() => {
    void definirTema(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, definirTema]);

  return {
    tema: (theme ?? 'system') as Theme,
    temaResolvido: resolvedTheme,
    fonte,
    escala,
    movimentoReduzido,
    definirTema,
    definirFonte,
    definirEscala,
    definirMovimentoReduzido,
    alternarClaroEscuro,
  };
}
