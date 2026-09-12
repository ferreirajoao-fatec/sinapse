import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Instrument_Serif, Inter, Lexend, Roboto } from 'next/font/google';
import type { ReactNode } from 'react';
import { Provedores } from '@/components/provedores';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--fonte-sans',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--fonte-serif',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--fonte-mono',
  display: 'swap',
});

// Fontes alternativas oferecidas em Configuracoes > Aparencia. Cada uma tem sua
// propria variavel CSS e so e baixada pelo navegador quando o usuario escolhe
// usa-la (o @font-face so dispara download se a fonte estiver de fato em uso).
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--fonte-roboto',
  display: 'swap',
});

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--fonte-lexend',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Sinapse',
    template: '%s - Sinapse',
  },
  description:
    'Suas anotacoes, seus arquivos e seus prazos em um so lugar, com uma IA que estuda junto com voce.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbfa' },
    { media: '(prefers-color-scheme: dark)', color: '#121214' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${instrumentSerif.variable} ${plexMono.variable} ${roboto.variable} ${lexend.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <Provedores>
          <a href="#conteudo" className="pular-para-conteudo">
            Pular para o conteudo
          </a>
          {children}
        </Provedores>
      </body>
    </html>
  );
}
