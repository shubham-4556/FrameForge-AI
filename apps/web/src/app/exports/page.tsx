'use client'

import * as React from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  Film,
  HardDrive,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { EXPORT_PRESETS, hasMinimumRole, type WorkspaceRole } from '@frameforge/shared'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { useWorkspace } from '@/components/workspace-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import type { Paginated, ProjectListItem, RenderJob } from '@/lib/types'
import { cn, formatBytes, formatClock, timeAgo } from '@/lib/utils'

type StatusFilter = 'ALL' | 'ACTIVE' | 'SUCCEEDED' | 'FAILED'

const SAMPLE_RENDERS: RenderJob[] = [
  {
    id: 'sample-render-1',
    workspaceId: 'sample-workspace',
    projectId: 'sample-project-1',
    revision: 8,
    presetId: 'youtube-1080p',
    status: 'SUCCEEDED',
    progress: 100,
    settings: { quality: 'high', includeAudio: true },
    outputSizeBytes: 184_320_000,
    durationMs: 44_000,
    width: 1920,
    height: 1080,
    errorCode: null,
    errorMessage: null,
    startedAt: new Date(Date.now() - 1000 * 60 * 52).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 54).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
    export: { id: 'sample-export-1', filename: 'aurora-brand-film.mp4', sizeBytes: 184_320_000 },
  },
  {
    id: 'sample-render-2',
    workspaceId: 'sample-workspace',
    projectId: 'sample-project-2',
    revision: 3,
    presetId: 'reels-1080p',
    status: 'RUNNING',
    progress: 62,
    settings: { quality: 'high', includeAudio: true },
    outputSizeBytes: null,
    durationMs: 28_000,
    width: 1080,
    height: 1920,
    errorCode: null,
    errorMessage: null,
    startedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    completedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 45).toISOString(),
    export: null,
  },
  {
    id: 'sample-render-3',
    workspaceId: 'sample-workspace',
    projectId: 'sample-project-3',
    revision: 1,
    presetId: 'tiktok-1080p',
    status: 'QUEUED',
    progress: 0,
    settings: { quality: 'standard', includeAudio: false },
    outputSizeBytes: null,
    durationMs: 18_000,
    width: 1080,
    height: 1920,
    errorCode: null,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(Date.now() - 1000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 40).toISOString(),
    export: null,
  },
  {
    id: 'sample-render-4',
    workspaceId: 'sample-workspace',
    projectId: 'sample-project-4',
    revision: 5,
    presetId: 'cinema-4k',
    status: 'FAILED',
    progress: 47,
    settings: { quality: 'max', includeAudio: true },
    outputSizeBytes: null,
    durationMs: 62_000,
    width: 5040,
    height: 2160,
    errorCode: 'ASSET_FETCH_FAILED',
    errorMessage: 'One of the source clips could not be fetched from storage.',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 5 + 32_000).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5 - 120_000).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    export: null,
  },
]

const SAMPLE_PROJECTS: Record<string, string> = {
  'sample-project-1': 'Aurora — Brand Film',
  'sample-project-2': 'Atlas Product Teaser',
  'sample-project-3': 'Nightfall Social Cut',
  'sample-project-4': 'Harbor Documentary Open',
}

function isActive(job: RenderJob) {
  return job.status === 'QUEUED' || job.status === 'RUNNING'
}

function presetFor(job: RenderJob) {
  return EXPORT_PRESETS.find((preset) => preset.id === job.presetId)
}

function presetLabel(job: RenderJob) {
  const preset = presetFor(job)
  if (preset) return preset.label
  if (job.width && job.height) return `${job.width} × ${job.height}`
  return job.presetId ?? 'Custom export'
}

function RenderRow({
  job,
  projectTitle,
  role,
  isPreview,
  onDownload,
  onCancel,
  onDelete,
  canceling,
}: {
  job: RenderJob
  projectTitle: string
  role: WorkspaceRole
  isPreview: boolean
  onDownload: (job: RenderJob) => void
  onCancel: (job: RenderJob) => void
  onDelete: (job: RenderJob) => void
  canceling: boolean
}) {
  const active = isActive(job)
  const preset = presetFor(job)
  const canEdit = hasMinimumRole(role, 'EDITOR')
  const canDelete = hasMinimumRole(role, 'ADMIN')

  return (
    <div className="rounded-xl border border-border/70 bg-surface-2/25 p-4 transition-colors hover:border-border-strong/70">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-card">
          <Film className={cn('h-4 w-4', active ? 'text-brand-bright' : 'text-faint')} />
          <span className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-faint">
            {preset?.aspectRatio ?? (job.width && job.height ? `${job.width}:${job.height}` : 'MP4')}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/editor/${job.projectId}`}
              className="truncate text-sm font-medium text-foreground hover:text-brand-bright"
            >
              {projectTitle}
            </Link>
            <StatusBadge status={job.status} />
            {isPreview ? (
              <Badge variant="muted" className="text-[9px] uppercase tracking-[0.1em]">
                Sample
              </Badge>
            ) : null}
            {job.status === 'SUCCEEDED' && job.export ? (
              <Badge variant="outline" className="text-[9px] uppercase tracking-[0.1em]">
                MP4 ready
              </Badge>
            ) : null}
          </div>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
            <span>{presetLabel(job)}</span>
            {job.width && job.height ? <span>{job.width} × {job.height}</span> : null}
            {job.durationMs ? <span>{formatClock(job.durationMs)}</span> : null}
            {job.outputSizeBytes ? <span>{formatBytes(job.outputSizeBytes)}</span> : null}
            <span>Revision {job.revision}</span>
          </p>

          {active ? (
            <div className="mt-3 max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-[10px] text-faint">
                <span>{job.status === 'RUNNING' ? 'Rendering' : 'Waiting for the render worker'}</span>
                <span className="font-mono">{Math.round(job.progress)}%</span>
              </div>
              <Progress value={job.progress} className="h-1.5" />
            </div>
          ) : null}

          {job.status === 'FAILED' ? (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-danger">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                {job.errorMessage ?? 'The render did not complete.'}
                {job.errorCode ? (
                  <span className="ml-1 font-mono text-[9px] uppercase tracking-[0.08em] opacity-80">
                    {job.errorCode}
                  </span>
                ) : null}
              </span>
            </p>
          ) : null}

          <p className="mt-2 text-[10px] text-faint">
            {job.status === 'SUCCEEDED' && job.completedAt
              ? `Completed ${timeAgo(job.completedAt)}`
              : `Queued ${timeAgo(job.createdAt)}`}
            {job.export?.filename ? ` · ${job.export.filename}` : ''}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
          {job.status === 'SUCCEEDED' ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => onDownload(job)}
              disabled={isPreview || !job.export}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          ) : null}
          {active && canEdit ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-muted-foreground"
              onClick={() => onCancel(job)}
              disabled={isPreview || canceling}
            >
              {canceling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Cancel
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Delete export for ${projectTitle}`}
              onClick={() => onDelete(job)}
              disabled={isPreview}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ExportsContent() {
  const { workspace, workspaceId, isPreview, needsAuth } = useWorkspace()
  const queryClient = useQueryClient()
  const [filter, setFilter] = React.useState<StatusFilter>('ALL')
  const [search, setSearch] = React.useState('')
  const [deleteTarget, setDeleteTarget] = React.useState<RenderJob | null>(null)

  const rendersQuery = useQuery({
    queryKey: ['renders', workspaceId],
    queryFn: () =>
      api.get<Paginated<RenderJob>>(
        `/workspaces/${workspaceId}/renders?workspaceId=${workspaceId}&pageSize=50`
      ),
    enabled: Boolean(workspaceId) && !isPreview,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      return items.some(isActive) ? 4000 : false
    },
  })

  const projectsQuery = useQuery({
    queryKey: ['project-titles', workspaceId],
    queryFn: () =>
      api.get<Paginated<ProjectListItem>>(
        `/workspaces/${workspaceId}/projects?workspaceId=${workspaceId}&pageSize=100`
      ),
    enabled: Boolean(workspaceId) && !isPreview,
    staleTime: 60_000,
  })

  const cancelMutation = useMutation({
    mutationFn: (job: RenderJob) => api.post<RenderJob>(`/renders/${job.id}/cancel`, {}),
    onSuccess: () => {
      toast.success('Render canceled', { description: 'The export job has been stopped.' })
      void queryClient.invalidateQueries({ queryKey: ['renders'] })
    },
    onError: (error) =>
      toast.error('Could not cancel render', { description: (error as Error).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (job: RenderJob) => api.delete(`/renders/${job.id}`),
    onSuccess: () => {
      toast.success('Export deleted')
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['renders'] })
    },
    onError: (error) =>
      toast.error('Could not delete export', { description: (error as Error).message }),
  })

  const downloadRender = async (job: RenderJob) => {
    if (isPreview) {
      toast.message('Sample export', {
        description: 'Sign in and connect the API to download a real MP4.',
        action: { label: 'Sign in', onClick: () => (window.location.href = '/auth/sign-in') },
      })
      return
    }
    try {
      const result = await api.get<{ url: string }>(`/renders/${job.id}/download`)
      window.open(result.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error('Download unavailable', { description: (error as Error).message })
    }
  }

  const projectTitles = React.useMemo(() => {
    const map: Record<string, string> = { ...SAMPLE_PROJECTS }
    for (const project of projectsQuery.data?.items ?? []) {
      map[project.id] = project.title
    }
    return map
  }, [projectsQuery.data])

  const renders = isPreview ? SAMPLE_RENDERS : (rendersQuery.data?.items ?? [])
  const activeCount = renders.filter(isActive).length
  const ready = renders.filter((job) => job.status === 'SUCCEEDED')
  const failedCount = renders.filter((job) => job.status === 'FAILED').length
  const totalBytes = ready.reduce((sum, job) => sum + (job.outputSizeBytes ?? 0), 0)
  const totalDuration = ready.reduce((sum, job) => sum + (job.durationMs ?? 0), 0)

  const filtered = renders.filter((job) => {
    if (filter === 'ACTIVE' && !isActive(job)) return false
    if (filter === 'SUCCEEDED' && job.status !== 'SUCCEEDED') return false
    if (filter === 'FAILED' && job.status !== 'FAILED') return false
    if (!search.trim()) return true
    const haystack = [
      projectTitles[job.projectId] ?? '',
      job.export?.filename ?? '',
      presetLabel(job),
      job.id,
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  })

  const loading = !isPreview && rendersQuery.isLoading
  const hasError = !isPreview && rendersQuery.isError
  const role = workspace?.role ?? 'VIEWER'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Delivery"
        title="Everything you've shipped."
        description="Every MP4 the render worker produces, with live progress, revision history, and signed downloads."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => void rendersQuery.refetch()}
              disabled={isPreview || rendersQuery.isFetching}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', rendersQuery.isFetching && 'animate-spin')} />
              Refresh
            </Button>
            <Button asChild size="sm" className="h-9">
              <Link href="/dashboard">
                <Film className="h-3.5 w-3.5" />
                Open a project
              </Link>
            </Button>
          </>
        }
      />

      {isPreview ? (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Badge variant="warning" className="mt-0.5 shrink-0 text-[9px] uppercase tracking-[0.1em]">
              Preview data
            </Badge>
            <p className="text-xs leading-relaxed text-muted-foreground">
              These sample renders show how delivery works. {needsAuth ? 'Sign in' : 'Start the API'} to
              see and manage your workspace&apos;s real export queue.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="h-8 shrink-0">
            <Link href={needsAuth ? '/auth/sign-in' : '/dashboard'}>
              {needsAuth ? 'Sign in' : 'Connect workspace'}
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Ready exports', value: String(ready.length), icon: CheckCircle2, hint: `${formatBytes(totalBytes)} delivered` },
          { label: 'In flight', value: String(activeCount), icon: Loader2, hint: activeCount ? 'Live queue' : 'Queue is idle' },
          { label: 'Render time', value: formatClock(totalDuration), icon: Clock3, hint: 'Across ready exports' },
          { label: 'Failed', value: String(failedCount), icon: AlertTriangle, hint: failedCount ? 'Needs attention' : 'No failures' },
        ].map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">{stat.label}</p>
                <p className="mt-1.5 text-2xl font-medium tracking-[-0.03em] text-foreground">{stat.value}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{stat.hint}</p>
              </div>
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface-2 text-brand-bright">
                <stat.icon className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="ACTIVE">
              Active
              {activeCount ? (
                <span className="rounded-full bg-brand/15 px-1.5 text-[9px] text-brand-bright">{activeCount}</span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="SUCCEEDED">Ready</TabsTrigger>
            <TabsTrigger value="FAILED">Failed</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects, files, presets…"
            aria-label="Search exports"
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      {hasError ? (
        <div className="rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-5">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangle className="h-4 w-4 text-danger" />
            Could not load the export queue
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{(rendersQuery.error as Error).message}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 h-8"
            onClick={() => void rendersQuery.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-[112px] rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Download}
          title={renders.length ? 'No exports match these filters' : 'No exports yet'}
          description={
            renders.length
              ? 'Try a different status or clear the search to see the full delivery queue.'
              : 'Finish a timeline and queue an export from the editor. Rendered MP4s will appear here with a signed download.'
          }
          action={
            renders.length ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFilter('ALL')
                  setSearch('')
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/dashboard">Choose a project</Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((job) => (
            <RenderRow
              key={job.id}
              job={job}
              projectTitle={projectTitles[job.projectId] ?? job.export?.filename ?? 'Untitled project'}
              role={role}
              isPreview={isPreview}
              onDownload={(target) => void downloadRender(target)}
              onCancel={(target) => cancelMutation.mutate(target)}
              onDelete={setDeleteTarget}
              canceling={cancelMutation.isPending && cancelMutation.variables?.id === job.id}
            />
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-2 text-[10px] text-faint">
            <span>
              Showing {filtered.length} of {renders.length} render jobs
              {rendersQuery.data ? ` · ${rendersQuery.data.total} total in this workspace` : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <HardDrive className="h-3 w-3" />
              {formatBytes(totalBytes)} ready to download
            </span>
          </div>
        </div>
      )}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this export?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `The render job and its MP4 file for “${
                    projectTitles[deleteTarget.projectId] ?? 'this project'
                  }” will be permanently removed.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Keep export
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete export'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ExportsPage() {
  return (
    <AppShell>
      <ExportsContent />
    </AppShell>
  )
}
