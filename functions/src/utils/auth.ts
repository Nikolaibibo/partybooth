import { HttpsError } from 'firebase-functions/v2/https';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const TOKEN_EXPIRY = '24h';

export function generateToken(secret: string): string {
  return jwt.sign(
    { admin: true, jti: randomUUID() },
    secret,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token: string, secret: string): boolean {
  try {
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    return payload.admin === true;
  } catch {
    return false;
  }
}

export function requireAdmin(token: string | undefined, secret: string): void {
  if (!token || !verifyToken(token, secret)) {
    throw new HttpsError('permission-denied', 'Invalid or expired token');
  }
}
