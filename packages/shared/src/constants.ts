import { z } from 'zod';

export const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:5', '4:3', '21:9'] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];
export const aspectRatioSchema = z.enum(ASPECT_RATIOS);

export const RESOLUTIONS = ['720p', '1080p', '1440p', '2160p'] as const;
export type Resolution = (typeof RESOLUTIONS)[number];
export const resolutionSchema = z.enum(RESOLUTIONS);

export const RESOLUTION_SHORT_SIDE: Record<Resolution, number> = {
  '720p': 720,
  '1080p': 1080,
  '1440p': 1440,
  '2160p': 2160,
};

export const FPS_OPTIONS = [24, 25, 30, 60] as const;
export type Fps = (typeof FPS_OPTIONS)[number];

export const PROJECT_STATUSES = ['DRAFT', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const ROLE_RANK: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

export const MEDIA_KINDS = ['VIDEO', 'IMAGE', 'AUDIO', 'FONT'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const ASSET_STATUSES = ['UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'DELETED'] as const;

export const AI_JOB_KINDS = [
  'TEXT_TO_VIDEO',
  'SCRIPT',
  'STORYBOARD',
  'IMAGE_TO_VIDEO',
  'TRANSCRIPTION',
  'TEXT_TO_SPEECH',
] as const;
export type AiJobKind = (typeof AI_JOB_KINDS)[number];

export const JOB_STATUSES = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const PLANS = ['FREE', 'PRO', 'STUDIO'] as const;
export type Plan = (typeof PLANS)[number];

export interface PlanDefinition {
  id: Plan;
  name: string;
  priceMonthlyUsd: number;
  tagline: string;
  storageGb: number;
  renderMinutesPerMonth: number;
  aiCreditsPerMonth: number;
  maxProjects: number;
  maxMembers: number;
  features: string[];
}

export const PLAN_DEFINITIONS: Record<Plan, PlanDefinition> = {
  FREE: {
    id: 'FREE',
    name: 'Starter',
    priceMonthlyUsd: 0,
    tagline: 'For exploring AI-assisted storytelling.',
    storageGb: 2,
    renderMinutesPerMonth: 10,
    aiCreditsPerMonth: 50,
    maxProjects: 10,
    maxMembers: 2,
    features: [
      '10 render minutes / month',
      '50 AI credits / month',
      '2 GB media storage',
      '1080p MP4 exports',
      'Mock AI previews in local mode',
    ],
  },
  PRO: {
    id: 'PRO',
    name: 'Creator',
    priceMonthlyUsd: 29,
    tagline: 'For creators shipping video every week.',
    storageGb: 50,
    renderMinutesPerMonth: 300,
    aiCreditsPerMonth: 1000,
    maxProjects: 100,
    maxMembers: 10,
    features: [
      '300 render minutes / month',
      '1,000 AI credits / month',
      '50 GB media storage',
      '4K exports & priority queue',
      'Team workspace with 10 seats',
    ],
  },
  STUDIO: {
    id: 'STUDIO',
    name: 'Studio',
    priceMonthlyUsd: 99,
    tagline: 'For content teams and agencies.',
    storageGb: 500,
    renderMinutesPerMonth: 2000,
    aiCreditsPerMonth: 10000,
    maxProjects: 1000,
    maxMembers: 50,
    features: [
      '2,000 render minutes / month',
      '10,000 AI credits / month',
      '500 GB media storage',
      '4K exports & priority queue',
      '50-seat collaboration',
    ],
  },
};

export const EXPORT_PRESETS = [
  {
    id: 'youtube-1080p',
    label: 'YouTube 1080p',
    platform: 'YouTube',
    aspectRatio: '16:9',
    resolution: '1080p',
    fps: 30,
    audioBitrateKbps: 192,
    description: 'Landscape 1920×1080 · H.264/AAC',
  },
  {
    id: 'youtube-4k',
    label: 'YouTube 4K',
    platform: 'YouTube',
    aspectRatio: '16:9',
    resolution: '2160p',
    fps: 30,
    audioBitrateKbps: 256,
    description: 'Landscape 3840×2160 · high bitrate',
  },
  {
    id: 'reels-1080p',
    label: 'Instagram Reels',
    platform: 'Instagram',
    aspectRatio: '9:16',
    resolution: '1080p',
    fps: 30,
    audioBitrateKbps: 192,
    description: 'Portrait 1080×1920 · faststart',
  },
  {
    id: 'tiktok-1080p',
    label: 'TikTok',
    platform: 'TikTok',
    aspectRatio: '9:16',
    resolution: '1080p',
    fps: 30,
    audioBitrateKbps: 192,
    description: 'Portrait 1080×1920 · H.264',
  },
  {
    id: 'shorts-1080p',
    label: 'YouTube Shorts',
    platform: 'YouTube',
    aspectRatio: '9:16',
    resolution: '1080p',
    fps: 30,
    audioBitrateKbps: 192,
    description: 'Portrait 1080×1920 · 30fps',
  },
  {
    id: 'square-1080p',
    label: 'Feed Square',
    platform: 'Instagram',
    aspectRatio: '1:1',
    resolution: '1080p',
    fps: 30,
    audioBitrateKbps: 192,
    description: 'Square 1080×1080',
  },
  {
    id: 'portrait-4x5',
    label: 'Portrait Feed',
    platform: 'Instagram',
    aspectRatio: '4:5',
    resolution: '1080p',
    fps: 30,
    audioBitrateKbps: 192,
    description: 'Portrait 1080×1350',
  },
  {
    id: 'cinema-4k',
    label: 'Cinema 21:9',
    platform: 'Web',
    aspectRatio: '21:9',
    resolution: '2160p',
    fps: 24,
    audioBitrateKbps: 256,
    description: 'Ultrawide 5040×2160 · 24fps',
  },
] as const;

export type ExportPresetId = (typeof EXPORT_PRESETS)[number]['id'];

export const UPLOAD_MIME_TYPES: Record<string, MediaKind> = {
  'video/mp4': 'VIDEO',
  'video/quicktime': 'VIDEO',
  'video/webm': 'VIDEO',
  'video/x-matroska': 'VIDEO',
  'image/jpeg': 'IMAGE',
  'image/png': 'IMAGE',
  'image/webp': 'IMAGE',
  'image/avif': 'IMAGE',
  'audio/mpeg': 'AUDIO',
  'audio/wav': 'AUDIO',
  'audio/x-wav': 'AUDIO',
  'audio/aac': 'AUDIO',
  'audio/ogg': 'AUDIO',
  'audio/mp4': 'AUDIO',
  'font/ttf': 'FONT',
  'font/otf': 'FONT',
  'font/woff': 'FONT',
  'font/woff2': 'FONT',
  'application/font-woff': 'FONT',
  'application/x-font-ttf': 'FONT',
  'application/x-font-opentype': 'FONT',
};

export const MAX_TIMELINE_MS = 4 * 60 * 60 * 1000;
export const MAX_CLIP_DURATION_MS = 60 * 60 * 1000;
export const MAX_TEXT_LENGTH = 500;
export const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const FONT_FAMILIES = {
  sans: { label: 'Geist Sans', stack: 'Geist, Inter, system-ui, sans-serif' },
  serif: { label: 'Serif', stack: 'Georgia, "Times New Roman", serif' },
  mono: { label: 'Geist Mono', stack: '"Geist Mono", ui-monospace, monospace' },
} as const;
export type FontFamily = keyof typeof FONT_FAMILIES;

export const MOCK_LABEL = 'Mock provider output';
export const MOCK_WATERMARK_TEXT = 'FRAMEFORGE MOCK';

export function resolveDimensions(
  aspectRatio: AspectRatio,
  resolution: Resolution,
): { width: number; height: number } {
  const short = RESOLUTION_SHORT_SIDE[resolution];
  const [wRaw, hRaw] = aspectRatio.split(':').map(Number) as [number, number];
  const ratio = wRaw / hRaw;
  let width: number;
  let height: number;
  if (ratio >= 1) {
    height = short;
    width = Math.round(short * ratio);
  } else {
    width = short;
    height = Math.round(short / ratio);
  }
  return { width: width + (width % 2), height: height + (height % 2) };
}

export function planFor(plan: string | null | undefined): PlanDefinition {
  return PLAN_DEFINITIONS[(plan as Plan) ?? 'FREE'] ?? PLAN_DEFINITIONS.FREE;
}

export function hasMinimumRole(role: WorkspaceRole, minimum: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export const QUEUE_NAMES = {
  RENDER: 'frameforge-render',
  AI: 'frameforge-ai',
  MEDIA: 'frameforge-media',
} as const;

export const AI_CREDIT_COST: Record<AiJobKind, number> = {
  TEXT_TO_VIDEO: 20,
  IMAGE_TO_VIDEO: 10,
  SCRIPT: 3,
  STORYBOARD: 8,
  TRANSCRIPTION: 5,
  TEXT_TO_SPEECH: 5,
};

export function cancelKey(kind: 'render' | 'ai', id: string): string {
  return `ff:cancel:${kind}:${id}`;
}
