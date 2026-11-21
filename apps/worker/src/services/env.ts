function booleanish(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

export function loadServerEnv(input: NodeJS.ProcessEnv) {
  return {
    NODE_ENV: input.NODE_ENV || 'development',
    PORT: Number(input.WORKER_PORT || input.PORT || 4001),
    APP_URL: input.APP_URL || 'http://localhost:3000',
    API_INTERNAL_URL: input.API_INTERNAL_URL || 'http://localhost:4000',
    DATABASE_URL: input.DATABASE_URL || '',
    REDIS_URL: input.REDIS_URL || 'redis://127.0.0.1:6379',
    SIGNING_SECRET: input.SIGNING_SECRET || 'frameforge-local-signing-secret-change-me',

    STORAGE_DRIVER: input.STORAGE_DRIVER === 's3' ? ('s3' as const) : ('local' as const),
    STORAGE_LOCAL_DIR: input.STORAGE_LOCAL_DIR || './.data/storage',
    S3_ENDPOINT: input.S3_ENDPOINT || undefined,
    S3_REGION: input.S3_REGION || 'us-east-1',
    S3_BUCKET: input.S3_BUCKET || 'frameforge',
    S3_ACCESS_KEY_ID: input.S3_ACCESS_KEY_ID || undefined,
    S3_SECRET_ACCESS_KEY: input.S3_SECRET_ACCESS_KEY || undefined,
    S3_FORCE_PATH_STYLE: booleanish(input.S3_FORCE_PATH_STYLE, true),

    FFMPEG_PATH: input.FFMPEG_PATH || 'ffmpeg',
    FFPROBE_PATH: input.FFPROBE_PATH || 'ffprobe',
    FFMPEG_FONT: input.FFMPEG_FONT || '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    MAX_UPLOAD_MB: Number(input.MAX_UPLOAD_MB || 512),
    MAX_RENDER_MINUTES: Number(input.MAX_RENDER_MINUTES || 30),
    RENDER_TIMEOUT_SECONDS: Number(input.RENDER_TIMEOUT_SECONDS || 900),
    WORKER_CONCURRENCY: Number(input.WORKER_CONCURRENCY || 2),

    AI_PROVIDER: input.AI_PROVIDER === 'openai' ? ('openai' as const) : ('mock' as const),
    OPENAI_API_KEY: input.OPENAI_API_KEY || undefined,
    OPENAI_BASE_URL: input.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    OPENAI_TEXT_MODEL: input.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
    OPENAI_IMAGE_MODEL: input.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    OPENAI_TTS_MODEL: input.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
    OPENAI_TTS_VOICE: input.OPENAI_TTS_VOICE || 'alloy',
    OPENAI_TRANSCRIBE_MODEL: input.OPENAI_TRANSCRIBE_MODEL || 'whisper-1',
    AI_GENERATE_IMAGES: booleanish(input.AI_GENERATE_IMAGES, false),
  };
}

export type WorkerEnv = ReturnType<typeof loadServerEnv>;
