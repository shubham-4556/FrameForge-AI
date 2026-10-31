import type {
  AspectRatio,
  Fps,
  PlanDefinition,
  ProjectStatus,
  TimelineDocument,
  WorkspaceRole,
} from '@frameforge/shared'

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ProjectListItem {
  id: string
  title: string
  description: string | null
  status: ProjectStatus
  aspectRatio: AspectRatio
  fps: Fps
  durationMs: number
  thumbnailUrl: string | null
  version: number
  createdBy: { id: string; name: string; avatarUrl: string | null } | null
  assetCount: number
  renderCount: number
  createdAt: string
  updatedAt: string
  lastEditedAt: string
  role: WorkspaceRole
}

export interface ProjectDetail {
  id: string
  workspaceId: string
  title: string
  description: string | null
  status: ProjectStatus
  aspectRatio: AspectRatio
  fps: Fps
  durationMs: number
  version: number
  createdAt: string
  updatedAt: string
  lastEditedAt: string
  role: WorkspaceRole
  workspace: { id: string; name: string; plan: string }
  timeline: TimelineDocument
}

export interface TimelineResponse {
  version: number
  document: TimelineDocument
  updatedAt: string
}

export interface MediaAsset {
  id: string
  workspaceId: string
  projectId: string | null
  kind: 'VIDEO' | 'IMAGE' | 'AUDIO' | 'FONT'
  status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED' | 'DELETED'
  originalName: string
  mimeType: string
  sizeBytes: number
  durationMs: number | null
  width: number | null
  height: number | null
  hasAudio: boolean | null
  mock: boolean
  failureReason: string | null
  createdAt: string
  updatedAt: string
  previewUrl: string | null
  project?: { id: string; title: string } | null
}

export interface AiJob {
  id: string
  workspaceId: string
  projectId: string | null
  kind: string
  provider: string
  model: string
  prompt: string | null
  script: string | null
  style: string | null
  aspectRatio: AspectRatio
  durationSeconds: number
  resolution: string
  params: Record<string, unknown> | null
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED'
  progress: number
  mock: boolean
  result: Record<string, unknown> | null
  errorCode: string | null
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RenderJob {
  id: string
  workspaceId: string
  projectId: string
  revision: number
  presetId: string | null
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED'
  progress: number
  settings: Record<string, unknown>
  outputSizeBytes: number | null
  durationMs: number | null
  width: number | null
  height: number | null
  errorCode: string | null
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  export?: { id: string; filename: string; sizeBytes: number } | null
}

export interface WorkspaceUsage {
  storageBytes: number
  renderSeconds: number
  renderMinutes: number
  aiCredits: number
  exports: number
  projects: number
  members: number
}

export interface WorkspaceUsageSummary {
  plan: PlanDefinition
  subscription: {
    status: string
    provider: string
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
  } | null
  usage: WorkspaceUsage
  limits: {
    storageBytes: number
    renderMinutes: number
    aiCredits: number
    maxProjects: number
    maxMembers: number
  }
  period: { start: string; end: string }
}

export interface WorkspaceDetail {
  id: string
  name: string
  slug: string
  role: WorkspaceRole
  createdAt: string
  usage: WorkspaceUsageSummary
}

export interface BillingOverview extends WorkspaceUsageSummary {
  role: WorkspaceRole
  canManage: boolean
  billingConfigured: boolean
  plans: PlanDefinition[]
}

export interface WorkspaceMember {
  id: string
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  role: WorkspaceRole
  joinedAt: string
}
