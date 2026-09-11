'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usarUsuario } from '@/hooks/usar-usuario';
import { reenviarVerificacao } from '@/lib/auth';

/**
 * Faixa que lembra de confirmar o e-mail.
 *
 * Optamos por nao bloquear o acesso de quem ainda nao confirmou: bloquear
 * frustra quem so quer experimentar. A confirmacao passa a ser exigida quando
 * a conta for usada para compartilhar conteudo, na etapa de colaboracao.
 */
export function AvisoDeVerificacao() {
  const { usuario } = usarUsuario();
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  if (!usuario || usuario.emailVerified) {
    return null;
  }

  async function reenviar() {
    if (!usuario) return;

    setEnviando(true);
    try {
      await reenviarVerificacao(usuario.email);
      setEnviado(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Alert tipo="atencao" titulo="Confirme seu e-mail">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span>
          {enviado
            ? `Reenviamos o link para ${usuario.email}. Confira sua caixa de entrada.`
            : `Enviamos um link para ${usuario.email}. Confirmar garante que voce consegue recuperar a conta.`}
        </span>
        {!enviado ? (
          <Button variante="secundario" tamanho="sm" carregando={enviando} onClick={() => void reenviar()}>
            Reenviar
          </Button>
        ) : null}
      </div>
    </Alert>
  );
}
