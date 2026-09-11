'use client';

import { ListChecks } from 'lucide-react';
import { EmConstrucao } from '@/components/em-construcao';

export default function PaginaDeTarefas() {
  return (
    <EmConstrucao
      Icone={ListChecks}
      titulo="Tarefas"
      etapa="Etapa 7"
      descricao="Lista e quadro Kanban para organizar entregas, provas e estudos."
      recursos={[
        'Visualizacao em lista e em quadro Kanban',
        'Colunas personalizadas com cores proprias',
        'Prioridade, prazo, checklist e anexos',
        'Vinculo com uma pagina ou um evento',
        'Filtros e arquivamento',
      ]}
    />
  );
}
