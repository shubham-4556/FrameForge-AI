import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createStorage,
  type StorageDriver,
  type StorageStat,
} from '@frameforge/shared/server';
import type { WorkerEnv } from './env';

export interface WorkerStorage extends StorageDriver {
  putObject(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<StorageStat>;
  getObject(key: string): Promise<Buffer>;
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export function createStorageDriver(env: WorkerEnv): WorkerStorage {
  const driver = createStorage(env as never);

  const storage: WorkerStorage = Object.assign(driver, {
    async putObject(
      key: string,
      body: Buffer | Uint8Array | string,
      contentType?: string,
    ): Promise<StorageStat> {
      const workDir = await mkdtemp(join(tmpdir(), 'frameforge-put-'));
      const filePath = join(workDir, 'object');
      try {
        await writeFile(filePath, typeof body === 'string' ? Buffer.from(body) : Buffer.from(body));
        return await driver.putFile(key, filePath, contentType);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    },
    getObject(key: string): Promise<Buffer> {
      return driver.getBuffer(key);
    },
    async getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
      const target = await driver.createDownloadUrl({ key, expiresInSeconds });
      return target.url;
    },
  });

  return storage;
}
