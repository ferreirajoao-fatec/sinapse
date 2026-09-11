'use client';

import { Sparkles } from 'lucide-react';
import { EmConstrucao } from '@/components/em-construcao';

export default function PaginaDoAssistente() {
  return (
    <EmConstrucao
      Icone={Sparkles}
      titulo="Assistente"
      etapa="Etapa 9"
      descricao="Resumos, exercicios e flashcards a partir do que voce escolher."
      recursos={[
        'Voce decide quais paginas e arquivos a IA pode ler',
        'Resumo curto, medio ou detalhado',
        'Exercicios, simulados e flashcards',
        'A resposta indica de qual pagina veio cada informacao',
        'Nada e gravado sem sua confirmacao',
      ]}
    />
  );
}
