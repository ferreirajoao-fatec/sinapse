'use client';

import { Database, RefreshCw, Server } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { HealthResponse } from '@sinapse/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { buscarSaude } from '@/lib/api';

type Estado =
  | { situacao: 'carregando' }
  | { situacao: 'pronto'; dados: HealthResponse }
  | { situacao: 'erro'; mensagem: string };

/**
 * Cartao de verificacao da Etapa 0.
 * Prova, na tela, que o frontend fala com a API e que a API fala com o banco.
 */
export function EstadoDaApi() {
  const [estado, setEstado] = useState<Estado>({ situacao: 'carregando' });

  const verificar = useCallback(async () => {
    setEstado({ situacao: 'carregando' });
    try {
      setEstado({ situacao: 'pronto', dados: await buscarSaude() });
    } catch (erro) {
      setEstado({
        situacao: 'erro',
        mensagem: erro instanceof Error ? erro.message : 'Falha desconhecida',
      });
    }
  }, []);

  useEffect(() => {
    void verificar();
  }, [verificar]);

  return (
    <Card>
      <CardHeader
        titulo="Verificacao do ambiente"
        descricao="Estado da API e da conexao com o banco de dados"
        acao={
          <Button
            variante="secundario"
            tamanho="sm"
            onClick={() => void verificar()}
            carregando={estado.situacao === 'carregando'}
          >
            {estado.situacao !== 'carregando' && (
              <RefreshCw aria-hidden="true" className="size-3.5" />
            )}
            Verificar
          </Button>
        }
      />
      <CardContent className="space-y-3">
        {estado.situacao === 'carregando' ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : null}

        {estado.situacao === 'erro' ? (
          <Alert tipo="erro" titulo="A API nao respondeu">
            {estado.mensagem} Abra um terminal na raiz do projeto e execute{' '}
            <code className="font-mono text-xs">pnpm dev:api</code>.
          </Alert>
        ) : null}

        {estado.situacao === 'pronto' ? (
          <div className="animate-surgir space-y-3">
            <Linha
              icone={<Server aria-hidden="true" className="size-4" />}
              titulo="API"
              detalhe={`${estado.dados.app} ${estado.dados.version} - ambiente ${estado.dados.environment} - no ar ha ${estado.dados.uptimeSeconds}s`}
              badge={
                <Badge tom={estado.dados.status === 'ok' ? 'sucesso' : 'atencao'}>
                  {estado.dados.status === 'ok' ? 'Respondendo' : 'Degradada'}
                </Badge>
              }
            />
            <Linha
              icone={<Database aria-hidden="true" className="size-4" />}
              titulo="PostgreSQL"
              detalhe={
                estado.dados.database.connected
                  ? `Consulta de teste respondida em ${estado.dados.database.latencyMs} ms`
                  : (estado.dados.database.error ?? 'Sem conexao')
              }
              badge={
                <Badge tom={estado.dados.database.connected ? 'sucesso' : 'perigo'}>
                  {estado.dados.database.connected ? 'Conectado' : 'Desconectado'}
                </Badge>
              }
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Linha({
  icone,
  titulo,
  detalhe,
  badge,
}: {
  icone: ReactNode;
  titulo: string;
  detalhe: string;
  badge: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-[var(--superficie-suave)] px-4 py-3">
      <span className="text-[var(--texto-suave)]">{icone}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{titulo}</p>
        <p className="truncate text-xs text-[var(--texto-suave)]">{detalhe}</p>
      </div>
      {badge}
    </div>
  );
}
