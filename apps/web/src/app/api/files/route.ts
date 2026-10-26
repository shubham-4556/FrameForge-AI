import { NextRequest, NextResponse } from 'next/server';
import { verifyStorageToken } from '@frameforge/shared/server';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { getServerEnv } from '@frameforge/shared/server';

function resolveStorageDir(env: ReturnType<typeof getServerEnv>): string {
  if (env.STORAGE_DRIVER === 's3') return '/tmp/frameforge-storage';
  if (path.isAbsolute(env.LOCAL_STORAGE_DIR)) return env.LOCAL_STORAGE_DIR;
  return path.resolve(process.cwd(), env.LOCAL_STORAGE_DIR);
}

function sanitize(key: string): string {
  const normalized = path.normalize(key).replace(/\\/g, '/');
  if (normalized.startsWith('../') || normalized.includes('/../')) throw new Error('Invalid key');
  return normalized.replace(/^\/+/, '');
}

export async function GET(request: NextRequest) {
  try {
    const env = getServerEnv();
    const token = request.nextUrl.searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const payload = verifyStorageToken(token, env.SIGNING_SECRET);
    if (payload.purpose !== 'download') return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const key = sanitize(payload.key);
    const root = resolveStorageDir(env);
    const filePath = path.resolve(root, key);
    if (!filePath.startsWith(root + path.sep)) return NextResponse.json({ error: 'Invalid path' }, { status: 403 });

    const buffer = await fsp.readFile(filePath);
    const headers = new Headers();
    headers.set('Content-Type', payload.mimeType ?? 'application/octet-stream');
    if (payload.filename) {
      headers.set('Content-Disposition', `attachment; filename="${payload.filename.replace(/"/g, '')}"`);
    } else {
      headers.set('Content-Disposition', 'inline');
    }
    headers.set('Cache-Control', 'private, max-age=0');
    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const env = getServerEnv();
    const token = request.nextUrl.searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const payload = verifyStorageToken(token, env.SIGNING_SECRET);
    if (payload.purpose !== 'upload') return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const contentType = request.headers.get('content-type') ?? payload.mimeType;
    if (payload.mimeType && contentType && contentType !== payload.mimeType) {
      return NextResponse.json({ error: 'Content-Type mismatch' }, { status: 400 });
    }

    const buffer = Buffer.from(await request.arrayBuffer());
    if (payload.maxBytes && buffer.length > payload.maxBytes) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const key = sanitize(payload.key);
    const root = resolveStorageDir(env);
    const filePath = path.resolve(root, key);
    if (!filePath.startsWith(root + path.sep)) return NextResponse.json({ error: 'Invalid path' }, { status: 403 });

    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, buffer);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}
