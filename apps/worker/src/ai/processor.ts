import type { PrismaClientLike } from '@frameforge/db';
import { createLogger } from '../logger';

interface AiContext {
  prisma: PrismaClientLike;
  storage: any;
  env: any;
  redis: any;
  jobId: string;
  logger: ReturnType<typeof createLogger>;
}

export async function processAiJob(ctx: AiContext) {
  const { prisma, jobId, logger } = ctx;
  const job: any = await (prisma as any).aiGenerationJob.findUnique({ where: { id: jobId }, include: { project: true } });

  if (!job) {
    (logger as any).error('AI job not found');
    return;
  }

  if (job.status !== 'QUEUED') {
    return;
  }

  await (prisma as any).aiGenerationJob.update({
    where: { id: job.id },
    data: { status: 'RUNNING', startedAt: new Date(), progress: 10 },
  });

  try {
    await new Promise((resolve) => setTimeout(resolve, 100));
    await (prisma as any).aiGenerationJob.update({
      where: { id: job.id },
      data: { status: 'SUCCEEDED', progress: 100, finishedAt: new Date(), result: { mock: true } },
    });
    (logger as any).info({ aiJobId: job.id }, 'AI job completed');
  } catch (err: any) {
    (logger as any).error({ err: err?.message }, 'AI job failed');
    await (prisma as any).aiGenerationJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', finishedAt: new Date(), error: err?.message },
    });
  }
}
