import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import crypto from 'node:crypto';

import {
  deleteKv,
  findAuthSecret,
  getKv,
  readDb,
  setKv,
  upsertAuthSecret,
  writeDb,
  type DbShape,
} from './db.js';
import {
  loginSchema,
  passwordRecoverySchema,
  registerSchema,
  signToken,
  stripCpf,
  verifyToken,
} from './auth.js';
import { seedDbIfEmpty } from './seed.js';

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const DB_PATH = process.env.DB_PATH || './data/db.json';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  }),
);

type StoredUser = {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  perfil: number;
  status?: 'ativo' | 'inativo';
  telefone?: string;
  dataNascimento?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  materias?: string[];
  turmas?: string[];
};

type FrontUser = {
  id: string;
  cpf: string; // sem pontuação
  nome: string;
  email: string;
  perfil: number;
  primeiroAcesso: boolean;
  telefone?: string;
  endereco?: string;
  dataNascimento?: string;
  turmaId?: string;
  materias?: string[];
  createdAt: string;
};

type LoginResult =
  | { ok: false }
  | { ok: true; token: string; user: FrontUser };

type RegisterResult =
  | { ok: false; reason: 'cpf_exists' }
  | { ok: true; token: string; user: FrontUser };

type MeResult =
  | { ok: false }
  | { ok: true; user: FrontUser };

function toFrontUser(u: StoredUser, opts?: { primeiroAcesso?: boolean }): FrontUser {
  const cpfDigits = stripCpf(u.cpf);
  return {
    id: u.id,
    cpf: cpfDigits,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil,
    primeiroAcesso: opts?.primeiroAcesso ?? false,
    telefone: u.telefone,
    endereco: u.endereco,
    dataNascimento: u.dataNascimento,
    materias: u.materias,
    // turmaId não existe no StoredUser default; fica opcional
    createdAt: new Date().toISOString(),
  };
}

async function withDb<T>(fn: (db: DbShape) => Promise<{ db: DbShape; result: T }>): Promise<T> {
  const current = seedDbIfEmpty(await readDb(DB_PATH));
  const { db, result } = await fn(current);
  await writeDb(DB_PATH, db);
  return result;
}

function getBearer(req: express.Request): string | null {
  const auth = req.header('authorization') || '';
  const [type, token] = auth.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = getBearer(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = verifyToken(JWT_SECRET, token);
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/v1/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
  const { cpf, senha } = parsed.data;
  const cpfDigits = stripCpf(cpf);

  const result = await withDb<LoginResult>(async (db) => {
    const users = (getKv(db, 'school-compass:usuarios') as StoredUser[] | undefined) ?? [];
    const found = users.find((u) => stripCpf(u.cpf) === cpfDigits);
    if (!found) {
      return { db, result: { ok: false } };
    }

    // Se for usuário registrado (tem secret), valida senha.
    // Caso contrário, mantém comportamento demo do front: "qualquer senha funciona".
    const secret = findAuthSecret(db, found.id);
    if (secret) {
      const hashed = crypto.createHash('sha256').update(senha).digest('hex');
      if (hashed !== secret.passwordHash) {
        return { db, result: { ok: false } };
      }
    }

    const user = toFrontUser(found, { primeiroAcesso: false });
    const token = signToken(JWT_SECRET, { sub: user.id, cpf: user.cpf, perfil: user.perfil });
    return { db, result: { ok: true, token, user } };
  });

  if (!result.ok) return res.status(401).json({ error: 'invalid_credentials' });
  return res.json({ token: result.token, user: result.user });
});

app.post('/api/v1/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
  const { cpf, nome, email, senha } = parsed.data;
  const cpfDigits = stripCpf(cpf);

  const result = await withDb<RegisterResult>(async (db) => {
    const users = (getKv(db, 'school-compass:usuarios') as StoredUser[] | undefined) ?? [];
    const existsCpf = users.some((u) => stripCpf(u.cpf) === cpfDigits);
    if (existsCpf) return { db, result: { ok: false, reason: 'cpf_exists' } };

    const newId = crypto.randomUUID();
    const stored: StoredUser = {
      id: newId,
      nome,
      email,
      cpf: cpfDigits, // persistimos sem pontuação para facilitar
      perfil: 4, // ALUNO por padrão
      status: 'ativo',
    };

    const updatedDb = setKv(db, 'school-compass:usuarios', [...users, stored]);
    const passwordHash = crypto.createHash('sha256').update(senha).digest('hex');
    const updatedDb2 = upsertAuthSecret(updatedDb, {
      userId: newId,
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    const user = toFrontUser(stored, { primeiroAcesso: true });
    const token = signToken(JWT_SECRET, { sub: user.id, cpf: user.cpf, perfil: user.perfil });
    return { db: updatedDb2, result: { ok: true, token, user } };
  });

  if (!result.ok) return res.status(409).json({ error: result.reason });
  return res.status(201).json({ token: result.token, user: result.user });
});

app.get('/api/v1/auth/me', requireAuth, async (req, res) => {
  const payload = (req as any).user as { sub: string };
  const userId = payload.sub;
  const result = await withDb<MeResult>(async (db) => {
    const users = (getKv(db, 'school-compass:usuarios') as StoredUser[] | undefined) ?? [];
    const found = users.find((u) => u.id === userId);
    if (!found) return { db, result: { ok: false } };
    return { db, result: { ok: true, user: toFrontUser(found, { primeiroAcesso: false }) } };
  });
  if (!result.ok) return res.status(404).json({ error: 'not_found' });
  return res.json({ user: result.user });
});

app.post('/api/v1/auth/password-recovery', async (req, res) => {
  const parsed = passwordRecoverySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
  // Por enquanto é stub (como no front). Retorna ok sempre para não vazar existência de usuário.
  return res.json({ ok: true });
});

// Storage genérico (espelha o padrão `school-compass:*`)
const keyParamSchema = z.object({ key: z.string().min(1) });

app.post('/api/v1/storage/batch-get', requireAuth, async (req, res) => {
  const bodySchema = z.object({ keys: z.array(z.string().min(1)).min(1).max(200) });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });

  const keys = parsed.data.keys.map((k) => decodeURIComponent(k));
  const items = await withDb(async (db) => {
    const record: Record<string, unknown | null> = {};
    for (const key of keys) {
      record[key] = (getKv(db, key) as unknown) ?? null;
    }
    return { db, result: record };
  });

  return res.json({ items });
});

app.get('/api/v1/storage/:key', requireAuth, async (req, res) => {
  const parsed = keyParamSchema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_key' });
  const key = decodeURIComponent(parsed.data.key);
  const value = await withDb(async (db) => ({ db, result: getKv(db, key) ?? null }));
  return res.json({ key, value });
});

app.put('/api/v1/storage/:key', requireAuth, async (req, res) => {
  const parsed = keyParamSchema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_key' });
  const key = decodeURIComponent(parsed.data.key);
  const bodySchema = z.object({ value: z.unknown() });
  const bodyParsed = bodySchema.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: 'invalid_body' });

  await withDb(async (db) => {
    const updated = setKv(db, key, bodyParsed.data.value);
    return { db: updated, result: true };
  });

  return res.json({ ok: true });
});

app.delete('/api/v1/storage/:key', requireAuth, async (req, res) => {
  const parsed = keyParamSchema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_key' });
  const key = decodeURIComponent(parsed.data.key);

  await withDb(async (db) => ({ db: deleteKv(db, key), result: true }));
  return res.json({ ok: true });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend rodando em http://localhost:${PORT}`);
});

