'use client'

import * as React from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  ArrowUpRight,
  ArrowUpDown,
  Clock3,
  Clapperboard,
  Copy,
  Download,
  Film,
  FolderOpen,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ProjectStatus } from '@frameforge/shared'
import { AppShell } from '@/components/app-shell'
import { EmptyState } from '@/components/empty-state'
import { NewProjectDialog } from '@/components/new-project-dialog'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import { useWorkspace } from '@/components/workspace-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { AiJob, MediaAsset, Paginated, ProjectListItem, RenderJob, WorkspaceDetail } from '@/lib/types'
import { cn, formatClock, timeAgo } from '@/lib/utils'

const SAMPLE_PROJECTS = [
  {
    id: 'sample-aurora',
    title: 'Aurora — Brand Film',
    description: 'A 24-second coastal opening for the spring campaign.',
    status: 'DRAFT' as ProjectStatus,
    durationMs: 24_000,
    updatedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    aspectRatio: '16:9',
    assetCount: 12,
    renderCount: 2,
  },
  {
    id: 'sample-night-drive',
    title: 'Night Drive / Social Cut',
    description: 'Vertical re-cut with bold captions and a tighter hook.',
    status: 'READY' as ProjectStatus,
    durationMs: 18_000,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    aspectRatio: '9:16',
    assetCount: 8,
    renderCount: 4,
  },
  {
    id: 'sample-afterglow',
    title: 'Afterglow — Product Story',
    description: 'Warm product film built from the AI storyboard treatment.',
    status: 'DRAFT' as ProjectStatus,
    durationMs: 31_000,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    aspectRatio: '16:9',
    assetCount: 16,
    renderCount: 1,
  },
  {
    id: 'sample-atlas',
    title: 'Atlas Studio Reel',
    description: 'Archive cut of the studio’s best frames this quarter.',
    status: 'ARCHIVED' as ProjectStatus,
    durationMs: 62_000,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    aspectRatio: '21:9',
    assetCount: 27,
    renderCount: 6,
  },
]

const gradientSets = [
  'from-[#0e2a3a] via-[#15515a] to-[#8ff3d4]/35',
  'from-[#170d2b] via-[#4b1b80] to-[#ff5fa2]/35',
  'from-[#2b160d] via-[#8f3d1d] to-[#ffc36b]/40',
  'from-[#101827] via-[#263a5f] to-[#8fb8ff]/30',
]

const statusFilters: Array<{ value: 'ALL' | ProjectStatus; label: string }> = [
  { value: 'ALL', label: 'All projects' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'READY', label: 'Ready' },
  { value: 'ARCHIVED', label: 'Archived' },
]

function ProjectThumb({
  title,
  index,
  thumbnailUrl,
  aspectRatio,
}: {
  title: string
  index: number
  thumbnailUrl?: string | null
  aspectRatio?: string
}) {
  const ratio =
    aspectRatio === '9:16'
      ? 'aspect-[9/12]'
      : aspectRatio === '1:1'
        ? 'aspect-square'
        : aspectRatio === '4:5'
          ? 'aspect-[4/5]'
          : aspectRatio === '4:3'
            ? 'aspect-[4/3]'
            : aspectRatio === '21:9'
              ? 'aspect-[21/10]'
              : 'aspect-video'

  return (
    <div className={cn('relative overflow-hidden bg-surface-2', ratio)}>
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-editorial group-hover:scale-[1.03]"
        />
      ) : (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br transition-transform duration-500 ease-editorial group-hover:scale-[1.03]',
            gradientSets[index % gradientSets.length]
          )}
        >
          <div className="absolute inset-0 clip-stripes opacity-25" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.14),transparent_45%)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute bottom-14 left-4 font-mono text-[9px] uppercase tracking-[0.18em] text-white/55">
            {String(index + 1).padStart(2, '0')} / Sequence
          </span>
          <div className="absolute inset-x-4 bottom-4">
            <p className="truncate font-serif text-lg italic text-white/90">{title}</p>
            <div className="mt-2 flex gap-1">
              {[0, 1, 2, 3].map((bar) => (
                <span
                  key={bar}
                  className="h-[2px] flex-1 rounded-full bg-white/30"
                  style={{ opacity: 1 - bar * 0.18 }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
        <span className="grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-black/35 text-white backdrop-blur">
          <PlayGlyph />
        </span>
      </div>
    </div>
  )
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 translate-x-px" fill="currentColor" aria-hidden="true">
      <path d="M3 2.4v7.2L9.6 6 3 2.4Z" />
    </svg>
  )
}

function ProjectCard({
  project,
  index,
  isPreview,
  onRename,
  onDelete,
}: {
  project: {
    id: string
    title: string
    description?: string | null
    status: string
    durationMs: number
    updatedAt: string
    aspectRatio?: string
    thumbnailUrl?: string | null
    assetCount?: number
    renderCount?: number
    version?: number
  }
  index: number
  isPreview: boolean
  onRename: (project: { id: string; title: string }) => void
  onDelete: (project: { id: string; title: string }) => void
}) {
  const queryClient = useQueryClient()

  const duplicate = useMutation({
    mutationFn: () => api.post<{ id: string; title: string }>(`/projects/${project.id}/duplicate`, {}),
    onSuccess: (created) => {
      toast.success('Project duplicated', { description: created.title })
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => {
      toast.error('Could not duplicate project', { description: (error as Error).message })
    },
  })

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card transition-colors hover:border-border-strong">
      <Link
        href={isPreview ? '/auth/sign-up' : `/editor/${project.id}`}
        className="block focus-visible:outline-none"
        aria-label={isPreview ? 'Sign in to open this sample project' : `Open ${project.title}`}
      >
        <ProjectThumb
          title={project.title}
          index={index}
          thumbnailUrl={project.thumbnailUrl}
          aspectRatio={project.aspectRatio}
        />
      </Link>

      <div className="absolute left-3 top-3 flex items-center gap-1.5">
        <StatusBadge status={project.status} />
        {isPreview ? (
          <Badge variant="muted" className="bg-black/40 text-white/70 backdrop-blur">
            Sample
          </Badge>
        ) : null}
      </div>

      {isPreview ? (
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="absolute right-2.5 top-2.5 bg-black/30 text-white/70 backdrop-blur hover:bg-black/50 hover:text-white"
        >
          <Link href="/auth/sign-up" aria-label="Sign in to manage projects">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-2.5 top-2.5 bg-black/30 text-white/70 backdrop-blur hover:bg-black/50 hover:text-white"
              aria-label={`Project actions for ${project.title}`}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Project</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/editor/${project.id}`}>
                <Clapperboard className="h-4 w-4" />
                Open editor
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRename({ id: project.id, title: project.title })}>
              <Pencil className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => duplicate.mutate()}
              disabled={duplicate.isPending}
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onSelect={() => onDelete({ id: project.id, title: project.title })}
            >
              <Trash2 className="h-4 w-4" />
              Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="p-4">
        <Link
          href={isPreview ? '/auth/sign-up' : `/editor/${project.id}`}
          className="block focus-ring rounded-sm"
        >
          <h2 className="truncate text-sm font-medium text-foreground">{project.title}</h2>
        </Link>
        {project.description ? (
          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{project.description}</p>
        ) : null}
        <div className="mt-3 flex items-center justify-between text-[10px] text-faint">
          <span className="flex items-center gap-1.5">
            <Clock3 className="h-3 w-3" />
            {timeAgo(project.updatedAt)}
          </span>
          <span className="font-mono">{formatClock(project.durationMs)}</span>
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const { workspace, workspaceId, session, isPreview, isLoading } = useWorkspace()
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState('')
  const deferredSearch = React.useDeferredValue(search)
  const [status, setStatus] = React.useState<'ALL' | ProjectStatus>('ALL')
  const [sort, setSort] = React.useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt')
  const [renameTarget, setRenameTarget] = React.useState<{ id: string; title: string } | null>(null)
  const [renameValue, setRenameValue] = React.useState('')
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; title: string } | null>(null)

  const projectsQuery = useQuery({
    queryKey: ['projects', workspaceId, deferredSearch, status, sort],
    queryFn: () => {
      const params = new URLSearchParams({
        pageSize: '24',
        sort,
        order: sort === 'title' ? 'asc' : 'desc',
      })
      if (deferredSearch.trim()) params.set('q', deferredSearch.trim())
      if (status !== 'ALL') params.set('status', status)
      return api.get<Paginated<ProjectListItem>>(
        `/workspaces/${workspaceId}/projects?${params.toString()}`
      )
    },
    enabled: Boolean(workspaceId) && !isPreview,
    staleTime: 30_000,
  })

  const mediaQuery = useQuery({
    queryKey: ['media-count', workspaceId],
    queryFn: () =>
      api.get<Paginated<MediaAsset>>(`/media?workspaceId=${workspaceId}&pageSize=1`),
    enabled: Boolean(workspaceId) && !isPreview,
    staleTime: 60_000,
  })

  const aiQuery = useQuery({
    queryKey: ['ai-count', workspaceId],
    queryFn: () =>
      api.get<Paginated<AiJob>>(`/ai/generations?workspaceId=${workspaceId}&pageSize=1`),
    enabled: Boolean(workspaceId) && !isPreview,
    staleTime: 60_000,
  })

  const rendersQuery = useQuery({
    queryKey: ['render-count', workspaceId],
    queryFn: () =>
      api.get<Paginated<RenderJob>>(
        `/workspaces/${workspaceId}/renders?workspaceId=${workspaceId}&pageSize=4`
      ),
    enabled: Boolean(workspaceId) && !isPreview,
    staleTime: 30_000,
  })

  const workspaceQuery = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api.get<WorkspaceDetail>(`/workspaces/${workspaceId}`),
    enabled: Boolean(workspaceId) && !isPreview,
    staleTime: 60_000,
  })

  const renameMutation = useMutation({
    mutationFn: () => api.patch(`/projects/${renameTarget?.id}`, { title: renameValue.trim() }),
    onSuccess: () => {
      toast.success('Project renamed')
      setRenameTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => toast.error('Could not rename project', { description: (error as Error).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/projects/${deleteTarget?.id}`),
    onSuccess: () => {
      toast.success('Project deleted')
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => toast.error('Could not delete project', { description: (error as Error).message }),
  })

  const projects: ProjectListItem[] = projectsQuery.data?.items ?? []
  const displayProjects = isPreview ? SAMPLE_PROJECTS : projects
  const usage = workspaceQuery.data?.usage.usage
  const limits = workspaceQuery.data?.usage.limits

  const renderUsagePercent =
    usage && limits && limits.renderMinutes > 0
      ? Math.min(100, Math.round((usage.renderMinutes / limits.renderMinutes) * 100))
      : 0
  const creditUsagePercent =
    usage && limits && limits.aiCredits > 0
      ? Math.min(100, Math.round((usage.aiCredits / limits.aiCredits) * 100))
      : 0

  const openRename = (project: { id: string; title: string }) => {
    setRenameTarget(project)
    setRenameValue(project.title)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={workspace ? `${workspace.name} · ${workspace.plan} plan` : 'Studio preview'}
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}${session?.user.name ? `, ${session.user.name.split(' ')[0]}` : ''}.`}
        description={
          isPreview
            ? 'Sample projects are shown until the API is connected. Sign in to load your real workspace.'
            : 'Pick up a cut, start a new story, or hand a brief to the AI studio.'
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link href="/ai">
                <Sparkles className="h-3.5 w-3.5" />
                Generate
              </Link>
            </Button>
            <NewProjectDialog size="sm" className="h-9" />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Projects"
          value={isPreview ? SAMPLE_PROJECTS.length : (projectsQuery.data?.total ?? (isLoading ? '…' : 0))}
          icon={Film}
          hint={isPreview ? 'Sample workspace' : 'In this workspace'}
        />
        <StatCard
          label="Media assets"
          value={isPreview ? 5 : (mediaQuery.data?.total ?? 0)}
          icon={FolderOpen}
          hint={isPreview ? 'Connect the API' : 'Uploaded and processed'}
        />
        <StatCard
          label="AI generations"
          value={isPreview ? 2 : (aiQuery.data?.total ?? 0)}
          icon={Wand2}
          hint={isPreview ? 'Mock mode is labeled' : 'Across every project'}
        />
        <StatCard
          label="Renders"
          value={isPreview ? 4 : (rendersQuery.data?.total ?? 0)}
          icon={Download}
          hint={isPreview ? 'Sample workspace' : 'Queued and delivered'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatus(filter.value)}
                  aria-pressed={status === filter.value}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[11px] transition-colors',
                    status === filter.value
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1 sm:w-52">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search projects"
                  className="h-8 pl-8 text-xs"
                  aria-label="Search projects"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    aria-label="Sort projects"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    <span className="hidden sm:inline">Sort</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort projects</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => setSort('updatedAt')}>
                    Last updated {sort === 'updatedAt' ? '✓' : ''}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSort('createdAt')}>
                    Newest {sort === 'createdAt' ? '✓' : ''}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSort('title')}>
                    Title A–Z {sort === 'title' ? '✓' : ''}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="pt-5">
            {isPreview ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {displayProjects.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                    isPreview
                    onRename={openRename}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            ) : projectsQuery.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-2xl border border-border/80">
                    <Skeleton className="aspect-video rounded-none" />
                    <div className="space-y-2 p-4">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : projectsQuery.isError ? (
              <EmptyState
                icon={Clapperboard}
                title="The project list could not load"
                description={(projectsQuery.error as Error).message}
                action={
                  <Button variant="outline" onClick={() => void projectsQuery.refetch()}>
                    Try again
                  </Button>
                }
              />
            ) : projects.length === 0 ? (
              <EmptyState
                icon={LayoutGrid}
                title={search || status !== 'ALL' ? 'No projects match that view' : 'Your first cut starts here'}
                description={
                  search || status !== 'ALL'
                    ? 'Try a different search or status filter.'
                    : 'Create a project, pick a format, and the studio will open a clean timeline.'
                }
                action={
                  search || status !== 'ALL' ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch('')
                        setStatus('ALL')
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <NewProjectDialog />
                  )
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {projects.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                    isPreview={false}
                    onRename={openRename}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Workspace pulse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPreview ? (
                <>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Usage, members, and plan limits appear here when the studio API is connected and
                    you are signed in.
                  </p>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/auth/sign-in">
                      Sign in to view usage
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Render minutes</span>
                      <span className="font-mono text-faint">
                        {usage ? `${usage.renderMinutes} / ${limits?.renderMinutes ?? 0}` : '—'}
                      </span>
                    </div>
                    <Progress value={renderUsagePercent} className="mt-2 h-1" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">AI credits</span>
                      <span className="font-mono text-faint">
                        {usage ? `${usage.aiCredits} / ${limits?.aiCredits ?? 0}` : '—'}
                      </span>
                    </div>
                    <Progress value={creditUsagePercent} className="mt-2 h-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-center">
                    <div>
                      <p className="font-mono text-lg text-foreground">{usage?.projects ?? '—'}</p>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-faint">Projects</p>
                    </div>
                    <div>
                      <p className="font-mono text-lg text-foreground">{usage?.exports ?? '—'}</p>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-faint">Exports</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Delivery queue</CardTitle>
            </CardHeader>
            <CardContent>
              {isPreview ? (
                <div className="space-y-2.5">
                  {[
                    { label: 'Aurora — Brand Film', meta: 'Sample · 1080p' },
                    { label: 'Night Drive / Social', meta: 'Sample · 9:16' },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] text-foreground">{row.label}</p>
                        <p className="text-[9px] uppercase tracking-[0.1em] text-faint">{row.meta}</p>
                      </div>
                      <Badge variant="muted">Sample</Badge>
                    </div>
                  ))}
                </div>
              ) : rendersQuery.data?.items.length ? (
                <div className="space-y-2.5">
                  {rendersQuery.data.items.slice(0, 3).map((render) => (
                    <Link
                      key={render.id}
                      href="/exports"
                      className="block rounded-lg border border-border/60 px-2.5 py-2 transition-colors hover:border-border-strong"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-foreground">
                          {String(render.settings?.projectTitle ?? render.projectId)}
                        </span>
                        <StatusBadge status={render.status} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[9px] text-faint">
                        <span className="font-mono">
                          {String(render.settings?.resolution ?? '')} ·{' '}
                          {String(render.settings?.aspectRatio ?? '')}
                        </span>
                        <span>{timeAgo(render.createdAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-xs text-muted-foreground">No render jobs yet.</p>
                  <Button asChild variant="ghost" size="sm" className="mt-2 text-[11px]">
                    <Link href="/exports">Open exports</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-border/80 bg-[linear-gradient(145deg,hsl(var(--brand)/0.12),transparent_65%)] p-4">
            <Sparkles className="h-4 w-4 text-brand-bright" />
            <p className="mt-2.5 text-xs font-medium text-foreground">Need a first draft?</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Describe the film and let AI Studio propose a three-scene storyboard.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 h-7 w-full text-[11px]">
              <Link href="/ai">
                Open AI Studio
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </aside>
      </div>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="max-w-md">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (renameValue.trim()) renameMutation.mutate()
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename project</DialogTitle>
              <DialogDescription>This changes the project title only. The timeline stays intact.</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <Input
                autoFocus
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                maxLength={120}
                aria-label="Project title"
              />
            </div>
            <DialogFooter className="mt-5">
              <Button type="button" variant="ghost" onClick={() => setRenameTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={renameMutation.isPending || !renameValue.trim()}>
                Save name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.title}” will be soft-deleted and removed from this workspace. This
              cannot be undone from the studio.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Keep project
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  )
}
