import path from 'node:path';
import { z } from 'zod';

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => value === true || value === 'true' || value === '1');

export const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    APP_URL: z.string().url().default('http://localhost:3000'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    API_INTERNAL_URL: z.string().url().default('http://localhost:4000'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    SIGNING_SECRET: z.string().min(32, 'SIGNING_SECRET must be at least 32 characters'),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_DIR: z.string().default('./.data/storage'),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().default('frameforge'),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: booleanish.default(true),

    FFMPEG_PATH: z.string().default('ffmpeg'),
    FFPROBE_PATH: z.string().default('ffprobe'),
    FFMPEG_FONT: z.string().default('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),
    MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(2048).default(512),
    MAX_RENDER_MINUTES: z.coerce.number().int().min(1).max(240).default(30),
    RENDER_TIMEOUT_SECONDS: z.coerce.number().int().min(10).max(7200).default(900),
    WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(1),

    AI_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
    OPENAI_TEXT_MODEL: z.string().default('gpt-4o-mini'),
    OPENAI_IMAGE_MODEL: z.string().default('gpt-image-1'),
    OPENAI_TTS_MODEL: z.string().default('gpt-4o-mini-tts'),
    OPENAI_TTS_VOICE: z.string().default('alloy'),
    OPENAI_TRANSCRIBE_MODEL: z.string().default('whisper-1'),

    MAIL_DRIVER: z.enum(['log', 'smtp']).default('log'),
    MAIL_FROM: z.string().default('FrameForge AI <no-reply@frameforge.ai>'),
    SMTP_URL: z.string().optional(),

    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_PRO: z.string().optional(),
    STRIPE_PRICE_STUDIO: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER === 's3') {
      if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY || !env.S3_BUCKET) {
        ctx.addIssue({
          code: 'custom',
          path: ['STORAGE_DRIVER'],
          message: 'S3 storage requires credentials and a bucket',
        });
      }
    }
    if (env.AI_PROVIDER === 'openai' && !env.OPENAI_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['OPENAI_API_KEY'],
        message: 'AI_PROVIDER=openai requires OPENAI_API_KEY',
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(overrides?: NodeJS.ProcessEnv): ServerEnv {
  if (cached && !overrides) return cached;
  const parsed = serverEnvSchema.safeParse(overrides ?? process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid server environment: ${detail}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetServerEnvCache(): void {
  cached = null;
}

export function resolveStorageDir(env: Pick<ServerEnv, 'STORAGE_LOCAL_DIR'>): string {
  return path.isAbsolute(env.STORAGE_LOCAL_DIR)
    ? env.STORAGE_LOCAL_DIR
    : path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR);
}

export function isProduction(env: Pick<ServerEnv, 'NODE_ENV'>): boolean {
  return env.NODE_ENV === 'production';
}
