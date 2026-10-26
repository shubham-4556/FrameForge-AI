import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

export type PrismaClientLike = PrismaClient;

export function createPrismaClient(options?: { logQueries?: boolean }): PrismaClient {
  return new PrismaClient({
    log: options?.logQueries ? ['warn', 'error'] : ['warn', 'error'],
  });
}

let shared: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!shared) shared = createPrismaClient();
  return shared;
}
