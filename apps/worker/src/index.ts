import { createWorkers } from './queues';
import { prisma, redis } from './services/clients';
import { createStorageDriver } from './services/storage';
import { loadServerEnv } from './services/env';

async function main() {
  const env = loadServerEnv(process.env);
  const storage = createStorageDriver(env);
  const workers = createWorkers({ redis, prisma, storage, env });
  console.log(`FrameForge worker started with ${workers.length} workers`);
}

main().catch((err) => {
  console.error('Worker failed to start', err);
  process.exit(1);
});
