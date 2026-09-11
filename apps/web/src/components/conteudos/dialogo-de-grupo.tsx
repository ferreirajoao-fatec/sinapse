'use client';

import { criarGrupoSchema, type EntityColor, type GrupoNaArvore } from '@sinapse/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialogo } from '@/components/ui/dialogo';
import { Input } from '@/components/ui/input';
import { usarArvore } from '@/hooks/usar-arvore';
import { ApiError } from '@/lib/api';
import { atualizarGrupo, criarGrupo } from '@/lib/conteudos';
import { SeletorDeCor } from './seletor-de-cor';
import { SeletorDeIcone } from './seletor-de-icone';

export function DialogoDeGrupo({
  aberto,
  aoFechar,
  grupo,
}: {
  aberto: boolean;
  aoFechar: () => void;
  /** Ausente cria um grupo novo; presente edita o existente. */
  grupo?: GrupoNaArvore;
}) {
  const { recarregar } = usarArvore();
  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState<string | null>(null);
  const [cor, setCor] = useState<EntityColor>('indigo');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;

    setNome(grupo?.name ?? '');
    setIcone(grupo?.icon ?? null);
    setCor(grupo?.color ?? 'indigo');
    setErro(null);
  }, [aberto, grupo]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const validacao = criarGrupoSchema.safeParse({ name: nome, icon: icone, color: cor });

    if (!validacao.success) {
      setErro(validacao.error.issues[0]?.message ?? 'Dados invalidos');
      return;
    }

    setSalvando(true);

    try {
      if (grupo) {
        await atualizarGrupo(grupo.id, validacao.data);
      } else {
        await criarGrupo(validacao.data);
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
      titulo={grupo ? 'Editar grupo' : 'Novo grupo'}
      descricao="Grupos sao o nivel mais alto, como Faculdade, Trabalho ou Estudos pessoais."
    >
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {erro ? <Alert tipo="erro">{erro}</Alert> : null}

        <Input
          rotulo="Nome"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Faculdade"
          autoComplete="off"
          maxLength={80}
        />

        <SeletorDeCor valor={cor} aoEscolher={setCor} />
        <SeletorDeIcone valor={icone} aoEscolher={setIcone} />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="submit" carregando={salvando}>
            {grupo ? 'Salvar' : 'Criar grupo'}
          </Button>
        </div>
      </form>
    </Dialogo>
  );
}
