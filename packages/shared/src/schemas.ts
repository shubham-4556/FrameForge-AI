import { z } from 'zod';
import {
  AI_JOB_KINDS,
  EXPORT_PRESETS,
  FPS_OPTIONS,
  JOB_STATUSES,
  MEDIA_KINDS,
  PLANS,
  PROJECT_STATUSES,
  RESOLUTIONS,
  UPLOAD_MIME_TYPES,
  WORKSPACE_ROLES,
  aspectRatioSchema,
  MAX_TEXT_LENGTH,
} from './constants';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Use at most 128 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/[0-9]/, 'Include at least one number');
export const tokenSchema = z.string().min(20).max(256);
export const nameSchema = z.string().trim().min(2).max(80);

export const idSchema = z
  .string()
  .min(6)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid identifier');

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  workspaceName: z.string().trim().min(2).max(80).optional(),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const oauthLoginSchema = z.object({
  idToken: z.string().trim().min(1, 'Missing OAuth token').max(4096),
});
export type OAuthLoginInput = z.infer<typeof oauthLoginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ token: tokenSchema, password: passwordSchema });
export const verifyEmailSchema = z.object({ token: tokenSchema });
export const resendVerificationSchema = z.object({ email: emailSchema });
export const updateProfileSchema = z.object({ name: nameSchema });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});
export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(128),
  confirm: z.literal('DELETE'),
});

export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  emailVerified: z.boolean(),
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const workspaceSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  role: z.enum(WORKSPACE_ROLES),
  plan: z.enum(PLANS),
});
export type WorkspaceSummary = z.infer<typeof workspaceSummarySchema>;

export const sessionResponseSchema = z.object({
  user: sessionUserSchema,
  workspaces: z.array(workspaceSummarySchema),
  session: z.object({ id: z.string(), expiresAt: z.string() }),
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const createWorkspaceSchema = z.object({ name: z.string().trim().min(2).max(80) });
export const updateWorkspaceSchema = z.object({ name: z.string().trim().min(2).max(80) });
export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
});
export const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

export const projectListQuerySchema = paginationSchema.extend({
  workspaceId: idSchema,
  status: z.enum(PROJECT_STATUSES).optional(),
  sort: z.enum(['updatedAt', 'createdAt', 'title']).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

export const createProjectSchema = z.object({
  workspaceId: idSchema,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  aspectRatio: aspectRatioSchema.default('16:9'),
  fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)]).default(30),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    status: z.enum(['DRAFT', 'READY', 'ARCHIVED']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'No changes supplied');

export const duplicateProjectSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export const saveTimelineSchema = z.object({
  baseVersion: z.number().int().min(1),
  document: z.unknown(),
  label: z.string().trim().max(120).optional(),
});
export type SaveTimelineInput = z.infer<typeof saveTimelineSchema>;

export const mediaListQuerySchema = paginationSchema.extend({
  workspaceId: idSchema,
  kind: z.enum(MEDIA_KINDS).optional(),
  projectId: idSchema.optional(),
  sort: z.enum(['createdAt', 'sizeBytes', 'originalName']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const initUploadSchema = z.object({
  workspaceId: idSchema,
  projectId: idSchema.optional(),
  filename: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .refine((name) => !/[/\\]/.test(name), 'Filename must not contain paths'),
  mimeType: z
    .string()
    .trim()
    .max(120)
    .refine((mime) => Boolean(UPLOAD_MIME_TYPES[mime]), 'Unsupported file type'),
  sizeBytes: z.number().int().min(1).max(2 * 1024 * 1024 * 1024),
  durationMs: z.number().int().min(0).max(4 * 60 * 60 * 1000).optional(),
});
export type InitUploadInput = z.infer<typeof initUploadSchema>;

export const aiGenerationListQuerySchema = paginationSchema.extend({
  workspaceId: idSchema,
  projectId: idSchema.optional(),
  kind: z.enum(AI_JOB_KINDS).optional(),
  status: z.enum(JOB_STATUSES).optional(),
});

const aiBase = {
  workspaceId: idSchema,
  projectId: idSchema.optional(),
  provider: z.string().trim().max(40).optional(),
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
};

export const createAiGenerationSchema = z
  .object({
    ...aiBase,
    kind: z.enum(AI_JOB_KINDS),
    prompt: z.string().trim().max(4000).optional(),
    script: z.string().trim().max(8000).optional(),
    style: z.enum(['cinematic', 'documentary', 'product', 'social', 'anime', 'minimal']).optional(),
    aspectRatio: aspectRatioSchema.default('16:9'),
    durationSeconds: z.number().int().min(3).max(120).default(15),
    resolution: z.enum(RESOLUTIONS).default('1080p'),
    voice: z.string().trim().max(40).optional(),
    language: z.string().trim().max(16).optional(),
    sourceAssetId: idSchema.optional(),
    referenceAssetIds: z.array(idSchema).max(4).optional(),
    sceneCount: z.number().int().min(1).max(8).default(3),
    text: z.string().trim().max(MAX_TEXT_LENGTH * 4).optional(),
  })
  .superRefine((value, ctx) => {
    const needsPrompt = ['TEXT_TO_VIDEO', 'SCRIPT', 'STORYBOARD', 'IMAGE_TO_VIDEO'];
    if (needsPrompt.includes(value.kind) && !value.prompt && !value.script) {
      ctx.addIssue({ code: 'custom', path: ['prompt'], message: 'A prompt or script is required' });
    }
    if (value.kind === 'IMAGE_TO_VIDEO' && !value.sourceAssetId && !value.referenceAssetIds?.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['sourceAssetId'],
        message: 'Select a source image or reference image',
      });
    }
    if (value.kind === 'TRANSCRIPTION' && !value.sourceAssetId) {
      ctx.addIssue({ code: 'custom', path: ['sourceAssetId'], message: 'Select an audio or video asset' });
    }
    if (value.kind === 'TEXT_TO_SPEECH' && !value.text) {
      ctx.addIssue({ code: 'custom', path: ['text'], message: 'Enter the voiceover script' });
    }
  });
export type CreateAiGenerationInput = z.infer<typeof createAiGenerationSchema>;

export const exportPresetSchema = z.enum(EXPORT_PRESETS.map((preset) => preset.id) as [string, ...string[]]);

export const createRenderSchema = z.object({
  presetId: exportPresetSchema.optional(),
  aspectRatio: aspectRatioSchema.optional(),
  resolution: z.enum(RESOLUTIONS).default('1080p'),
  fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)]).default(30),
  quality: z.enum(['standard', 'high', 'max']).default('high'),
  audioBitrateKbps: z.union([z.literal(128), z.literal(192), z.literal(256)]).default(192),
  includeAudio: z.boolean().default(true),
  revision: z.number().int().min(1).optional(),
});
export type CreateRenderInput = z.infer<typeof createRenderSchema>;

export const renderListQuerySchema = paginationSchema.extend({
  workspaceId: idSchema,
  projectId: idSchema.optional(),
  status: z.enum(JOB_STATUSES).optional(),
});

export const paginationMetaSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export const RENDER_QUALITY_CRF = {
  standard: 26,
  high: 21,
  max: 17,
} as const;
