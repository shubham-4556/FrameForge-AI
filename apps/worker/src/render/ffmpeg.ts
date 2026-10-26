import { spawn } from 'node:child_process';

export class RenderCanceledError extends Error {
  constructor() {
    super('Render canceled');
    this.name = 'RenderCanceledError';
  }
}

export class FfmpegError extends Error {
  constructor(
    message: string,
    readonly stderr: string,
  ) {
    super(message);
    this.name = 'FfmpegError';
  }
}

export interface RunFfmpegOptions {
  ffmpegPath: string;
  args: string[];
  durationMs: number;
  timeoutMs: number;
  onProgress?: (fraction: number) => void;
  isCanceled?: () => Promise<boolean>;
  onLog?: (message: string) => void;
}

export async function runFfmpeg(options: RunFfmpegOptions): Promise<void> {
  const child = spawn(options.ffmpegPath, options.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  let stdoutBuffer = '';
  let lastReported = 0;
  let canceled = false;
  let settled = false;

  const kill = () => {
    if (!child.killed) child.kill('SIGKILL');
  };

  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
    if (stderr.length > 32_000) stderr = stderr.slice(-32_000);
  });

  child.stdout?.on('data', (chunk: Buffer) => {
    stdoutBuffer += chunk.toString('utf8');
    const lines = stdoutBuffer.split('\n');
    stdoutBuffer = lines.pop() ?? '';
    for (const line of lines) {
      const [key, rawValue] = line.trim().split('=');
      if (key === 'out_time_us' && rawValue) {
        const us = Number(rawValue);
        if (Number.isFinite(us) && options.durationMs > 0) {
          const fraction = Math.min(0.99, Math.max(0, us / 1000 / options.durationMs));
          if (fraction - lastReported > 0.02) {
            lastReported = fraction;
            options.onProgress?.(fraction);
          }
        }
      } else if (key === 'progress' && rawValue === 'end') {
        options.onProgress?.(1);
      }
    }
  });

  const timeout = setTimeout(() => {
    if (!settled) {
      options.onLog?.(`FFmpeg timed out after ${options.timeoutMs}ms`);
      kill();
    }
  }, options.timeoutMs);

  const cancelPoll = setInterval(() => {
    if (!options.isCanceled || canceled || settled) return;
    options.isCanceled().then((value) => {
      if (value && !settled) {
        canceled = true;
        kill();
      }
    }).catch(() => undefined);
  }, 1_000);

  try {
    await new Promise<void>((resolve, reject) => {
      child.on('error', (error) => {
        reject(new FfmpegError(`Failed to start FFmpeg: ${error.message}`, stderr));
      });
      child.on('close', (code, signal) => {
        settled = true;
        if (canceled) {
          reject(new RenderCanceledError());
        } else if (code === 0) {
          resolve();
        } else {
          reject(
            new FfmpegError(
              `FFmpeg exited with ${signal ?? `code ${code}`}: ${stderr.split('\n').slice(-12).join(' ')}`,
              stderr,
            ),
          );
        }
      });
    });
  } finally {
    clearTimeout(timeout);
    clearInterval(cancelPoll);
    if (!settled) kill();
  }
}
