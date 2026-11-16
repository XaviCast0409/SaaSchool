import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

vi.mock('../../../config/env', () => ({ env: { NODE_ENV: 'test' } }));
vi.mock('@sentry/node', () => ({ captureException: vi.fn() }));

import { globalErrorHandler } from '../error-handler.middleware';
import { AppError } from '../../errors/app-error';

class FakePrismaError extends Error {
  code = 'P2002';
  meta: Record<string, unknown>;
  constructor(target: string) {
    super('Unique constraint failed');
    this.meta = { target };
  }
}
Object.defineProperty(FakePrismaError, 'name', { value: 'PrismaClientKnownRequestError' });

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: '1kb' }));
  app.post('/echo', (req, res) => res.json(req.body));
  app.get('/operation', () => {
    throw new FakePrismaError('PaymentTransaction_active_operation_key');
  });
  app.get('/unknown-unique', () => {
    throw new FakePrismaError('SecretTable_secretColumn_key');
  });
  app.get('/app-error', () => {
    throw new AppError('Elige un colegio', 409, true, 'SELECT_SCHOOL', { options: [1] });
  });
  app.use(globalErrorHandler);
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('globalErrorHandler', () => {
  it('JSON mal formado responde 400 (no 500)', async () => {
    const res = await fetch(`${base}/echo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":' });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/JSON válido/);
  });

  it('cuerpo demasiado grande responde 413', async () => {
    const res = await fetch(`${base}/echo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: 'x'.repeat(5000) }) });
    expect(res.status).toBe(413);
  });

  it('número de operación repetido: 409 con mensaje claro', async () => {
    const res = await fetch(`${base}/operation`);
    expect(res.status).toBe(409);
    expect((await res.json()).message).toMatch(/número de operación/);
  });

  it('restricción única desconocida: no expone nombres de tablas ni columnas', async () => {
    const res = await fetch(`${base}/unknown-unique`);
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.message).not.toMatch(/Secret/);
  });

  it('AppError conserva code y details', async () => {
    const res = await fetch(`${base}/app-error`);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'SELECT_SCHOOL', details: { options: [1] } });
  });
});
