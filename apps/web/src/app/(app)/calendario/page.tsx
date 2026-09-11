'use client';

import { CalendarDays } from 'lucide-react';
import { EmConstrucao } from '@/components/em-construcao';

export default function PaginaDeCalendario() {
  return (
    <EmConstrucao
      Icone={CalendarDays}
      titulo="Calendario"
      etapa="Etapa 8"
      descricao="Aulas, provas, entregas e compromissos em um so lugar."
      recursos={[
        'Visualizacao diaria, semanal, mensal, agenda e linha do tempo',
        'Eventos com local, link, cor e lembrete',
        'Rotinas recorrentes',
        'Sincronizacao com o Google Agenda',
      ]}
    />
  );
}
