/**
 * Seed de demonstracao do Sinapse.
 *
 * Cria uma conta de teste com uma estrutura de estudos realista para que
 * seja possivel navegar pelo sistema desde o primeiro dia.
 *
 * Conta de teste:
 *   E-mail: demo@sinapse.app
 *   Senha:  Sinapse@2026
 *
 * Executar: pnpm db:seed (na raiz do projeto)
 */

import { hash } from '@node-rs/argon2';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@sinapse.app';
const DEMO_PASSWORD = 'Sinapse@2026';

// Segunda conta, usada para conferir na pratica que um usuario nunca ve
// os dados do outro. As duas senhas sao iguais so por conveniencia local.
const SEGUNDO_EMAIL = 'professor@sinapse.app';
const SEGUNDO_PASSWORD = 'Sinapse@2026';

/**
 * Documento no formato ProseMirror, o mesmo que o editor da Etapa 4 produz.
 * A tipagem e propositalmente aberta em content: um bloco pode conter texto,
 * outros blocos, ou ambos, dependendo do tipo.
 */
interface NoDoEditor {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  content?: NoDoEditor[];
}

interface DocumentoDoEditor {
  type: 'doc';
  content: NoDoEditor[];
}

/**
 * Blocos ricos usados pelas paginas de demonstracao, para o editor da Etapa 4
 * abrir com conteudo real em vez de uma tela em branco.
 */
function paragrafo(texto: string) {
  return { type: 'paragraph', content: [{ type: 'text' as const, text: texto }] };
}

function titulo(texto: string, level = 2) {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text' as const, text: texto }] };
}

function listaDeTopicos(itens: string[]) {
  return {
    type: 'bulletList',
    content: itens.map((item) => ({ type: 'listItem', content: [paragrafo(item)] })),
  };
}

function listaDeTarefas(itens: { texto: string; feito: boolean }[]) {
  return {
    type: 'taskList',
    content: itens.map((item) => ({
      type: 'taskItem',
      attrs: { checked: item.feito },
      content: [paragrafo(item.texto)],
    })),
  };
}

function blocoInformativo(texto: string, tom: 'informacao' | 'atencao' | 'sucesso' | 'perigo') {
  return { type: 'blocoInformativo', attrs: { tom }, content: [paragrafo(texto)] };
}

function blocoDeCodigo(codigo: string, language: string) {
  return {
    type: 'codeBlock',
    attrs: { language },
    content: [{ type: 'text' as const, text: codigo }],
  };
}

/** Monta um documento ProseMirror simples a partir de paragrafos de texto. */
function doc(
  blocos: Array<{ type: 'heading' | 'paragraph'; text: string; level?: number }>,
): DocumentoDoEditor {
  return {
    type: 'doc',
    content: blocos.map((bloco) => ({
      type: bloco.type,
      ...(bloco.type === 'heading' ? { attrs: { level: bloco.level ?? 2 } } : {}),
      content: [{ type: 'text' as const, text: bloco.text }],
    })),
  };
}

/** Converte o documento para o formato aceito pelo campo Json do Prisma. */
function json(documento: DocumentoDoEditor): Prisma.InputJsonObject {
  return documento as unknown as Prisma.InputJsonObject;
}

/**
 * Extrai o texto puro do documento, usado pela pesquisa global.
 * Percorre a arvore inteira, igual ao extrairTexto do backend, para que a
 * contagem de palavras do seed bata com a que a API calcula ao salvar.
 */
function plainText(no: NoDoEditor | DocumentoDoEditor): string {
  const registro = no as NoDoEditor;

  if (registro.type === 'text' && typeof registro.text === 'string') {
    return registro.text;
  }

  if (Array.isArray(registro.content)) {
    return registro.content.map(plainText).filter(Boolean).join(' ');
  }

  return '';
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

async function main() {
  console.log('Iniciando o seed do Sinapse...');

  // Limpa os dados de demonstracao anteriores. A cascata remove tudo que
  // pertence ao usuario, entao basta apagar o usuario.
  await prisma.user.deleteMany({ where: { email: { in: [DEMO_EMAIL, SEGUNDO_EMAIL] } } });

  const passwordHash = await hash(DEMO_PASSWORD);

  const user = await prisma.user.create({
    data: {
      name: 'Estudante Demo',
      email: DEMO_EMAIL,
      passwordHash,
      emailVerifiedAt: new Date(),
      preferences: {
        create: {
          theme: 'system',
          locale: 'pt_BR',
          aiEnabled: false,
        },
      },
    },
  });

  console.log(`Usuario criado: ${user.email}`);

  const tagNames = [
    { name: 'prova', color: 'rose' as const },
    { name: 'revisar', color: 'amber' as const },
    { name: 'importante', color: 'indigo' as const },
    { name: 'resumo', color: 'teal' as const },
  ];

  const tags = await Promise.all(
    tagNames.map((tag) =>
      prisma.tag.create({ data: { userId: user.id, name: tag.name, color: tag.color } }),
    ),
  );

  const tagByName = new Map(tags.map((tag) => [tag.name, tag.id]));

  // ---------------------------------------------------------------------------
  // Grupo 1: Faculdade
  // ---------------------------------------------------------------------------
  const faculdade = await prisma.group.create({
    data: { userId: user.id, name: 'Faculdade', icon: 'school', color: 'indigo', position: 0 },
  });

  const bancoDeDados = await prisma.section.create({
    data: { groupId: faculdade.id, name: 'Banco de Dados', icon: 'database', position: 0 },
  });

  const engenhariaSoftware = await prisma.section.create({
    data: { groupId: faculdade.id, name: 'Engenharia de Software', icon: 'blueprint', position: 1 },
  });

  const conteudoAula1 = doc([
    { type: 'heading', text: 'Modelo relacional', level: 1 },
    {
      type: 'paragraph',
      text: 'O modelo relacional organiza os dados em tabelas formadas por linhas e colunas. Cada linha representa um registro e cada coluna representa um atributo.',
    },
    { type: 'heading', text: 'Chaves', level: 2 },
    {
      type: 'paragraph',
      text: 'A chave primaria identifica cada registro de forma unica. A chave estrangeira cria a ligacao entre duas tabelas e garante a integridade referencial.',
    },
  ]);

  // Esta pagina usa os recursos do editor, para servir de demonstracao viva.
  const conteudoAula2: DocumentoDoEditor = {
    type: 'doc',
    content: [
      titulo('Normalizacao', 1),
      paragrafo(
        'Normalizar e o processo de organizar as tabelas para reduzir redundancia e evitar anomalias de insercao, atualizacao e exclusao.',
      ),
      blocoInformativo(
        'Prova na proxima sexta. As tres primeiras formas normais caem com certeza.',
        'atencao',
      ),
      titulo('As tres primeiras formas'),
      listaDeTopicos([
        '1FN: todos os atributos sao atomicos, sem grupos repetitivos.',
        '2FN: nenhum atributo depende de apenas parte de uma chave composta.',
        '3FN: nenhum atributo nao chave depende de outro atributo nao chave.',
      ]),
      titulo('Exemplo em SQL'),
      blocoDeCodigo(
        'SELECT a.nome, d.titulo\nFROM alunos a\nJOIN disciplinas d ON d.id = a.disciplina_id\nWHERE a.ativo = true;',
        'sql',
      ),
      titulo('Para revisar'),
      listaDeTarefas([
        { texto: 'Refazer o exercicio 5 da lista', feito: true },
        { texto: 'Rever dependencia transitiva', feito: false },
        { texto: 'Resolver o simulado do ano passado', feito: false },
      ]),
    ],
  };

  const conteudoExercicios = doc([
    { type: 'heading', text: 'Lista de exercicios 3', level: 1 },
    {
      type: 'paragraph',
      text: 'Entrega ate sexta-feira. Resolver as questoes sobre formas normais e escrever as consultas SQL correspondentes.',
    },
  ]);

  const aula1 = await prisma.page.create({
    data: {
      sectionId: bancoDeDados.id,
      title: 'Aula 1 - Modelo relacional',
      icon: 'note',
      content: json(conteudoAula1),
      contentText: plainText(conteudoAula1),
      wordCount: countWords(plainText(conteudoAula1)),
      position: 0,
    },
  });

  const aula2 = await prisma.page.create({
    data: {
      sectionId: bancoDeDados.id,
      title: 'Aula 2 - Normalizacao',
      icon: 'note',
      content: json(conteudoAula2),
      contentText: plainText(conteudoAula2),
      wordCount: countWords(plainText(conteudoAula2)),
      isFavorite: true,
      isPinned: true,
      position: 1,
      tags: {
        create: [{ tagId: tagByName.get('importante')! }, { tagId: tagByName.get('revisar')! }],
      },
    },
  });

  await prisma.page.create({
    data: {
      sectionId: bancoDeDados.id,
      title: 'Exercicios',
      icon: 'checklist',
      content: json(conteudoExercicios),
      contentText: plainText(conteudoExercicios),
      wordCount: countWords(plainText(conteudoExercicios)),
      position: 2,
      tags: { create: [{ tagId: tagByName.get('prova')! }] },
    },
  });

  // Subpagina vinculada a Aula 2, para demonstrar a hierarquia.
  const conteudoResumo3fn = doc([
    { type: 'heading', text: 'Resumo rapido das formas normais', level: 1 },
    {
      type: 'paragraph',
      text: '1FN: atributos atomicos. 2FN: sem dependencia parcial da chave. 3FN: sem dependencia transitiva.',
    },
  ]);

  await prisma.page.create({
    data: {
      sectionId: bancoDeDados.id,
      parentPageId: aula2.id,
      title: 'Resumo - formas normais',
      icon: 'sparkles',
      content: json(conteudoResumo3fn),
      contentText: plainText(conteudoResumo3fn),
      wordCount: countWords(plainText(conteudoResumo3fn)),
      position: 0,
      tags: { create: [{ tagId: tagByName.get('resumo')! }] },
    },
  });

  const conteudoRequisitos = doc([
    { type: 'heading', text: 'Requisitos', level: 1 },
    {
      type: 'paragraph',
      text: 'Requisitos funcionais descrevem o que o sistema faz. Requisitos nao funcionais descrevem como o sistema se comporta: desempenho, seguranca, usabilidade e disponibilidade.',
    },
  ]);

  await prisma.page.create({
    data: {
      sectionId: engenhariaSoftware.id,
      title: 'Requisitos',
      icon: 'list',
      content: json(conteudoRequisitos),
      contentText: plainText(conteudoRequisitos),
      wordCount: countWords(plainText(conteudoRequisitos)),
      position: 0,
    },
  });

  const conteudoUml = doc([
    { type: 'heading', text: 'UML', level: 1 },
    {
      type: 'paragraph',
      text: 'O diagrama de casos de uso mostra as interacoes entre atores e o sistema. O diagrama de classes mostra a estrutura estatica com atributos, metodos e relacionamentos.',
    },
  ]);

  await prisma.page.create({
    data: {
      sectionId: engenhariaSoftware.id,
      title: 'UML',
      icon: 'diagram',
      content: json(conteudoUml),
      contentText: plainText(conteudoUml),
      wordCount: countWords(plainText(conteudoUml)),
      position: 1,
    },
  });

  // ---------------------------------------------------------------------------
  // Grupo 2: Estudos pessoais
  // ---------------------------------------------------------------------------
  const pessoais = await prisma.group.create({
    data: {
      userId: user.id,
      name: 'Estudos pessoais',
      icon: 'sparkles',
      color: 'teal',
      position: 1,
    },
  });

  const ingles = await prisma.section.create({
    data: { groupId: pessoais.id, name: 'Ingles', icon: 'language', position: 0 },
  });

  const conteudoPhrasal = doc([
    { type: 'heading', text: 'Phrasal verbs', level: 1 },
    {
      type: 'paragraph',
      text: 'Look up: procurar uma informacao. Give up: desistir. Run out of: ficar sem algo. Come across: encontrar por acaso.',
    },
  ]);

  await prisma.page.create({
    data: {
      sectionId: ingles.id,
      title: 'Phrasal verbs',
      icon: 'book',
      content: json(conteudoPhrasal),
      contentText: plainText(conteudoPhrasal),
      wordCount: countWords(plainText(conteudoPhrasal)),
      position: 0,
      tags: { create: [{ tagId: tagByName.get('revisar')! }] },
    },
  });

  await prisma.section.create({
    data: { groupId: pessoais.id, name: 'Programacao', icon: 'code', position: 1 },
  });

  // ---------------------------------------------------------------------------
  // Grupo 3: Trabalho
  // ---------------------------------------------------------------------------
  const trabalho = await prisma.group.create({
    data: { userId: user.id, name: 'Trabalho', icon: 'briefcase', color: 'amber', position: 2 },
  });

  await prisma.section.create({
    data: { groupId: trabalho.id, name: 'Projetos', icon: 'folder', position: 0 },
  });

  await prisma.section.create({
    data: { groupId: trabalho.id, name: 'Reunioes', icon: 'users', position: 1 },
  });

  // Algumas paginas ja com data de abertura, para a lista de recentes do
  // painel inicial nao aparecer vazia na primeira execucao.
  await prisma.page.update({
    where: { id: aula2.id },
    data: { lastOpenedAt: new Date(Date.now() - 5 * 60 * 1000) },
  });
  await prisma.page.update({
    where: { id: aula1.id },
    data: { lastOpenedAt: new Date(Date.now() - 60 * 60 * 1000) },
  });

  // Versao inicial guardada para o historico de alteracoes.
  await prisma.pageVersion.create({
    data: { pageId: aula1.id, title: aula1.title, content: json(conteudoAula1) },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'created',
      entityType: 'user',
      entityId: user.id,
      metadata: { origem: 'seed' },
    },
  });

  // ---------------------------------------------------------------------------
  // Segunda conta: existe para provar o isolamento entre usuarios
  // ---------------------------------------------------------------------------
  const professor = await prisma.user.create({
    data: {
      name: 'Professora Demo',
      email: SEGUNDO_EMAIL,
      passwordHash: await hash(SEGUNDO_PASSWORD),
      emailVerifiedAt: new Date(),
      preferences: { create: { theme: 'dark' } },
    },
  });

  const turmas = await prisma.group.create({
    data: {
      userId: professor.id,
      name: 'Turmas 2026',
      icon: 'users',
      color: 'violet',
      position: 0,
    },
  });

  const turmaA = await prisma.section.create({
    data: { groupId: turmas.id, name: 'Turma A - Algoritmos', icon: 'code', position: 0 },
  });

  const conteudoPlano = doc([
    { type: 'heading', text: 'Plano de aula - semana 1', level: 1 },
    {
      type: 'paragraph',
      text: 'Apresentacao da disciplina, criterios de avaliacao e introducao a logica de programacao.',
    },
  ]);

  await prisma.page.create({
    data: {
      sectionId: turmaA.id,
      title: 'Plano de aula - semana 1',
      icon: 'calendar',
      content: json(conteudoPlano),
      contentText: plainText(conteudoPlano),
      wordCount: countWords(plainText(conteudoPlano)),
      position: 0,
    },
  });

  const totals = {
    grupos: await prisma.group.count({ where: { userId: user.id } }),
    secoes: await prisma.section.count({ where: { group: { userId: user.id } } }),
    paginas: await prisma.page.count({ where: { section: { group: { userId: user.id } } } }),
    tags: tags.length,
  };

  console.log('');
  console.log('Seed concluido com sucesso.');
  console.log(`  Grupos:  ${totals.grupos}`);
  console.log(`  Secoes:  ${totals.secoes}`);
  console.log(`  Paginas: ${totals.paginas}`);
  console.log(`  Tags:    ${totals.tags}`);
  console.log('');
  console.log('Contas de teste:');
  console.log(`  1) ${DEMO_EMAIL} / ${DEMO_PASSWORD}   (e-mail nao confirmado)`);
  console.log(`  2) ${SEGUNDO_EMAIL} / ${SEGUNDO_PASSWORD}   (e-mail confirmado, tema escuro)`);
  console.log('');
  console.log('Entre com as duas em navegadores diferentes para conferir');
  console.log('que cada uma so enxerga os proprios conteudos.');
  console.log('');
}

main()
  .catch((error) => {
    console.error('Falha no seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
