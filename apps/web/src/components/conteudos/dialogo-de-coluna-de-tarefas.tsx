'use client';

import {
  criarColunaDeTarefasSchema,
  type ColunaDeTarefas,
  type EntityColor,
} from '@sinapse/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialogo } from '@/components/ui/dialogo';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { atualizarColunaDeTarefas, criarColunaDeTarefas } from '@/lib/tarefas';
import { SeletorDeCor } from './seletor-de-cor';

export function DialogoDeColunaDeTarefas({
  aberto,
  aoFechar,
  aoSalvar,
  coluna,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
  /** Ausente cria uma coluna nova; presente edita a existente. */
  coluna?: ColunaDeTarefas;
}) {
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState<EntityColor>('indigo');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;

    setNome(coluna?.name ?? '');
    setCor(coluna?.color ?? 'indigo');
    setErro(null);
  }, [aberto, coluna]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const validacao = criarColunaDeTarefasSchema.safeParse({ name: nome, color: cor });

    if (!validacao.success) {
      setErro(validacao.error.issues[0]?.message ?? 'Dados invalidos');
      return;
    }

    setSalvando(true);

    try {
      if (coluna) {
        await atualizarColunaDeTarefas(coluna.id, validacao.data);
      } else {
        await criarColunaDeTarefas(validacao.data);
      }

      await aoSalvar();
      aoFechar();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={coluna ? 'Editar coluna' : 'Nova coluna'}
      descricao="Colunas organizam o quadro Kanban, como A fazer, Em andamento ou Feito."
    >
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {erro ? <Alert tipo="erro">{erro}</Alert> : null}

        <Input
          rotulo="Nome"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="A fazer"
          autoComplete="off"
          maxLength={80}
        />

        <SeletorDeCor valor={cor} aoEscolher={setCor} />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="submit" carregando={salvando}>
            {coluna ? 'Salvar' : 'Criar coluna'}
          </Button>
        </div>
      </form>
    </Dialogo>
  );
}
