import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '@frameforge/db';
import { createStorage, getServerEnv, type ServerEnv, type StorageDriver } from '@frameforge/shared/server';

for (const candidate of ['.env', '../../.env']) {
  dotenv.config({ path: path.resolve(process.cwd(), candidate), override: false });
}

export const env: ServerEnv = getServerEnv();
export const prisma = new PrismaClient({ log: ['warn', 'error'] });
export const storage: StorageDriver = createStorage(env);
