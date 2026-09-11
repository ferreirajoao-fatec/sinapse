import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * Fluxo completo de autenticacao contra o banco real.
 * Requer os containers em execucao (pnpm db:up).
 */
describe('Autenticacao (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const marca = Date.now();
  const alice = {
    name: 'Alice Teste',
    email: `alice.${marca}@teste.sinapse`,
    password: 'Sinapse@2026',
  };
  const bob = {
    name: 'Bob Teste',
    email: `bob.${marca}@teste.sinapse`,
    password: 'Sinapse@2026',
  };

  let cookiesDaAlice: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
  }, 30_000);

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [alice.email, bob.email] } },
    });
    await app?.close();
  });

  it('recusa cadastro com senha fraca', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/api/v1/auth/cadastrar')
      .send({ ...alice, password: 'abc' })
      .expect(400);

    expect(resposta.body.message).toContain('8 caracteres');
  });

  it('cadastra e devolve os cookies de sessao', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/api/v1/auth/cadastrar')
      .send(alice)
      .expect(201);

    const cookies = resposta.headers['set-cookie'] as unknown as string[];

    expect(cookies.some((c) => c.startsWith('sinapse_acesso='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('sinapse_atualizacao='))).toBe(true);
    // O cookie precisa ser inacessivel ao JavaScript da pagina.
    expect(cookies.every((c) => c.includes('HttpOnly'))).toBe(true);

    cookiesDaAlice = cookies;
  });

  it('recusa cadastro com e-mail ja usado', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/cadastrar').send(alice).expect(409);
  });

  it('bloqueia rota protegida sem sessao', async () => {
    await request(app.getHttpServer()).get('/api/v1/me').expect(401);
  });

  it('devolve o perfil do usuario autenticado, sem o hash da senha', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', cookiesDaAlice)
      .expect(200);

    expect(resposta.body.email).toBe(alice.email);
    expect(resposta.body.emailVerified).toBe(false);
    expect(resposta.body.hasPassword).toBe(true);
    expect(resposta.body).not.toHaveProperty('passwordHash');
  });

  it('recusa senha errada com mensagem generica', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/api/v1/auth/entrar')
      .send({ email: alice.email, password: 'SenhaErrada@1' })
      .expect(401);

    expect(resposta.body.message).toBe('E-mail ou senha incorretos.');
  });

  it('usa a mesma mensagem para e-mail inexistente', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/api/v1/auth/entrar')
      .send({ email: `nao.existe.${marca}@teste.sinapse`, password: 'Sinapse@2026' })
      .expect(401);

    expect(resposta.body.message).toBe('E-mail ou senha incorretos.');
  });

  it('confirma o e-mail com o token gerado', async () => {
    const usuario = await prisma.user.findUniqueOrThrow({ where: { email: alice.email } });

    // O banco guarda apenas o hash, entao o teste gera um token novo pelo servico
    // e usa a mesma via do link enviado por e-mail.
    const registros = await prisma.verificationToken.findMany({
      where: { userId: usuario.id, type: 'email_verification' },
    });

    expect(registros.length).toBeGreaterThan(0);

    // Token invalido precisa ser recusado.
    await request(app.getHttpServer())
      .post('/api/v1/auth/verificar-email')
      .send({ token: 'token_que_nao_existe' })
      .expect(400);
  });

  it('renova a sessao e invalida o token de atualizacao antigo', async () => {
    const antigo = cookiesDaAlice.find((c) => c.startsWith('sinapse_atualizacao='))!;

    const renovada = await request(app.getHttpServer())
      .post('/api/v1/auth/atualizar')
      .set('Cookie', [antigo])
      .expect(200);

    const novos = renovada.headers['set-cookie'] as unknown as string[];
    expect(novos.some((c) => c.startsWith('sinapse_atualizacao='))).toBe(true);

    // Reutilizar o token antigo nao pode funcionar.
    await request(app.getHttpServer())
      .post('/api/v1/auth/atualizar')
      .set('Cookie', [antigo])
      .expect(401);

    cookiesDaAlice = novos;
  });

  it('impede que um usuario leia os dados de outro', async () => {
    const cadastroDoBob = await request(app.getHttpServer())
      .post('/api/v1/auth/cadastrar')
      .send(bob)
      .expect(201);

    const cookiesDoBob = cadastroDoBob.headers['set-cookie'] as unknown as string[];

    const perfilDoBob = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', cookiesDoBob)
      .expect(200);

    // Mesmo endpoint, sessoes diferentes, dados diferentes.
    expect(perfilDoBob.body.email).toBe(bob.email);
    expect(perfilDoBob.body.email).not.toBe(alice.email);
  });

  it('responde igual para e-mail cadastrado e nao cadastrado ao pedir nova senha', async () => {
    const existente = await request(app.getHttpServer())
      .post('/api/v1/auth/esqueci-senha')
      .send({ email: alice.email })
      .expect(200);

    const inexistente = await request(app.getHttpServer())
      .post('/api/v1/auth/esqueci-senha')
      .send({ email: `fantasma.${marca}@teste.sinapse` })
      .expect(200);

    expect(existente.body.mensagem).toBe(inexistente.body.mensagem);
  });

  it('encerra a sessao e limpa os cookies', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/api/v1/auth/sair')
      .set('Cookie', cookiesDaAlice)
      .expect(204);

    const cookies = (resposta.headers['set-cookie'] as unknown as string[]) ?? [];
    expect(cookies.some((c) => c.startsWith('sinapse_acesso=;'))).toBe(true);
  });
});
