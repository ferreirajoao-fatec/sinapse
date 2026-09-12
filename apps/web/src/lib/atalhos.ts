/**
 * Catalogo de atalhos de teclado.
 * Serve tanto para registrar os comandos quanto para montar a tela de ajuda,
 * evitando que a documentacao e o comportamento saiam de sincronia.
 */

export interface Atalho {
  id: string;
  teclas: string[];
  descricao: string;
  grupo: 'Navegacao' | 'Aparencia' | 'Geral' | 'Editor';
}

export const ATALHOS: Atalho[] = [
  { id: 'paleta', teclas: ['Ctrl', 'K'], descricao: 'Abrir a busca de comandos', grupo: 'Geral' },
  { id: 'ajuda', teclas: ['?'], descricao: 'Ver esta lista de atalhos', grupo: 'Geral' },
  {
    id: 'barra',
    teclas: ['Ctrl', 'B'],
    descricao: 'Recolher ou expandir a barra lateral',
    grupo: 'Navegacao',
  },
  { id: 'inicio', teclas: ['G', 'I'], descricao: 'Ir para o inicio', grupo: 'Navegacao' },
  { id: 'notas', teclas: ['G', 'N'], descricao: 'Ir para as anotacoes', grupo: 'Navegacao' },
  { id: 'tarefas', teclas: ['G', 'T'], descricao: 'Ir para as tarefas', grupo: 'Navegacao' },
  { id: 'calendario', teclas: ['G', 'C'], descricao: 'Ir para o calendario', grupo: 'Navegacao' },
  { id: 'lixeira', teclas: ['G', 'L'], descricao: 'Ir para a lixeira', grupo: 'Navegacao' },
  { id: 'perfil', teclas: ['G', 'P'], descricao: 'Ir para o perfil', grupo: 'Navegacao' },
  {
    id: 'tema',
    teclas: ['Ctrl', 'J'],
    descricao: 'Alternar entre claro e escuro',
    grupo: 'Aparencia',
  },
  { id: 'fechar', teclas: ['Esc'], descricao: 'Fechar o que estiver aberto', grupo: 'Geral' },

  { id: 'comandos', teclas: ['/'], descricao: 'Abrir os comandos rapidos', grupo: 'Editor' },
  { id: 'salvar', teclas: ['Ctrl', 'S'], descricao: 'Salvar agora, sem esperar', grupo: 'Editor' },
  {
    id: 'negrito',
    teclas: ['Ctrl', 'B'],
    descricao: 'Negrito no texto selecionado',
    grupo: 'Editor',
  },
  { id: 'italico', teclas: ['Ctrl', 'I'], descricao: 'Italico', grupo: 'Editor' },
  { id: 'sublinhado', teclas: ['Ctrl', 'U'], descricao: 'Sublinhado', grupo: 'Editor' },
  { id: 'desfazer', teclas: ['Ctrl', 'Z'], descricao: 'Desfazer', grupo: 'Editor' },
  { id: 'refazer', teclas: ['Ctrl', 'Shift', 'Z'], descricao: 'Refazer', grupo: 'Editor' },
  {
    id: 'callout',
    teclas: ['Ctrl', 'Shift', 'I'],
    descricao: 'Bloco informativo',
    grupo: 'Editor',
  },
];

/** Em Mac, mostramos o simbolo de Command no lugar de Ctrl. */
export function formatarTecla(tecla: string, ehMac: boolean): string {
  if (tecla === 'Ctrl' && ehMac) return '⌘';
  return tecla;
}

export function detectarMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

/**
 * Ignora atalhos enquanto o usuario digita em um campo.
 * Sem isso, escrever a letra "n" em uma anotacao mudaria de pagina.
 */
export function estaDigitando(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;

  const tag = alvo.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || alvo.isContentEditable;
}
