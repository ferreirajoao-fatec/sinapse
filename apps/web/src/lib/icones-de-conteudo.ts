import {
  Atom,
  BookOpen,
  Briefcase,
  Calculator,
  Calendar,
  Code,
  Database,
  FileText,
  FlaskConical,
  Folder,
  Globe,
  GraduationCap,
  Heart,
  Languages,
  Lightbulb,
  ListChecks,
  Music,
  Palette,
  PenLine,
  Sigma,
  Sparkles,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icones que o usuario pode escolher para grupos, secoes e paginas.
 * O banco guarda a chave em texto; uma chave desconhecida cai no padrao,
 * de modo que remover um icone daqui nunca quebra um conteudo existente.
 */
export const ICONES_DE_CONTEUDO: Record<string, LucideIcon> = {
  folder: Folder,
  book: BookOpen,
  school: GraduationCap,
  database: Database,
  code: Code,
  calculator: Calculator,
  sigma: Sigma,
  flask: FlaskConical,
  atom: Atom,
  language: Languages,
  globe: Globe,
  music: Music,
  palette: Palette,
  briefcase: Briefcase,
  users: Users,
  calendar: Calendar,
  checklist: ListChecks,
  note: FileText,
  pen: PenLine,
  idea: Lightbulb,
  star: Star,
  heart: Heart,
  sparkles: Sparkles,
};

export const CHAVES_DE_ICONE = Object.keys(ICONES_DE_CONTEUDO);

export function iconeDeConteudo(chave: string | null, padrao: LucideIcon = FileText): LucideIcon {
  if (!chave) return padrao;
  return ICONES_DE_CONTEUDO[chave] ?? padrao;
}

/** Classes de cor por entidade, alinhadas ao enum EntityColor do banco. */
export const CORES_DE_CONTEUDO: Record<string, { ponto: string; texto: string; fundo: string }> = {
  indigo: {
    ponto: 'bg-marca-500',
    texto: 'text-marca-700 dark:text-marca-300',
    fundo: 'bg-marca-50 dark:bg-marca-900',
  },
  teal: {
    ponto: 'bg-estudo-500',
    texto: 'text-estudo-700 dark:text-estudo-100',
    fundo: 'bg-estudo-100 dark:bg-estudo-700',
  },
  amber: {
    ponto: 'bg-atencao-500',
    texto: 'text-atencao-700 dark:text-atencao-100',
    fundo: 'bg-atencao-100 dark:bg-atencao-700',
  },
  rose: {
    ponto: 'bg-perigo-500',
    texto: 'text-perigo-700 dark:text-perigo-100',
    fundo: 'bg-perigo-100 dark:bg-perigo-700',
  },
  violet: {
    ponto: 'bg-marca-400',
    texto: 'text-marca-700 dark:text-marca-200',
    fundo: 'bg-marca-100 dark:bg-marca-800',
  },
  emerald: {
    ponto: 'bg-sucesso-500',
    texto: 'text-sucesso-700 dark:text-sucesso-100',
    fundo: 'bg-sucesso-100 dark:bg-sucesso-700',
  },
  slate: {
    ponto: 'bg-neutro-400',
    texto: 'text-neutro-600 dark:text-neutro-300',
    fundo: 'bg-neutro-100 dark:bg-neutro-800',
  },
};

export const NOMES_DAS_CORES: Record<string, string> = {
  indigo: 'Indigo',
  teal: 'Turquesa',
  amber: 'Ambar',
  rose: 'Rosa',
  violet: 'Violeta',
  emerald: 'Verde',
  slate: 'Cinza',
};

export function corDeConteudo(cor: string) {
  return CORES_DE_CONTEUDO[cor] ?? CORES_DE_CONTEUDO.slate!;
}
