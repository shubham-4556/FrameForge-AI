export function loadServerEnv(input: NodeJS.ProcessEnv) {
  return {
    NODE_ENV: input.NODE_ENV || 'development',
    PORT: Number(input.WORKER_PORT || input.PORT || 4001),
    DATABASE_URL: input.DATABASE_URL || '',
    REDIS_URL: input.REDIS_URL || 'redis://127.0.0.1:6379',
    STORAGE_DRIVER: input.STORAGE_DRIVER || 'local',
    STORAGE_LOCAL_DIR: input.STORAGE_LOCAL_DIR || './uploads',
    STORAGE_LOCAL_BASE_URL: input.STORAGE_LOCAL_BASE_URL || 'http://localhost:4000',
    FFMPEG_PATH: input.FFMPEG_PATH || 'ffmpeg',
    FFPROBE_PATH: input.FFPROBE_PATH || 'ffprobe',
    WORKER_CONCURRENCY: Number(input.WORKER_CONCURRENCY || 2),
    AI_PROVIDER: input.AI_PROVIDER || 'mock',
    OPENAI_API_KEY: input.OPENAI_API_KEY,
  };
}
