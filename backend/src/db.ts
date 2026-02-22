import fs from 'node:fs/promises';
import path from 'node:path';

export type KvStore = Record<string, unknown>;

export interface AuthUserSecret {
  userId: string;
  passwordHash: string;
  createdAt: string;
}

export interface DbShape {
  kv: KvStore;
  authSecrets: AuthUserSecret[];
  meta: {
    version: number;
    createdAt: string;
    updatedAt: string;
  };
}

const DEFAULT_DB: DbShape = {
  kv: {},
  authSecrets: [],
  meta: {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

async function ensureDirForFile(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

export async function readDb(dbPath: string): Promise<DbShape> {
  try {
    const raw = await fs.readFile(dbPath, 'utf-8');
    const parsed = JSON.parse(raw) as DbShape;
    if (!parsed || typeof parsed !== 'object') return structuredClone(DEFAULT_DB);
    return {
      ...structuredClone(DEFAULT_DB),
      ...parsed,
      kv: { ...DEFAULT_DB.kv, ...(parsed.kv ?? {}) },
      authSecrets: Array.isArray(parsed.authSecrets) ? parsed.authSecrets : [],
      meta: {
        ...DEFAULT_DB.meta,
        ...(parsed.meta ?? {}),
      },
    };
  } catch {
    return structuredClone(DEFAULT_DB);
  }
}

export async function writeDb(dbPath: string, db: DbShape): Promise<void> {
  await ensureDirForFile(dbPath);
  const now = new Date().toISOString();
  const toWrite: DbShape = {
    ...db,
    meta: {
      ...db.meta,
      updatedAt: now,
      createdAt: db.meta.createdAt || now,
      version: db.meta.version || 1,
    },
  };
  await fs.writeFile(dbPath, JSON.stringify(toWrite, null, 2), 'utf-8');
}

export function getKv(db: DbShape, key: string): unknown {
  return db.kv[key];
}

export function setKv(db: DbShape, key: string, value: unknown): DbShape {
  return {
    ...db,
    kv: {
      ...db.kv,
      [key]: value,
    },
  };
}

export function deleteKv(db: DbShape, key: string): DbShape {
  const { [key]: _removed, ...rest } = db.kv;
  return {
    ...db,
    kv: rest,
  };
}

export function upsertAuthSecret(db: DbShape, secret: AuthUserSecret): DbShape {
  const exists = db.authSecrets.find((s) => s.userId === secret.userId);
  return {
    ...db,
    authSecrets: exists
      ? db.authSecrets.map((s) => (s.userId === secret.userId ? secret : s))
      : [...db.authSecrets, secret],
  };
}

export function findAuthSecret(db: DbShape, userId: string): AuthUserSecret | undefined {
  return db.authSecrets.find((s) => s.userId === userId);
}
