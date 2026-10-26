import { Inject, Injectable } from '@nestjs/common';
import {
  createStorage,
  type DownloadTarget,
  type ServerEnv,
  type StorageDriver,
  type StorageStat,
  type UploadTarget,
} from '@frameforge/shared/server';
import { ENV } from '../config/env.module';

@Injectable()
export class StorageService {
  readonly driver: StorageDriver;

  constructor(@Inject(ENV) readonly env: ServerEnv) {
    this.driver = createStorage(env);
  }

  createUploadTarget(input: {
    key: string;
    mimeType: string;
    maxBytes: number;
    expiresInSeconds?: number;
  }): Promise<UploadTarget> {
    return this.driver.createUploadTarget(input);
  }

  createDownloadUrl(input: {
    key: string;
    filename?: string;
    contentType?: string;
    expiresInSeconds?: number;
  }): Promise<DownloadTarget> {
    return this.driver.createDownloadUrl(input);
  }

  stat(key: string): Promise<StorageStat | null> {
    return this.driver.stat(key);
  }

  delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  getBuffer(key: string, maxBytes?: number): Promise<Buffer> {
    return this.driver.getBuffer(key, maxBytes);
  }
}
