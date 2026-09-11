import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { medirForcaDaSenha, passwordSchema } from '@sinapse/shared';

/**
 * Testes das regras puras de senha e do formato de hash usado nos tokens.
 * Nao dependem de banco nem de rede.
 */
describe('Regras de senha', () => {
  it('recusa senha curta', () => {
    const resultado = passwordSchema.safeParse('Abc1');
    expect(resultado.success).toBe(false);
  });

  it('recusa senha sem numero', () => {
    expect(passwordSchema.safeParse('SenhaSemNumero').success).toBe(false);
  });

  it('recusa senha sem maiuscula', () => {
    expect(passwordSchema.safeParse('senhaminuscula1').success).toBe(false);
  });

  it('aceita senha que cumpre todos os criterios', () => {
    expect(passwordSchema.safeParse('Sinapse@2026').success).toBe(true);
  });

  it('classifica a forca de forma crescente', () => {
    expect(medirForcaDaSenha('abcdefgh').pontos).toBeLessThan(
      medirForcaDaSenha('Abcdefgh1').pontos,
    );
    expect(medirForcaDaSenha('Abcdefgh1').pontos).toBeLessThan(
      medirForcaDaSenha('Abcdefgh1!longa').pontos,
    );
  });
});

describe('Hash dos tokens de e-mail', () => {
  it('produz 64 caracteres hexadecimais', () => {
    const hash = createHash('sha256').update('token-de-exemplo').digest('hex');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('e deterministico e diferente para entradas diferentes', () => {
    const a = createHash('sha256').update('token-a').digest('hex');
    const b = createHash('sha256').update('token-a').digest('hex');
    const c = createHash('sha256').update('token-b').digest('hex');

    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
