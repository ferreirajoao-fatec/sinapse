import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tipo = 'informacao' | 'sucesso' | 'atencao' | 'erro';

const estilos: Record<Tipo, { caixa: string; icone: ReactNode }> = {
  informacao: {
    caixa:
      'bg-marca-50 text-marca-700 dark:bg-marca-900 dark:text-marca-100 border-marca-200 dark:border-marca-700',
    icone: <Info aria-hidden="true" className="size-4 shrink-0" />,
  },
  sucesso: {
    caixa:
      'bg-sucesso-100 text-sucesso-700 dark:bg-sucesso-700 dark:text-sucesso-100 border-sucesso-500/30',
    icone: <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />,
  },
  atencao: {
    caixa:
      'bg-atencao-100 text-atencao-700 dark:bg-atencao-700 dark:text-atencao-100 border-atencao-500/30',
    icone: <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />,
  },
  erro: {
    caixa:
      'bg-perigo-100 text-perigo-700 dark:bg-perigo-700 dark:text-perigo-100 border-perigo-500/30',
    icone: <XCircle aria-hidden="true" className="size-4 shrink-0" />,
  },
};

export function Alert({
  tipo = 'informacao',
  titulo,
  children,
  className,
}: {
  tipo?: Tipo;
  titulo?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-md border px-4 py-3 text-sm',
        estilos[tipo].caixa,
        className,
      )}
    >
      <span className="mt-0.5">{estilos[tipo].icone}</span>
      <div className="space-y-0.5">
        {titulo ? <p className="font-medium">{titulo}</p> : null}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
