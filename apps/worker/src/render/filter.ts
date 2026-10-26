import path from 'node:path';
import type {
  AudioClip,
  ImageClip,
  TextClip,
  TimelineClip,
  TimelineDocument,
  TimelineTrack,
  VideoClip,
} from '@frameforge/shared';
import { clamp } from '@frameforge/shared';

export interface RenderAssetInfo {
  id: string;
  kind: 'VIDEO' | 'IMAGE' | 'AUDIO' | 'FONT';
  path: string;
  hasAudio: boolean;
}

export interface FilterInput {
  path: string;
  kind: 'video' | 'image' | 'audio';
  loop: boolean;
  durationSeconds?: number;
}

export interface TextFile {
  path: string;
  content: string;
}

export interface RenderPlan {
  inputs: FilterInput[];
  filter: string;
  textFiles: TextFile[];
  audioInputCount: number;
  visualClipCount: number;
}

export interface BuildPlanOptions {
  document: TimelineDocument;
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  fontPath: string;
  assets: Map<string, RenderAssetInfo>;
  workingDir: string;
  includeAudio: boolean;
}

function seconds(ms: number): string {
  return (ms / 1000).toFixed(3);
}

function colorHex(value: string): string {
  return `0x${value.replace(/^#/, '').toLowerCase()}`;
}

function atempoChain(speed: number): string {
  const filters: string[] = [];
  let remaining = clamp(speed, 0.25, 4);
  while (remaining > 2.0001) {
    filters.push('atempo=2');
    remaining /= 2;
  }
  while (remaining < 0.4999) {
    filters.push('atempo=0.5');
    remaining *= 2;
  }
  if (Math.abs(remaining - 1) > 0.0001) filters.push(`atempo=${remaining.toFixed(5)}`);
  return filters.join(',');
}

function escapeFilterPath(value: string): string {
  return value.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function fitFilters(clip: VideoClip | ImageClip, width: number, height: number): string {
  if (clip.fit === 'cover') {
    return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
  }
  return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`;
}

function fadeFilters(clip: TimelineClip): string[] {
  const filters: string[] = [];
  if (clip.fadeInMs > 0) {
    filters.push(`fade=t=in:st=0:d=${seconds(clip.fadeInMs)}:alpha=1`);
  }
  if (clip.fadeOutMs > 0) {
    filters.push(
      `fade=t=out:st=${seconds(Math.max(0, clip.durationMs - clip.fadeOutMs))}:d=${seconds(clip.fadeOutMs)}:alpha=1`,
    );
  }
  return filters;
}

function audioFilters(clip: AudioClip | VideoClip, durationMs: number): string[] {
  const filters: string[] = [];
  if (clip.fadeInMs > 0) {
    filters.push(`afade=t=in:st=0:d=${seconds(clip.fadeInMs)}`);
  }
  if (clip.fadeOutMs > 0) {
    filters.push(
      `afade=t=out:st=${seconds(Math.max(0, durationMs - clip.fadeOutMs))}:d=${seconds(clip.fadeOutMs)}`,
    );
  }
  return filters;
}

function wrapText(text: string, maxChars: number): string {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      if (line.length === 0) {
        line = word;
      } else if (line.length + 1 + word.length <= maxChars) {
        line += ` ${word}`;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (words.length === 0) lines.push('');
  }
  return lines.join('\n');
}

function visualTracks(document: TimelineDocument): TimelineTrack[] {
  const media = document.tracks.filter(
    (track) => !track.hidden && (track.type === 'video' || track.type === 'overlay'),
  );
  return [
    ...media.filter((track) => track.type === 'video'),
    ...media.filter((track) => track.type === 'overlay'),
  ];
}

function textTracks(document: TimelineDocument): TimelineTrack[] {
  return document.tracks.filter((track) => !track.hidden && track.type === 'text');
}

export function buildRenderPlan(options: BuildPlanOptions): RenderPlan {
  const { document, durationMs, width, height, fps, assets, includeAudio } = options;
  const duration = seconds(durationMs);
  const inputs: FilterInput[] = [];
  const textFiles: TextFile[] = [];
  const audioLabels: string[] = [];

  const filters: string[] = [`[0:v]format=rgba[base]`];
  let videoLabel = 'base';
  let visualClipCount = 0;

  for (const track of visualTracks(document)) {
    const clips = [...track.clips].sort((a, b) => a.startMs - b.startMs);
    for (const clip of clips) {
      if (clip.kind !== 'video' && clip.kind !== 'image') continue;
      const asset = assets.get(clip.assetId);
      if (!asset) throw new Error(`Missing asset ${clip.assetId} for clip ${clip.id}`);

      const inputIndex = inputs.length + 1;
      const isVideo = clip.kind === 'video';
      inputs.push({
        path: asset.path,
        kind: isVideo ? 'video' : 'image',
        loop: isVideo,
        durationSeconds: isVideo ? Math.ceil(durationMs / 1000) + 5 : Math.ceil(clip.durationMs / 1000) + 2,
      });

      const sourceDuration = isVideo
        ? seconds(clip.durationMs * (clip as VideoClip).speed)
        : seconds(clip.durationMs);
      const parts: string[] = [];
      if (isVideo) {
        parts.push(`trim=start=${seconds(clip.trimInMs)}:duration=${sourceDuration}`);
        parts.push(`setpts=(PTS-STARTPTS)/${(clip as VideoClip).speed}`);
      } else {
        parts.push(`trim=duration=${seconds(clip.durationMs)}`);
        parts.push('setpts=PTS-STARTPTS');
      }
      parts.push(`fps=${fps}`);
      parts.push(fitFilters(clip, width, height));
      parts.push('format=rgba');
      parts.push(`colorchannelmixer=aa=${clip.opacity}`);
      parts.push(...fadeFilters(clip));
      parts.push(`setpts=PTS-STARTPTS+${seconds(clip.startMs)}/TB`);

      const label = `v${visualClipCount}`;
      filters.push(`[${inputIndex}:v]${parts.join(',')}[${label}]`);
      const outLabel = `cv${visualClipCount}`;
      filters.push(
        `[${videoLabel}][${label}]overlay=x=0:y=0:eof_action=pass:repeatlast=0:enable='between(t,${seconds(clip.startMs)},${seconds(clip.startMs + clip.durationMs)})'[${outLabel}]`,
      );
      videoLabel = outLabel;
      visualClipCount += 1;

      if (
        includeAudio &&
        isVideo &&
        asset.hasAudio &&
        !clip.muted &&
        !track.muted &&
        (clip as VideoClip).volume > 0
      ) {
        const audioParts = [
          `atrim=start=${seconds(clip.trimInMs)}:duration=${sourceDuration}`,
          'asetpts=PTS-STARTPTS',
          atempoChain((clip as VideoClip).speed),
          `volume=${(clip as VideoClip).volume}`,
          ...audioFilters(clip as VideoClip, clip.durationMs),
          `adelay=${clip.startMs}:all=1`,
        ].filter(Boolean);
        const audioLabel = `a${audioLabels.length}`;
        filters.push(`[${inputIndex}:a]${audioParts.join(',')}[${audioLabel}]`);
        audioLabels.push(audioLabel);
      }
    }
  }

  let textIndex = 0;
  for (const track of textTracks(document)) {
    const clips = [...track.clips]
      .filter((clip): clip is TextClip => clip.kind === 'text')
      .sort((a, b) => a.startMs - b.startMs);
    for (const clip of clips) {
      const maxChars = Math.max(
        8,
        Math.floor(((width * clip.maxWidthPercent) / 100) / (clip.fontSize * 0.56)),
      );
      const textPath = path.join(options.workingDir, `text-${textIndex}.txt`);
      textFiles.push({ path: textPath, content: wrapText(clip.text, maxChars) });

      const alignFactor = clip.align === 'left' ? 0 : clip.align === 'right' ? 1 : 0.5;
      const box = clip.background
        ? `:box=1:boxcolor=${colorHex(clip.background)}@0.72:boxborderw=16`
        : '';
      const label = `t${textIndex}`;
      filters.push(
        `[${videoLabel}]drawtext=fontfile='${escapeFilterPath(options.fontPath)}':textfile='${escapeFilterPath(textPath)}':fontsize=${clip.fontSize}:fontcolor=${colorHex(clip.color)}:line_spacing=8:x=(w*${clip.xPercent}/100)-text_w*${alignFactor}:y=(h*${clip.yPercent}/100)-text_h/2:enable='between(t,${seconds(clip.startMs)},${seconds(clip.startMs + clip.durationMs)})':fix_bounds=1${box}[${label}]`,
      );
      videoLabel = label;
      textIndex += 1;
    }
  }

  for (const track of document.tracks) {
    if (track.hidden || track.muted || track.type !== 'audio') continue;
    const clips = [...track.clips]
      .filter((clip): clip is AudioClip => clip.kind === 'audio')
      .sort((a, b) => a.startMs - b.startMs);
    for (const clip of clips) {
      if (clip.muted || clip.volume <= 0) continue;
      const asset = assets.get(clip.assetId);
      if (!asset) throw new Error(`Missing asset ${clip.assetId} for clip ${clip.id}`);
      const inputIndex = inputs.length + 1;
      inputs.push({
        path: asset.path,
        kind: 'audio',
        loop: true,
        durationSeconds: Math.ceil(clip.durationMs / 1000) + 5,
      });
      const sourceDuration = seconds(clip.durationMs * clip.speed);
      const parts = [
        `atrim=start=${seconds(clip.trimInMs)}:duration=${sourceDuration}`,
        'asetpts=PTS-STARTPTS',
        atempoChain(clip.speed),
        `volume=${clip.volume}`,
        ...audioFilters(clip, clip.durationMs),
        `adelay=${clip.startMs}:all=1`,
      ].filter(Boolean);
      const audioLabel = `a${audioLabels.length}`;
      filters.push(`[${inputIndex}:a]${parts.join(',')}[${audioLabel}]`);
      audioLabels.push(audioLabel);
    }
  }

  filters.push(`[${videoLabel}]format=yuv420p[vout]`);

  if (audioLabels.length > 0) {
    const mixInputs = audioLabels.map((label) => `[${label}]`).join('');
    filters.push(
      `${mixInputs}amix=inputs=${audioLabels.length}:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.95,apad=whole_dur=${duration},atrim=duration=${duration}[aout]`,
    );
  } else {
    filters.push(
      `anullsrc=r=48000:cl=stereo,atrim=duration=${duration},asetpts=PTS-STARTPTS[aout]`,
    );
  }

  return {
    inputs,
    filter: filters.join(';\n'),
    textFiles,
    audioInputCount: audioLabels.length,
    visualClipCount,
  };
}

export function buildFfmpegArgs(input: {
  plan: RenderPlan;
  document: TimelineDocument;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  filterPath: string;
  outputPath: string;
  crf: number;
  audioBitrateKbps: number;
}): string[] {
  const { plan, document, width, height, fps, durationMs } = input;
  const args = ['-y', '-hide_banner', '-nostdin'];
  args.push(
    '-f',
    'lavfi',
    '-t',
    seconds(durationMs),
    '-i',
    `color=c=${colorHex(document.background)}:s=${width}x${height}:r=${fps}`,
  );

  for (const spec of plan.inputs) {
    if (spec.kind === 'image') {
      args.push('-loop', '1');
      if (spec.durationSeconds) args.push('-t', String(spec.durationSeconds));
    } else if (spec.loop) {
      args.push('-stream_loop', '-1');
    }
    args.push('-i', spec.path);
  }

  args.push('-filter_complex_script', input.filterPath);
  args.push('-map', '[vout]', '-map', '[aout]');
  args.push(
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    String(input.crf),
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(fps),
    '-g',
    String(fps * 2),
    '-c:a',
    'aac',
    '-b:a',
    `${input.audioBitrateKbps}k`,
    '-ar',
    '48000',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    '-t',
    seconds(durationMs),
    '-progress',
    'pipe:1',
    '-nostats',
    input.outputPath,
  );
  return args;
}
