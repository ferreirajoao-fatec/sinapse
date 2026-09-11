'use client';

import { criarSecaoSchema, type SecaoNaArvore } from '@sinapse/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialogo } from '@/components/ui/dialogo';
import { Input } from '@/components/ui/input';
import { usarArvore } from '@/hooks/usar-arvore';
import { ApiError } from '@/lib/api';
import { atualizarSecao, criarSecao } from '@/lib/conteudos';
import { SeletorDeIcone } from './seletor-de-icone';

export function DialogoDeSecao({
  aberto,
  aoFechar,
  grupoId,
  secao,
}: {
  aberto: boolean;
  aoFechar: () => void;
  grupoId: string;
  secao?: SecaoNaArvore;
}) {
  const { recarregar } = usarArvore();
  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;

    setNome(secao?.name ?? '');
    setIcone(secao?.icon ?? null);
    setErro(null);
  }, [aberto, secao]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const validacao = criarSecaoSchema.safeParse({ groupId: grupoId, name: nome, icon: icone });

    if (!validacao.success) {
      setErro(validacao.error.issues[0]?.message ?? 'Dados invalidos');
      return;
    }

    setSalvando(true);

    try {
      if (secao) {
        await atualizarSecao(secao.id, { name: validacao.data.name, icon: validacao.data.icon });
      } else {
        await criarSecao(validacao.data);
      }

      await recarregar();
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
      titulo={secao ? 'Editar secao' : 'Nova secao'}
      descricao="Secoes dividem o grupo por materia ou assunto."
    >
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {erro ? <Alert tipo="erro">{erro}</Alert> : null}

        <Input
          rotulo="Nome"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Banco de Dados"
          autoComplete="off"
          maxLength={80}
        />

        <SeletorDeIcone valor={icone} aoEscolher={setIcone} />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="submit" carregando={salvando}>
            {secao ? 'Salvar' : 'Criar secao'}
          </Button>
        </div>
      </form>
    </Dialogo>
  );
}
