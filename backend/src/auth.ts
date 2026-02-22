import jwt from 'jsonwebtoken';
import { z } from 'zod';

export interface JwtUserPayload {
  sub: string;
  cpf: string;
  perfil: number;
}

export const loginSchema = z.object({
  cpf: z.string().min(1),
  senha: z.string().min(1),
});

export const registerSchema = z.object({
  cpf: z.string().min(1),
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(8),
});

export const passwordRecoverySchema = z.object({
  identifier: z.string().min(1),
});

export function stripCpf(value: string): string {
  return value.replace(/\D/g, '');
}

export function signToken(secret: string, payload: JwtUserPayload): string {
  return jwt.sign(payload, secret, { expiresIn: '1d' });
}

export function verifyToken(secret: string, token: string): JwtUserPayload {
  return jwt.verify(token, secret) as JwtUserPayload;
}

