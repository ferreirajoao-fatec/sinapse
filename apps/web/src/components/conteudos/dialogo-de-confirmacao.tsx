'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialogo } from '@/components/ui/dialogo';

/**
 * Confirmacao para acoes destrutivas.
 * Sempre diz o que acontece com o conteudo, e nao apenas "tem certeza?".
 */
export function DialogoDeConfirmacao({
  aberto,
  aoFechar,
  titulo,
  descricao,
  aviso,
  rotuloDeConfirmacao,
  perigosa = true,
  aoConfirmar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao: string;
  aviso?: string;
  rotuloDeConfirmacao: string;
  perigosa?: boolean;
  aoConfirmar: () => Promise<void>;
}) {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setErro(null);
    setProcessando(true);

    try {
      await aoConfirmar();
      aoFechar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Nao foi possivel concluir.');
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Dialogo aberto={aberto} aoFechar={aoFechar} titulo={titulo} descricao={descricao}>
      <div className="space-y-4">
        {erro ? <Alert tipo="erro">{erro}</Alert> : null}
        {aviso ? <Alert tipo="atencao">{aviso}</Alert> : null}

        <div className="flex justify-end gap-2">
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            variante={perigosa ? 'perigo' : 'primario'}
            carregando={processando}
            onClick={() => void confirmar()}
          >
            {rotuloDeConfirmacao}
          </Button>
        </div>
      </div>
    </Dialogo>
  );
}
