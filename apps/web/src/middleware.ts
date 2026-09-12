import { NextResponse, type NextRequest } from 'next/server';

// O middleware roda no runtime Edge, que nao carrega pacotes CommonJS do
// monorepo. Por isso os nomes dos cookies sao repetidos aqui como literais.
// Eles precisam continuar iguais aos de packages/shared/src/constants.ts.
const COOKIE_ACESSO = 'sinapse_acesso';
const COOKIE_ATUALIZACAO = 'sinapse_atualizacao';

const ROTAS_DE_VISITANTE = ['/login', '/cadastro', '/esqueci-senha', '/redefinir-senha'];
const ROTAS_PUBLICAS = ['/verificar-email', '/design-system', '/diagnostico'];

/**
 * Redireciona antes da pagina carregar, evitando o piscar de conteudo.
 *
 * O middleware apenas verifica se existe cookie de sessao. A validade do token
 * e sempre conferida pela API: o navegador nunca decide quem esta autenticado.
 */
export function middleware(requisicao: NextRequest) {
  const { pathname, search } = requisicao.nextUrl;

  const temSessao =
    requisicao.cookies.has(COOKIE_ACESSO) || requisicao.cookies.has(COOKIE_ATUALIZACAO);

  if (ROTAS_PUBLICAS.some((rota) => pathname.startsWith(rota))) {
    return NextResponse.next();
  }

  const ehRotaDeVisitante = ROTAS_DE_VISITANTE.some((rota) => pathname.startsWith(rota));

  if (ehRotaDeVisitante) {
    if (temSessao) {
      return NextResponse.redirect(new URL('/', requisicao.url));
    }
    return NextResponse.next();
  }

  if (!temSessao) {
    const destino = new URL('/login', requisicao.url);

    // Guarda para onde o usuario queria ir, e volta para la depois do login.
    if (pathname !== '/') {
      destino.searchParams.set('proximo', `${pathname}${search}`);
    }

    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
