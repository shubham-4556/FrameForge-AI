import { z } from 'zod';
import {
  MAX_CLIP_DURATION_MS,
  MAX_TEXT_LENGTH,
  MAX_TIMELINE_MS,
  FONT_FAMILIES,
  aspectRatioSchema,
  resolveDimensions,
  type AspectRatio,
  type Fps,
  type FontFamily,
} from './constants';

const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Expected a #rrggbb color')
  .default('#ffffff');

const idSchema = z
  .string()
  .min(6)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid identifier');

const clipBase = {
  id: idSchema,
  startMs: z.number().int().min(0).max(MAX_TIMELINE_MS),
  durationMs: z.number().int().min(100).max(MAX_CLIP_DURATION_MS),
  trimInMs: z.number().int().min(0).max(MAX_CLIP_DURATION_MS).default(0),
  opacity: z.number().min(0).max(1).default(1),
  fadeInMs: z.number().int().min(0).max(5000).default(0),
  fadeOutMs: z.number().int().min(0).max(5000).default(0),
};

export const textClipSchema = z
  .object({
    ...clipBase,
    kind: z.literal('text'),
    role: z.enum(['title', 'caption']).default('title'),
    text: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
    fontFamily: z.enum(['sans', 'serif', 'mono']).default('sans'),
    fontSize: z.number().int().min(12).max(220).default(64),
    color: colorSchema,
    background: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .nullable()
      .default(null),
    align: z.enum(['left', 'center', 'right']).default('center'),
    xPercent: z.number().min(0).max(100).default(50),
    yPercent: z.number().min(0).max(100).default(50),
    maxWidthPercent: z.number().min(10).max(100).default(80),
    bold: z.boolean().default(true),
    transition: z.enum(['none', 'fade']).default('none'),
  })
  .strict();

export const videoClipSchema = z
  .object({
    ...clipBase,
    kind: z.literal('video'),
    assetId: idSchema,
    fit: z.enum(['contain', 'cover']).default('contain'),
    volume: z.number().min(0).max(2).default(1),
    muted: z.boolean().default(false),
    speed: z.number().min(0.25).max(4).default(1),
    transition: z.enum(['none', 'fade']).default('none'),
  })
  .strict();

export const imageClipSchema = z
  .object({
    ...clipBase,
    kind: z.literal('image'),
    assetId: idSchema,
    fit: z.enum(['contain', 'cover']).default('contain'),
    scale: z.number().min(1).max(1.5).default(1),
    transition: z.enum(['none', 'fade']).default('none'),
  })
  .strict();

export const audioClipSchema = z
  .object({
    ...clipBase,
    kind: z.literal('audio'),
    assetId: idSchema,
    volume: z.number().min(0).max(2).default(1),
    muted: z.boolean().default(false),
    speed: z.number().min(0.25).max(4).default(1),
  })
  .strict();

export const clipSchema = z.discriminatedUnion('kind', [
  videoClipSchema,
  imageClipSchema,
  audioClipSchema,
  textClipSchema,
]);

export type TimelineClip = z.infer<typeof clipSchema>;
export type VideoClip = z.infer<typeof videoClipSchema>;
export type ImageClip = z.infer<typeof imageClipSchema>;
export type AudioClip = z.infer<typeof audioClipSchema>;
export type TextClip = z.infer<typeof textClipSchema>;

export const trackSchema = z
  .object({
    id: idSchema,
    type: z.enum(['video', 'overlay', 'audio', 'text']),
    name: z.string().trim().min(1).max(40),
    muted: z.boolean().default(false),
    locked: z.boolean().default(false),
    hidden: z.boolean().default(false),
    clips: z.array(clipSchema).max(200),
  })
  .strict();

export type TimelineTrack = z.infer<typeof trackSchema>;

export const timelineDocumentSchema = z
  .object({
    version: z.literal(1),
    name: z.string().trim().max(120).optional(),
    aspectRatio: aspectRatioSchema,
    width: z.number().int().min(320).max(5120),
    height: z.number().int().min(240).max(2880),
    fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)]),
    background: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default('#000000'),
    tracks: z.array(trackSchema).max(24),
  })
  .strict()
  .superRefine((doc, ctx) => {
    const ids = new Set<string>();
    for (const track of doc.tracks) {
      if (ids.has(track.id)) {
        ctx.addIssue({ code: 'custom', path: ['tracks'], message: `Duplicate track id ${track.id}` });
      }
      ids.add(track.id);
      for (const clip of track.clips) {
        if (ids.has(clip.id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['tracks'],
            message: `Duplicate clip id ${clip.id}`,
          });
        }
        ids.add(clip.id);

        const compatible =
          (track.type === 'video' && (clip.kind === 'video' || clip.kind === 'image')) ||
          (track.type === 'overlay' && (clip.kind === 'video' || clip.kind === 'image')) ||
          (track.type === 'audio' && clip.kind === 'audio') ||
          (track.type === 'text' && clip.kind === 'text');

        if (!compatible) {
          ctx.addIssue({
            code: 'custom',
            path: ['tracks'],
            message: `Clip ${clip.id} (${clip.kind}) is not allowed on ${track.type} track`,
          });
        }

        if (clip.startMs + clip.durationMs > MAX_TIMELINE_MS) {
          ctx.addIssue({
            code: 'custom',
            path: ['tracks'],
            message: `Clip ${clip.id} extends beyond the maximum timeline duration`,
          });
        }

        if (clip.kind === 'text' && clip.role === 'caption' && track.type !== 'text') {
          ctx.addIssue({
            code: 'custom',
            path: ['tracks'],
            message: 'Caption clips must be on a text track',
          });
        }
      }
    }
  });

export type TimelineDocument = z.infer<typeof timelineDocumentSchema>;

export function createId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `id_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function createEmptyTimeline(options?: {
  aspectRatio?: AspectRatio;
  fps?: Fps;
  name?: string;
}): TimelineDocument {
  const aspectRatio = options?.aspectRatio ?? '16:9';
  const fps = options?.fps ?? 30;
  const { width, height } = resolveDimensions(aspectRatio, '1080p');
  return {
    version: 1,
    ...(options?.name ? { name: options.name } : {}),
    aspectRatio,
    width,
    height,
    fps,
    background: '#000000',
    tracks: [
      { id: createId(), type: 'overlay', name: 'Overlays', muted: false, locked: false, hidden: false, clips: [] },
      { id: createId(), type: 'text', name: 'Titles', muted: false, locked: false, hidden: false, clips: [] },
      { id: createId(), type: 'video', name: 'Video 1', muted: false, locked: false, hidden: false, clips: [] },
      { id: createId(), type: 'audio', name: 'Audio', muted: false, locked: false, hidden: false, clips: [] },
      { id: createId(), type: 'text', name: 'Captions', muted: false, locked: false, hidden: false, clips: [] },
    ],
  };
}

export function timelineDurationMs(doc: TimelineDocument): number {
  let max = 0;
  for (const track of doc.tracks) {
    for (const clip of track.clips) {
      max = Math.max(max, clip.startMs + clip.durationMs);
    }
  }
  return max;
}

export function clipEndMs(clip: Pick<TimelineClip, 'startMs' | 'durationMs'>): number {
  return clip.startMs + clip.durationMs;
}

export function clipsForTrack(doc: TimelineDocument, trackId: string): TimelineClip[] {
  return doc.tracks.find((t) => t.id === trackId)?.clips ?? [];
}

export function findClip(
  doc: TimelineDocument,
  clipId: string,
): { track: TimelineTrack; clip: TimelineClip } | null {
  for (const track of doc.tracks) {
    const clip = track.clips.find((c) => c.id === clipId);
    if (clip) return { track, clip };
  }
  return null;
}

export function formatTimecode(ms: number, includeMs = false): string {
  const clamped = Math.max(0, Math.round(ms));
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const millis = clamped % 1000;
  const base = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    seconds,
  ).padStart(2, '0')}`;
  return includeMs ? `${base}.${String(millis).padStart(3, '0')}` : base;
}

export function formatTimecodeShort(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function srtTimestamp(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const h = String(Math.floor(clamped / 3_600_000)).padStart(2, '0');
  const m = String(Math.floor((clamped % 3_600_000) / 60_000)).padStart(2, '0');
  const s = String(Math.floor((clamped % 60_000) / 1000)).padStart(2, '0');
  const millis = String(clamped % 1000).padStart(3, '0');
  return `${h}:${m}:${s},${millis}`;
}

export function vttTimestamp(ms: number): string {
  return srtTimestamp(ms).replace(',', '.');
}

export function captionClips(doc: TimelineDocument): TextClip[] {
  return doc.tracks
    .flatMap((track) => track.clips)
    .filter((clip): clip is TextClip => clip.kind === 'text' && clip.role === 'caption')
    .sort((a, b) => a.startMs - b.startMs);
}

export function captionsToSrt(doc: TimelineDocument): string {
  return captionClips(doc)
    .map((clip, index) => {
      const end = clip.startMs + clip.durationMs;
      return `${index + 1}\n${srtTimestamp(clip.startMs)} --> ${srtTimestamp(end)}\n${clip.text}\n`;
    })
    .join('\n');
}

export function captionsToVtt(doc: TimelineDocument): string {
  const cues = captionClips(doc)
    .map((clip, index) => {
      const end = clip.startMs + clip.durationMs;
      return `${index + 1}\n${vttTimestamp(clip.startMs)} --> ${vttTimestamp(end)}\n${clip.text}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${cues}`;
}

export function fontStack(family: FontFamily): string {
  return FONT_FAMILIES[family].stack;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function snapMs(value: number, grid = 100): number {
  return Math.round(value / grid) * grid;
}
