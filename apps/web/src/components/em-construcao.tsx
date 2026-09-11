'use client';

import { Check, type LucideIcon } from 'lucide-react';
import { Trilha } from '@/components/navegacao/trilha';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Tela de secao ainda nao construida.
 *
 * Em vez de esconder o link ou levar a um erro, mostramos o que vem e em qual
 * etapa. Assim a navegacao inteira ja pode ser testada agora.
 */
export function EmConstrucao({
  Icone,
  titulo,
  etapa,
  descricao,
  recursos,
}: {
  Icone: LucideIcon;
  titulo: string;
  etapa: string;
  descricao: string;
  recursos: string[];
}) {
  return (
    <div className="space-y-6">
      <Trilha />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl tracking-tight">{titulo}</h1>
          <p className="text-sm text-[var(--texto-suave)]">{descricao}</p>
        </div>
        <Badge tom="marca">{etapa}</Badge>
      </div>

      <Card>
        <CardHeader
          titulo="O que esta previsto"
          descricao="Definido no planejamento, ainda nao implementado"
          acao={
            <span className="flex size-9 items-center justify-center rounded-md bg-[var(--superficie-suave)] text-[var(--texto-suave)]">
              <Icone aria-hidden="true" className="size-4" />
            </span>
          }
        />
        <CardContent>
          <ul className="space-y-2">
            {recursos.map((recurso) => (
              <li key={recurso} className="flex items-start gap-2.5 text-sm">
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-[var(--texto-tenue)]"
                />
                <span className="text-[var(--texto-suave)]">{recurso}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
