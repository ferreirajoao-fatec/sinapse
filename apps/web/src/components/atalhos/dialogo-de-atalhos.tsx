'use client';

import { useEffect, useState } from 'react';
import { Dialogo } from '@/components/ui/dialogo';
import { usarNavegacao } from '@/hooks/usar-navegacao';
import { ATALHOS, detectarMac, formatarTecla, type Atalho } from '@/lib/atalhos';

const GRUPOS: Atalho['grupo'][] = ['Geral', 'Navegacao', 'Editor', 'Aparencia'];

export function DialogoDeAtalhos() {
  const { ajudaAberta, fecharAjuda } = usarNavegacao();
  const [ehMac, setEhMac] = useState(false);

  useEffect(() => setEhMac(detectarMac()), []);

  return (
    <Dialogo
      aberto={ajudaAberta}
      aoFechar={fecharAjuda}
      titulo="Atalhos de teclado"
      descricao="Nenhum atalho dispara enquanto voce esta escrevendo em um campo."
    >
      <div className="space-y-5">
        {GRUPOS.map((grupo) => {
          const doGrupo = ATALHOS.filter((atalho) => atalho.grupo === grupo);
          if (doGrupo.length === 0) return null;

          return (
            <section key={grupo} className="space-y-2">
              <h3 className="text-2xs font-medium uppercase tracking-wide text-[var(--texto-tenue)]">
                {grupo}
              </h3>

              <dl className="space-y-1.5">
                {doGrupo.map((atalho) => (
                  <div key={atalho.id} className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-[var(--texto-suave)]">{atalho.descricao}</dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {atalho.teclas.map((tecla) => (
                        <kbd
                          key={tecla}
                          className="text-2xs min-w-6 rounded-sm border bg-[var(--superficie-suave)] px-1.5 py-0.5 text-center font-mono"
                        >
                          {formatarTecla(tecla, ehMac)}
                        </kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </Dialogo>
  );
}
