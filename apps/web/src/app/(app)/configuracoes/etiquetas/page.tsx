'use client';

import { criarEtiquetaSchema, type EntityColor, type EtiquetaResumida } from '@sinapse/shared';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { DialogoDeConfirmacao } from '@/components/conteudos/dialogo-de-confirmacao';
import { SeletorDeCor } from '@/components/conteudos/seletor-de-cor';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { criarEtiqueta, excluirEtiqueta, listarEtiquetas } from '@/lib/conteudos';
import { corDeConteudo } from '@/lib/icones-de-conteudo';
import { cn } from '@/lib/utils';

export default function PaginaDeEtiquetas() {
  const [etiquetas, setEtiquetas] = useState<EtiquetaResumida[] | null>(null);
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState<EntityColor>('slate');
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<EtiquetaResumida | null>(null);

  async function carregar() {
    try {
      setEtiquetas(await listarEtiquetas());
    } catch {
      setEtiquetas([]);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const validacao = criarEtiquetaSchema.safeParse({ name: nome, color: cor });

    if (!validacao.success) {
      setErro(validacao.error.issues[0]?.message ?? 'Nome invalido');
      return;
    }

    setCriando(true);

    try {
      await criarEtiqueta(validacao.data);
      setNome('');
      await carregar();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel criar a etiqueta.');
    } finally {
      setCriando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl tracking-tight">Etiquetas</h1>
        <p className="text-sm text-[var(--texto-suave)]">
          Etiquetas cruzam grupos: uma pagina de Banco de Dados e outra de Redes podem compartilhar
          a mesma marcacao de revisao.
        </p>
      </div>

      <Card>
        <CardHeader titulo="Nova etiqueta" />
        <CardContent>
          <form onSubmit={enviar} className="space-y-4" noValidate>
            {erro ? <Alert tipo="erro">{erro}</Alert> : null}

            <Input
              rotulo="Nome"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              placeholder="revisar"
              auxilio="O nome e guardado em minusculas, para evitar duplicatas."
              autoComplete="off"
              maxLength={40}
            />

            <SeletorDeCor valor={cor} aoEscolher={setCor} />

            <Button type="submit" carregando={criando}>
              <Plus aria-hidden="true" className="size-4" />
              Criar etiqueta
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          titulo="Suas etiquetas"
          descricao="Excluir uma etiqueta nao apaga nenhuma pagina"
        />
        <CardContent>
          {etiquetas === null ? (
            <div className="space-y-2" aria-hidden="true">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : etiquetas.length === 0 ? (
            <EstadoVazio
              icone={<Tag className="size-5" />}
              titulo="Nenhuma etiqueta ainda"
              descricao="Crie a primeira acima, ou direto na tela de uma pagina."
            />
          ) : (
            <ul className="divide-y">
              {etiquetas.map((etiqueta) => (
                <li key={etiqueta.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                  <span
                    className={cn('size-3 shrink-0 rounded-full', corDeConteudo(etiqueta.color).ponto)}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{etiqueta.name}</span>
                  <Badge>
                    {etiqueta.totalDePaginas ?? 0}{' '}
                    {etiqueta.totalDePaginas === 1 ? 'pagina' : 'paginas'}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setParaExcluir(etiqueta)}
                    aria-label={`Excluir a etiqueta ${etiqueta.name}`}
                    className="text-perigo-700 dark:text-perigo-500 flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-[var(--superficie-suave)]"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {paraExcluir ? (
        <DialogoDeConfirmacao
          aberto
          aoFechar={() => setParaExcluir(null)}
          titulo={`Excluir a etiqueta "${paraExcluir.name}"?`}
          descricao="Ela sera removida das paginas que a usam. As paginas continuam intactas."
          rotuloDeConfirmacao="Excluir etiqueta"
          aoConfirmar={async () => {
            await excluirEtiqueta(paraExcluir.id);
            await carregar();
          }}
        />
      ) : null}
    </div>
  );
}
