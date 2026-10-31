'use client'

import * as React from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AudioLines,
  Check,
  ChevronDown,
  Clapperboard,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  Mic,
  Play,
  Sparkles,
  Video,
  Wand2,
  X,
} from 'lucide-react'
import {
  AI_CREDIT_COST,
  ASPECT_RATIOS,
  RESOLUTIONS,
  type AiJobKind,
  type AspectRatio,
  type Resolution,
} from '@frameforge/shared'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { useWorkspace } from '@/components/workspace-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import type { AiJob, MediaAsset, Paginated } from '@/lib/types'
import { cn, timeAgo } from '@/lib/utils'

const modes: Array<{
  kind: AiJobKind
  label: string
  short: string
  description: string
  icon: typeof Sparkles
  needsPrompt: boolean
  needsText?: boolean
  needsAsset?: 'video' | 'image' | 'audio'
}> = [
  {
    kind: 'TEXT_TO_VIDEO',
    label: 'Text to video',
    short: 'Prompt to motion',
    description: 'Describe the shot and generate a short cinematic sequence.',
    icon: Video,
    needsPrompt: true,
  },
  {
    kind: 'SCRIPT',
    label: 'Script',
    short: 'Brief to narration',
    description: 'Draft a timed voiceover script from a concept.',
    icon: FileText,
    needsPrompt: true,
  },
  {
    kind: 'STORYBOARD',
    label: 'Storyboard',
    short: 'Idea to shot list',
    description: 'Turn a treatment into scene-by-scene frames.',
    icon: Layers,
    needsPrompt: true,
  },
  {
    kind: 'IMAGE_TO_VIDEO',
    label: 'Image to video',
    short: 'Still to sequence',
    description: 'Animate an existing image or reference frame.',
    icon: ImageIcon,
    needsPrompt: false,
    needsAsset: 'image',
  },
  {
    kind: 'TEXT_TO_SPEECH',
    label: 'Voiceover',
    short: 'Script to voice',
    description: 'Read a script with a consistent synthetic voice.',
    icon: Mic,
    needsPrompt: false,
    needsText: true,
  },
  {
    kind: 'TRANSCRIPTION',
    label: 'Transcribe',
    short: 'Audio to text',
    description: 'Extract timed captions from an audio or video asset.',
    icon: AudioLines,
    needsPrompt: false,
    needsAsset: 'audio',
  },
]

const styles = ['cinematic', 'documentary', 'product', 'social', 'anime', 'minimal'] as const

const SAMPLE_JOBS: Partial<AiJob>[] = [
  {
    id: 'sample-ai-1',
    kind: 'STORYBOARD',
    prompt: 'A coastal town wakes beneath an aurora. Three hopeful scenes, anamorphic.',
    status: 'SUCCEEDED',
    progress: 100,
    mock: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    durationSeconds: 18,
  },
  {
    id: 'sample-ai-2',
    kind: 'TEXT_TO_SPEECH',
    prompt: 'Narration for the spring campaign opening.',
    status: 'QUEUED',
    progress: 12,
    mock: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    durationSeconds: 18,
  },
]

function modeLabel(kind: string) {
  return modes.find((mode) => mode.kind === kind) ?? modes[0]!
}

function AiJobCard({
  job,
  isPreview,
}: {
  job: AiJob | Partial<AiJob>
  isPreview: boolean
}) {
  const queryClient = useQueryClient()
  const mode = modeLabel(job.kind ?? 'TEXT_TO_VIDEO')
  const Icon = mode.icon
  const active = job.status === 'QUEUED' || job.status === 'RUNNING'

  const cancel = useMutation({
    mutationFn: () => api.post(`/ai/generations/${job.id}/cancel`, {}),
    onSuccess: () => {
      toast.success('Generation canceled')
      void queryClient.invalidateQueries({ queryKey: ['ai-generations'] })
    },
    onError: (error) => toast.error('Could not cancel', { description: (error as Error).message }),
  })

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-surface-2 text-brand-bright">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium text-foreground">{mode.label}</p>
            {job.status ? <StatusBadge status={job.status} /> : null}
            {job.mock ? (
              <Badge variant="warning" className="text-[9px] uppercase tracking-[0.1em]">
                Mock
              </Badge>
            ) : null}
            {isPreview ? (
              <Badge variant="muted" className="text-[9px] uppercase tracking-[0.1em]">
                Sample
              </Badge>
            ) : null}
          </div>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            {job.prompt || job.script || 'No prompt recorded.'}
          </p>
        </div>
        {active && !isPreview ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel generation"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
          >
            {cancel.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          </Button>
        ) : null}
      </div>

      {active ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-faint">
            <span>{job.status === 'RUNNING' ? 'Generating' : 'Waiting for a worker'}</span>
            <span className="font-mono">{job.progress ?? 0}%</span>
          </div>
          <Progress value={job.progress ?? 0} className="mt-1.5 h-1" />
        </div>
      ) : null}

      {job.status === 'SUCCEEDED' ? (
        <div className="mt-3 rounded-lg border border-border/60 bg-surface-2/50 px-2.5 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-faint">
          {job.mock
            ? 'Mock output · no media file was produced'
            : 'Generation complete · open the result in the studio'}
        </div>
      ) : null}

      {job.status === 'FAILED' && job.errorMessage ? (
        <p className="mt-3 rounded-lg border border-danger/20 bg-danger/5 px-2.5 py-2 text-[10px] text-danger">
          {job.errorMessage}
        </p>
      ) : null}

      <div className="mt-2.5 flex items-center justify-between text-[9px] text-faint">
        <span className="font-mono uppercase tracking-[0.1em]">
          {job.durationSeconds ?? 15}s · {job.aspectRatio ?? '16:9'}
        </span>
        <span>{job.createdAt ? timeAgo(job.createdAt) : ''}</span>
      </div>
    </div>
  )
}

function AiStudioContent() {
  const { workspace, workspaceId, isPreview, needsAuth, session } = useWorkspace()
  const queryClient = useQueryClient()
  const [kind, setKind] = React.useState<AiJobKind>('TEXT_TO_VIDEO')
  const [prompt, setPrompt] = React.useState('')
  const [text, setText] = React.useState('')
  const [style, setStyle] = React.useState<(typeof styles)[number]>('cinematic')
  const [ratio, setRatio] = React.useState<AspectRatio>('16:9')
  const [resolution, setResolution] = React.useState<Resolution>('1080p')
  const [duration, setDuration] = React.useState(15)
  const [scenes, setScenes] = React.useState(3)
  const [sourceAssetId, setSourceAssetId] = React.useState<string>('')
  const [advanced, setAdvanced] = React.useState(false)

  const mode = modes.find((item) => item.kind === kind) ?? modes[0]!

  const jobsQuery = useQuery({
    queryKey: ['ai-generations', workspaceId],
    queryFn: () =>
      api.get<Paginated<AiJob>>(`/ai/generations?workspaceId=${workspaceId}&pageSize=20`),
    enabled: Boolean(workspaceId) && !isPreview,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      return items.some((job) => job.status === 'QUEUED' || job.status === 'RUNNING') ? 5000 : false
    },
  })

  const assetsQuery = useQuery({
    queryKey: ['media-picker', workspaceId, mode.needsAsset],
    queryFn: () =>
      api.get<Paginated<MediaAsset>>(
        `/media?workspaceId=${workspaceId}&pageSize=40${
          mode.needsAsset === 'image'
            ? '&kind=IMAGE'
            : mode.needsAsset === 'audio'
              ? '&kind=AUDIO'
              : mode.needsAsset === 'video'
                ? '&kind=VIDEO'
                : ''
        }`
      ),
    enabled: Boolean(workspaceId) && !isPreview && Boolean(mode.needsAsset),
  })

  const create = useMutation({
    mutationFn: () =>
      api.post<AiJob>('/ai/generations', {
        workspaceId,
        kind,
        prompt: mode.needsPrompt ? prompt.trim() : undefined,
        text: mode.needsText ? text.trim() : undefined,
        style: mode.needsPrompt || mode.needsText ? style : undefined,
        aspectRatio: ratio,
        resolution,
        durationSeconds: duration,
        sceneCount: scenes,
        sourceAssetId: mode.needsAsset ? sourceAssetId || undefined : undefined,
      }),
    onSuccess: (job) => {
      toast.success('Generation queued', {
        description: job.mock
          ? 'Mock provider job — the result will be labeled.'
          : 'Your job is waiting for a worker.',
      })
      setPrompt('')
      setText('')
      void queryClient.invalidateQueries({ queryKey: ['ai-generations'] })
    },
    onError: (error) => {
      toast.error('Could not queue generation', { description: (error as Error).message })
    },
  })

  const jobs = jobsQuery.data?.items ?? []
  const assets = assetsQuery.data?.items ?? []
  const creditCost = AI_CREDIT_COST[kind]
  const canSubmit = isPreview
    ? false
    : mode.needsPrompt
      ? prompt.trim().length > 3
      : mode.needsText
        ? text.trim().length > 3
        : Boolean(sourceAssetId)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Studio"
        title="Write it. Watch it take shape."
        description="Draft a treatment, generate a storyboard, or turn a still into motion. Jobs run through the same workspace as your edits."
        actions={
          <>
            <Badge variant="outline" className="h-9 px-3 font-mono text-[10px]">
              {AI_CREDIT_COST[kind]} credits / job
            </Badge>
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link href="/media">
                <ImageIcon className="h-3.5 w-3.5" />
                Media
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Card className="self-start">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wand2 className="h-4 w-4 text-brand-bright" />
              Compose a generation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div className="grid grid-cols-2 gap-1.5">
              {modes.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.kind}
                    type="button"
                    onClick={() => {
                      setKind(item.kind)
                      setSourceAssetId('')
                    }}
                    aria-pressed={kind === item.kind}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors',
                      kind === item.kind
                        ? 'border-brand/50 bg-brand/10 text-foreground'
                        : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-3.5 w-3.5',
                        kind === item.kind ? 'text-brand-bright' : 'text-faint'
                      )}
                    />
                    {item.label}
                  </button>
                )
              })}
            </div>

            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-surface-2/40 px-3 py-2.5">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-bright" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {mode.description}
              </p>
            </div>

            {mode.needsPrompt ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ai-prompt">Prompt</Label>
                  <span className="font-mono text-[9px] text-faint">{prompt.length} / 4000</span>
                </div>
                <Textarea
                  id="ai-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  maxLength={4000}
                  placeholder="A slow aerial push over glacial ridges at blue hour, volumetric aurora, anamorphic flare…"
                  className="min-h-[132px] resize-y text-[13px]"
                />
              </div>
            ) : null}

            {mode.needsText ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ai-text">Voiceover script</Label>
                  <span className="font-mono text-[9px] text-faint">{text.length} / 4000</span>
                </div>
                <Textarea
                  id="ai-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  maxLength={4000}
                  placeholder="Some places ask you to stay for the last light…"
                  className="min-h-[132px] resize-y text-[13px]"
                />
              </div>
            ) : null}

            {mode.needsAsset ? (
              <div className="space-y-2">
                <Label htmlFor="ai-asset">
                  Source {mode.needsAsset === 'image' ? 'image' : 'audio or video asset'}
                </Label>
                <select
                  id="ai-asset"
                  value={sourceAssetId}
                  onChange={(event) => setSourceAssetId(event.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="">
                    {assets.length ? 'Choose an asset…' : 'No matching assets yet'}
                  </option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.originalName} · {asset.status.toLowerCase()}
                    </option>
                  ))}
                </select>
                {assets.length === 0 ? (
                  <p className="text-[10px] text-faint">
                    Upload media first, then return here.{' '}
                    <Link href="/media" className="text-brand-bright hover:underline">
                      Open media library
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Direction</Label>
              <div className="flex flex-wrap gap-1.5">
                {styles.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStyle(option)}
                    aria-pressed={style === option}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[10px] capitalize transition-colors',
                      style === option
                        ? 'border-brand/50 bg-brand/10 text-brand-bright'
                        : 'border-border text-muted-foreground hover:border-border-strong'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <div className="flex flex-wrap gap-1.5">
                {ASPECT_RATIOS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRatio(option)}
                    aria-pressed={ratio === option}
                    className={cn(
                      'rounded-md border px-2.5 py-1 font-mono text-[10px] transition-colors',
                      ratio === option
                        ? 'border-brand/50 bg-brand/10 text-brand-bright'
                        : 'border-border text-muted-foreground hover:border-border-strong'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAdvanced((value) => !value)}
              className="flex w-full items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={advanced}
            >
              Advanced settings
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform', advanced && 'rotate-180')}
              />
            </button>

            {advanced ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-duration" className="text-[11px]">
                    Duration
                  </Label>
                  <select
                    id="ai-duration"
                    value={duration}
                    onChange={(event) => setDuration(Number(event.target.value))}
                    className="h-9 w-full rounded-md border border-input bg-background/60 px-2 text-xs"
                  >
                    {[5, 10, 15, 30, 60, 90].map((value) => (
                      <option key={value} value={value}>
                        {value}s
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-scenes" className="text-[11px]">
                    Scenes
                  </Label>
                  <Input
                    id="ai-scenes"
                    type="number"
                    min={1}
                    max={8}
                    value={scenes}
                    onChange={(event) =>
                      setScenes(Math.max(1, Math.min(8, Number(event.target.value) || 1)))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-resolution" className="text-[11px]">
                    Resolution
                  </Label>
                  <select
                    id="ai-resolution"
                    value={resolution}
                    onChange={(event) => setResolution(event.target.value as Resolution)}
                    className="h-9 w-full rounded-md border border-input bg-background/60 px-2 text-xs"
                  >
                    {RESOLUTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            {isPreview ? (
              <div className="rounded-lg border border-warning/25 bg-warning/[0.06] p-3">
                <p className="text-[11px] leading-relaxed text-warning">
                  {needsAuth
                    ? 'Sign in to queue a real generation in this workspace.'
                    : 'The API is not reachable, so generation is disabled.'}
                </p>
                {needsAuth ? (
                  <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-[10px]">
                    <Link href="/auth/sign-in">Sign in</Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                <p className="text-[10px] leading-relaxed text-faint">
                  {creditCost} AI credits
                  <br />
                  Mock jobs are labeled
                </p>
                <Button
                  variant="brand"
                  className="gap-2"
                  disabled={!canSubmit || create.isPending}
                  onClick={() => create.mutate()}
                >
                  {create.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="min-w-0">
          <Tabs defaultValue="all">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="all">All jobs</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="done">Completed</TabsTrigger>
              </TabsList>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                {isPreview ? 'Sample jobs' : `${jobs.length} recent`}
              </p>
            </div>

            <TabsContent value="all" className="mt-4 space-y-2.5">
              {isPreview
                ? (SAMPLE_JOBS as AiJob[]).map((job) => (
                    <AiJobCard key={job.id} job={job} isPreview />
                  ))
                : jobsQuery.isLoading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="h-28 animate-pulse rounded-xl bg-muted/50" />
                    ))
                  : jobsQuery.isError
                    ? (
                        <EmptyState
                          icon={Wand2}
                          title="Generation history unavailable"
                          description={(jobsQuery.error as Error).message}
                          action={
                            <Button variant="outline" onClick={() => void jobsQuery.refetch()}>
                              Try again
                            </Button>
                          }
                        />
                      )
                    : jobs.length === 0
                      ? (
                          <EmptyState
                            icon={Sparkles}
                            title="No generations yet"
                            description="Describe a scene or paste a script. The result will appear here with its provider status."
                          />
                        )
                      : jobs.map((job) => <AiJobCard key={job.id} job={job} isPreview={false} />)}
            </TabsContent>

            <TabsContent value="active" className="mt-4 space-y-2.5">
              {(isPreview ? (SAMPLE_JOBS as AiJob[]) : jobs)
                .filter((job) => job.status === 'QUEUED' || job.status === 'RUNNING')
                .map((job) => (
                  <AiJobCard key={job.id} job={job} isPreview={isPreview} />
                ))}
              {!isPreview &&
              !jobs.some((job) => job.status === 'QUEUED' || job.status === 'RUNNING') ? (
                <EmptyState
                  icon={Play}
                  title="Nothing in the queue"
                  description="Active generation jobs will appear here while a worker is processing them."
                />
              ) : null}
            </TabsContent>

            <TabsContent value="done" className="mt-4 space-y-2.5">
              {(isPreview ? (SAMPLE_JOBS as AiJob[]) : jobs)
                .filter(
                  (job) =>
                    job.status === 'SUCCEEDED' ||
                    job.status === 'FAILED' ||
                    job.status === 'CANCELED'
                )
                .map((job) => (
                  <AiJobCard key={job.id} job={job} isPreview={isPreview} />
                ))}
              {!isPreview &&
              !jobs.some(
                (job) =>
                  job.status === 'SUCCEEDED' ||
                  job.status === 'FAILED' ||
                  job.status === 'CANCELED'
              ) ? (
                <EmptyState
                  icon={Check}
                  title="No finished jobs"
                  description="Completed, failed, and canceled generations will collect here."
                />
              ) : null}
            </TabsContent>
          </Tabs>

          <div className="mt-5 rounded-xl border border-border/60 bg-surface-2/30 p-4">
            <div className="flex items-center gap-2">
              <Clapperboard className="h-3.5 w-3.5 text-brand-bright" />
              <p className="text-xs font-medium text-foreground">From generation to timeline</p>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Storyboards and scripts stay attached to the workspace. Open a project to move the
              result onto a track — mock generations are never presented as real footage.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="h-7 text-[10px]">
                <Link href="/dashboard">Choose a project</Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="h-7 text-[10px]">
                <Link href="/media">View media library</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AiStudioPage() {
  return (
    <AppShell>
      <AiStudioContent />
    </AppShell>
  )
}
