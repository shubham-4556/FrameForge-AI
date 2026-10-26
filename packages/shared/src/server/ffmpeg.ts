import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ServerEnv } from './env';

const execFileAsync = promisify(execFile);

export interface ProbeResult {
  durationMs: number;
  width: number | null;
  height: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec: string | null;
  audioCodec: string | null;
  formatName: string | null;
  sizeBytes: number;
}

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: { duration?: string; format_name?: string; size?: string };
}

export async function probeMedia(filePath: string, env: Pick<ServerEnv, 'FFPROBE_PATH'>): Promise<ProbeResult> {
  const { stdout } = await execFileAsync(
    env.FFPROBE_PATH,
    [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      '-protocol_whitelist',
      'file',
      filePath,
    ],
    { timeout: 30_000, maxBuffer: 8 * 1024 * 1024 },
  );
  const data = JSON.parse(stdout) as FfprobeOutput;
  const streams = data.streams ?? [];
  const video = streams.find((stream) => stream.codec_type === 'video');
  const audio = streams.find((stream) => stream.codec_type === 'audio');
  const durationSeconds =
    Number(data.format?.duration) || Number(video?.duration) || Number(audio?.duration) || 0;

  return {
    durationMs: Math.max(0, Math.round(durationSeconds * 1000)),
    width: video?.width ?? null,
    height: video?.height ?? null,
    hasVideo: Boolean(video),
    hasAudio: Boolean(audio),
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    formatName: data.format?.format_name ?? null,
    sizeBytes: Number(data.format?.size) || 0,
  };
}

export function escapeFilterTextPath(fontPath: string): string {
  return fontPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

export function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}
