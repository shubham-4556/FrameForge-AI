import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ServerEnv } from './env';
import { resolveStorageDir } from './env';
import { safeFilename, sanitizeStorageKey, signStorageToken } from './signed-url';

export interface UploadTarget {
  key: string;
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
}

export interface StorageStat {
  key: string;
  sizeBytes: number;
  contentType?: string;
}

export interface DownloadTarget {
  key: string;
  url: string;
  expiresAt: string;
}

export interface StorageDriver {
  readonly driver: 'local' | 's3';
  createUploadTarget(input: {
    key: string;
    mimeType: string;
    maxBytes: number;
    expiresInSeconds?: number;
  }): Promise<UploadTarget>;
  createDownloadUrl(input: {
    key: string;
    filename?: string;
    contentType?: string;
    expiresInSeconds?: number;
  }): Promise<DownloadTarget>;
  stat(key: string): Promise<StorageStat | null>;
  delete(key: string): Promise<void>;
  putFile(key: string, filePath: string, contentType?: string): Promise<StorageStat>;
  getToFile(key: string, destination: string): Promise<StorageStat>;
  getBuffer(key: string, maxBytes?: number): Promise<Buffer>;
  getStream(key: string): Promise<Readable>;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.srt': 'application/x-subrip',
  '.vtt': 'text/vtt',
};

export function contentTypeForKey(key: string): string {
  return MIME_BY_EXTENSION[path.extname(key).toLowerCase()] ?? 'application/octet-stream';
}

class LocalStorageDriver implements StorageDriver {
  readonly driver = 'local' as const;
  private readonly root: string;

  constructor(private readonly env: ServerEnv) {
    this.root = resolveStorageDir(env);
  }

  private absolute(key: string): string {
    const safeKey = sanitizeStorageKey(key);
    const full = path.resolve(this.root, safeKey);
    if (!full.startsWith(this.root + path.sep)) throw new Error('Invalid storage path');
    return full;
  }

  async createUploadTarget(input: {
    key: string;
    mimeType: string;
    maxBytes: number;
    expiresInSeconds?: number;
  }): Promise<UploadTarget> {
    const expiresAt = Date.now() + (input.expiresInSeconds ?? 900) * 1000;
    const token = signStorageToken(
      {
        key: sanitizeStorageKey(input.key),
        purpose: 'upload',
        expiresAt,
        mimeType: input.mimeType,
        maxBytes: input.maxBytes,
      },
      this.env.SIGNING_SECRET,
    );
    return {
      key: input.key,
      url: `${this.env.APP_URL}/api/files?token=${encodeURIComponent(token)}`,
      method: 'PUT',
      headers: { 'Content-Type': input.mimeType },
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  async createDownloadUrl(input: {
    key: string;
    filename?: string;
    contentType?: string;
    expiresInSeconds?: number;
  }): Promise<DownloadTarget> {
    const expiresAt = Date.now() + (input.expiresInSeconds ?? 3600) * 1000;
    const token = signStorageToken(
      {
        key: sanitizeStorageKey(input.key),
        purpose: 'download',
        expiresAt,
        mimeType: input.contentType ?? contentTypeForKey(input.key),
        filename: input.filename ? safeFilename(input.filename) : undefined,
      },
      this.env.SIGNING_SECRET,
    );
    return {
      key: input.key,
      url: `${this.env.APP_URL}/api/files?token=${encodeURIComponent(token)}`,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  async stat(key: string): Promise<StorageStat | null> {
    try {
      const stats = await fsp.stat(this.absolute(key));
      if (!stats.isFile()) return null;
      return { key, sizeBytes: stats.size, contentType: contentTypeForKey(key) };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await fsp.rm(this.absolute(key), { force: true });
  }

  async putFile(key: string, filePath: string, contentType?: string): Promise<StorageStat> {
    const destination = this.absolute(key);
    await fsp.mkdir(path.dirname(destination), { recursive: true });
    await fsp.copyFile(filePath, destination);
    const stats = await fsp.stat(destination);
    return { key, sizeBytes: stats.size, contentType: contentType ?? contentTypeForKey(key) };
  }

  async getToFile(key: string, destination: string): Promise<StorageStat> {
    const source = this.absolute(key);
    const stats = await fsp.stat(source);
    await fsp.mkdir(path.dirname(destination), { recursive: true });
    await fsp.copyFile(source, destination);
    return { key, sizeBytes: stats.size, contentType: contentTypeForKey(key) };
  }

  async getBuffer(key: string, maxBytes = 1024 * 1024 * 1024): Promise<Buffer> {
    const stats = await fsp.stat(this.absolute(key));
    if (stats.size > maxBytes) throw new Error('Object exceeds buffer limit');
    return fsp.readFile(this.absolute(key));
  }

  async getStream(key: string): Promise<Readable> {
    return fs.createReadStream(this.absolute(key));
  }
}

class S3StorageDriver implements StorageDriver {
  readonly driver = 's3' as const;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly env: ServerEnv) {
    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      region: env.S3_REGION,
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  async createUploadTarget(input: {
    key: string;
    mimeType: string;
    maxBytes: number;
    expiresInSeconds?: number;
  }): Promise<UploadTarget> {
    const key = sanitizeStorageKey(input.key);
    const expiresIn = input.expiresInSeconds ?? 900;
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: input.mimeType,
      }),
      { expiresIn },
    );
    return {
      key,
      url,
      method: 'PUT',
      headers: { 'Content-Type': input.mimeType },
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  async createDownloadUrl(input: {
    key: string;
    filename?: string;
    contentType?: string;
    expiresInSeconds?: number;
  }): Promise<DownloadTarget> {
    const key = sanitizeStorageKey(input.key);
    const expiresIn = input.expiresInSeconds ?? 3600;
    const filename = input.filename ? safeFilename(input.filename) : undefined;
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(filename
          ? { ResponseContentDisposition: `attachment; filename="${filename}"` }
          : {}),
        ...(input.contentType ? { ResponseContentType: input.contentType } : {}),
      }),
      { expiresIn },
    );
    return { key, url, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
  }

  async stat(key: string): Promise<StorageStat | null> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: sanitizeStorageKey(key) }),
      );
      return {
        key,
        sizeBytes: head.ContentLength ?? 0,
        contentType: head.ContentType ?? contentTypeForKey(key),
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: sanitizeStorageKey(key) }),
    );
  }

  async putFile(key: string, filePath: string, contentType?: string): Promise<StorageStat> {
    const stats = await fsp.stat(filePath);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: sanitizeStorageKey(key),
        Body: fs.createReadStream(filePath),
        ContentLength: stats.size,
        ContentType: contentType ?? contentTypeForKey(key),
      }),
    );
    return { key, sizeBytes: stats.size, contentType: contentType ?? contentTypeForKey(key) };
  }

  async getToFile(key: string, destination: string): Promise<StorageStat> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: sanitizeStorageKey(key) }),
    );
    if (!response.Body) throw new Error('Empty S3 response');
    await fsp.mkdir(path.dirname(destination), { recursive: true });
    await pipeline(response.Body as Readable, fs.createWriteStream(destination));
    const stats = await fsp.stat(destination);
    return { key, sizeBytes: stats.size, contentType: response.ContentType };
  }

  async getBuffer(key: string, maxBytes = 1024 * 1024 * 1024): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: sanitizeStorageKey(key) }),
    );
    if (!response.Body) throw new Error('Empty S3 response');
    const buffer = Buffer.from(await response.Body.transformToByteArray());
    if (buffer.byteLength > maxBytes) throw new Error('Object exceeds buffer limit');
    return buffer;
  }

  async getStream(key: string): Promise<Readable> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: sanitizeStorageKey(key) }),
    );
    if (!response.Body) throw new Error('Empty S3 response');
    return response.Body as Readable;
  }
}

export function createStorage(env: ServerEnv): StorageDriver {
  return env.STORAGE_DRIVER === 's3' ? new S3StorageDriver(env) : new LocalStorageDriver(env);
}
