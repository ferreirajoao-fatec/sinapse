/**
 * Modelos de e-mail em HTML simples.
 * Nada de framework de template: HTML inline e o que mais clientes de e-mail
 * renderizam de forma previsivel.
 */

interface Modelo {
  assunto: string;
  html: string;
  texto: string;
}

function moldura(titulo: string, corpo: string, botao: { texto: string; url: string }): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:32px 16px;background:#fbfbfa;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1d;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border:1px solid #e7e6e3;border-radius:12px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:28px 28px 0 28px;">
                <span style="font-size:18px;font-weight:600;color:#5b4bd6;">Sinapse</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 8px 28px;">
                <h1 style="margin:0;font-size:20px;font-weight:500;">${titulo}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px 28px;font-size:15px;line-height:1.6;color:#57564f;">
                ${corpo}
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px 28px;">
                <a href="${botao.url}" style="display:inline-block;background:#5b4bd6;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:500;">${botao.texto}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px 28px;font-size:12px;line-height:1.6;color:#a3a29d;border-top:1px solid #e7e6e3;padding-top:16px;">
                Se o botao nao funcionar, copie e cole este endereco no navegador:<br />
                <span style="word-break:break-all;color:#78776f;">${botao.url}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function modeloDeVerificacao(nome: string, url: string): Modelo {
  return {
    assunto: 'Confirme seu e-mail no Sinapse',
    html: moldura(
      `Ola, ${nome}`,
      'Confirme seu endereco de e-mail para liberar todos os recursos da sua conta. O link vale por 24 horas.',
      { texto: 'Confirmar e-mail', url },
    ),
    texto: `Ola, ${nome}. Confirme seu e-mail no Sinapse acessando: ${url} (o link vale por 24 horas).`,
  };
}

export function modeloDeRedefinicao(nome: string, url: string): Modelo {
  return {
    assunto: 'Redefinir sua senha do Sinapse',
    html: moldura(
      `Ola, ${nome}`,
      'Recebemos um pedido para redefinir sua senha. O link vale por 30 minutos. Se nao foi voce quem pediu, ignore esta mensagem: sua senha continua a mesma.',
      { texto: 'Criar nova senha', url },
    ),
    texto: `Ola, ${nome}. Redefina sua senha do Sinapse em: ${url} (o link vale por 30 minutos). Se nao foi voce, ignore esta mensagem.`,
  };
}

export function modeloDeLembreteDeEvento(
  nome: string,
  tituloDoEvento: string,
  quando: string,
  url: string,
): Modelo {
  return {
    assunto: `Lembrete: ${tituloDoEvento}`,
    html: moldura(
      tituloDoEvento,
      `Ola, ${nome}. Este e um lembrete do seu evento "${tituloDoEvento}", marcado para ${quando}.`,
      { texto: 'Ver no calendario', url },
    ),
    texto: `Ola, ${nome}. Lembrete: "${tituloDoEvento}" marcado para ${quando}. Veja em: ${url}`,
  };
}

export function modeloDeSenhaAlterada(nome: string, url: string): Modelo {
  return {
    assunto: 'Sua senha do Sinapse foi alterada',
    html: moldura(
      `Ola, ${nome}`,
      'A senha da sua conta foi alterada agora. Todas as sessoes anteriores foram encerradas. Se nao foi voce, redefina a senha imediatamente.',
      { texto: 'Acessar minha conta', url },
    ),
    texto: `Ola, ${nome}. A senha da sua conta Sinapse foi alterada. Se nao foi voce, redefina em ${url}.`,
  };
}

/** Texto digitado por outra pessoa nunca entra cru no HTML do e-mail. */
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function modeloDeSecaoCompartilhada(
  nome: string,
  quemCompartilhou: string,
  secao: string,
  podeEditar: boolean,
  url: string,
): Modelo {
  const acesso = podeEditar ? 'ler e editar' : 'ler';

  return {
    assunto: `${quemCompartilhou} compartilhou "${secao}" com voce`,
    html: moldura(
      `Ola, ${escaparHtml(nome)}`,
      `${escaparHtml(quemCompartilhou)} compartilhou a secao "${escaparHtml(secao)}" com voce no Sinapse. Voce pode ${acesso} as paginas dela, que ja aparecem em "Compartilhadas comigo" na barra lateral.`,
      { texto: 'Abrir o Sinapse', url },
    ),
    texto: `Ola, ${nome}. ${quemCompartilhou} compartilhou a secao "${secao}" com voce no Sinapse. Voce pode ${acesso} as paginas dela. Acesse: ${url}`,
  };
}
