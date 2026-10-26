import { createHmac, timingSafeEqual } from 'node:crypto';

export type SignedPurpose = 'upload' | 'download';

export interface SignedPayload {
  key: string;
  purpose: SignedPurpose;
  expiresAt: number;
  mimeType?: string;
  maxBytes?: number;
  filename?: string;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sign(data: string, secret: string): string {
  return base64url(createHmac('sha256', secret).update(data).digest());
}

export function signStorageToken(payload: SignedPayload, secret: string): string {
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyStorageToken(token: string, secret: string): SignedPayload | null {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const expected = sign(encoded, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as SignedPayload;
    if (!payload?.key || !payload.purpose || !payload.expiresAt) return null;
    if (payload.expiresAt < Date.now()) return null;
    if (payload.purpose !== 'upload' && payload.purpose !== 'download') return null;
    return payload;
  } catch {
    return null;
  }
}

export function sanitizeStorageKey(key: string): string {
  const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
  if (
    normalized.length === 0 ||
    normalized.includes('..') ||
    normalized.includes('\0') ||
    normalized.length > 512 ||
    !/^[A-Za-z0-9][A-Za-z0-9/_.\-]*$/.test(normalized)
  ) {
    throw new Error('Invalid storage key');
  }
  return normalized;
}

export function safeFilename(name: string): string {
  return name
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+/, '')
    .slice(0, 120);
}
