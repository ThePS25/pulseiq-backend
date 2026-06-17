import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthUser } from '../types';

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions,
  );
}

export function verifyToken(token: string): AuthUser {
  const decoded = jwt.verify(token, env.jwtSecret) as AuthUser;
  return decoded;
}
