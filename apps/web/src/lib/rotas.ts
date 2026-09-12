import {
  BookOpen,
  CalendarDays,
  House,
  ListChecks,
  Palette,
  Search,
  Settings,
  Sparkles,
  Tag,
  Trash2,
  User,
  type LucideIcon,
} from 'lucide-react';

export interface ItemDeNavegacao {
  href: string;
  rotulo: string;
  Icone: LucideIcon;
  /** Etapa em que a funcionalidade fica pronta. Ausente quando ja esta pronta. */
  etapa?: string;
  /** Aparece na barra inferior do celular. */
  noCelular?: boolean;
}

/** Navegacao principal, na ordem em que aparece na barra lateral. */
export const NAVEGACAO_PRINCIPAL: ItemDeNavegacao[] = [
  { href: '/', rotulo: 'Inicio', Icone: House, noCelular: true },
  { href: '/notas', rotulo: 'Anotacoes', Icone: BookOpen, noCelular: true },
  { href: '/tarefas', rotulo: 'Tarefas', Icone: ListChecks, noCelular: true },
  { href: '/calendario', rotulo: 'Calendario', Icone: CalendarDays },
  { href: '/assistente', rotulo: 'Assistente', Icone: Sparkles, etapa: 'Etapa 9' },
];

/** Itens do rodape da barra lateral. */
export const NAVEGACAO_SECUNDARIA: ItemDeNavegacao[] = [
  { href: '/lixeira', rotulo: 'Lixeira', Icone: Trash2 },
];

export const NAVEGACAO_CONFIGURACOES: ItemDeNavegacao[] = [
  { href: '/configuracoes/perfil', rotulo: 'Perfil', Icone: User },
  { href: '/configuracoes/aparencia', rotulo: 'Aparencia', Icone: Palette },
  { href: '/configuracoes/etiquetas', rotulo: 'Etiquetas', Icone: Tag },
];

/**
 * Rotulos de cada trecho de URL, usados pela trilha de navegacao.
 * Um trecho sem rotulo aqui aparece com a primeira letra em maiuscula.
 */
export const ROTULOS_DAS_ROTAS: Record<string, string> = {
  notas: 'Anotacoes',
  tarefas: 'Tarefas',
  calendario: 'Calendario',
  assistente: 'Assistente',
  lixeira: 'Lixeira',
  configuracoes: 'Configuracoes',
  perfil: 'Perfil',
  aparencia: 'Aparencia',
  etiquetas: 'Etiquetas',
};

export const ICONES_AVULSOS = { Search, Settings };

/** Descobre qual item da navegacao corresponde ao endereco atual. */
export function itemAtivo(caminho: string, item: ItemDeNavegacao): boolean {
  if (item.href === '/') {
    return caminho === '/';
  }

  return caminho === item.href || caminho.startsWith(`${item.href}/`);
}
