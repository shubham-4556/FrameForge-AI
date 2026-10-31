'use client'

import * as React from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Download,
  Film,
  FolderOpen,
  HardDrive,
  ImageIcon,
  Loader2,
  MoreHorizontal,
  Music,
  Play,
  Search,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react'
import { MAX_UPLOAD_BYTES, UPLOAD_MIME_TYPES } from '@frameforge/shared'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { useWorkspace } from '@/components/workspace-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api'
import type { MediaAsset, Paginated, WorkspaceDetail } from '@/lib/types'
import { cn, formatBytes, formatClock, timeAgo } from '@/lib/utils'

type KindFilter = 'ALL' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FONT'

interface UploadItem {
  id: string
  name: string
  progress: number
  status: 'uploading' | 'processing' | 'done' | 'error'
  error?: string
}

const filters: Array<{ value: KindFilter; label: string }> = [
  { value: 'ALL', label: 'All media' },
  { value: 'IMAGE', label: 'Images' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'FONT', label: 'Fonts' },
]

const SAMPLE_MEDIA: Array<MediaAsset & { sample?: boolean }> = [
  {
    id: 'sample-media-1',
    workspaceId: 'sample',
    projectId: null,
    kind: 'VIDEO',
    status: 'READY',
    originalName: 'aurora-establishing.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 84_300_000,
    durationMs: 12_400,
    width: 3840,
    height: 2160,
    hasAudio: true,
    mock: false,
    failureReason: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    updatedAt: new Date().toISOString(),
    previewUrl: null,
    sample: true,
  },
  {
    id: 'sample-media-2',
    workspaceId: 'sample',
    projectId: null,
    kind: 'IMAGE',
    status: 'READY',
    originalName: 'night-drive-reference.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 3_820_000,
    durationMs: null,
    width: 3840,
    height: 2160,
    hasAudio: null,
    mock: false,
    failureReason: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    updatedAt: new Date().toISOString(),
    previewUrl: null,
    sample: true,
  },
  {
    id: 'sample-media-3',
    workspaceId: 'sample',
    projectId: null,
    kind: 'AUDIO',
    status: 'READY',
    originalName: 'afterglow-score.wav',
    mimeType: 'audio/wav',
    sizeBytes: 41_200_000,
    durationMs: 138_000,
    width: null,
    height: null,
    hasAudio: true,
    mock: false,
    failureReason: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    updatedAt: new Date().toISOString(),
    previewUrl: null,
    sample: true,
  },
  {
    id: 'sample-media-4',
    workspaceId: 'sample',
    projectId: null,
    kind: 'VIDEO',
    status: 'PROCESSING',
    originalName: 'town-dawn-broll.mov',
    mimeType: 'video/quicktime',
    sizeBytes: 231_000_000,
    durationMs: 42_000,
    width: 1920,
    height: 1080,
    hasAudio: true,
    mock: false,
    failureReason: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    updatedAt: new Date().toISOString(),
    previewUrl: null,
    sample: true,
  },
  {
    id: 'sample-media-5',
    workspaceId: 'sample',
    projectId: null,
    kind: 'IMAGE',
    status: 'READY',
    originalName: 'product-still-03.webp',
    mimeType: 'image/webp',
    sizeBytes: 2_100_000,
    durationMs: null,
    width: 2400,
    height: 3000,
    hasAudio: null,
    mock: false,
    failureReason: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date().toISOString(),
    previewUrl: null,
    sample: true,
  },
]

const kindIcon = {
  VIDEO: Film,
  IMAGE: ImageIcon,
  AUDIO: Music,
  FONT: Type,
}

const kindGradient = {
  VIDEO: 'from-[#0e2a3a] via-[#15515a] to-[#8ff3d4]/30',
  IMAGE: 'from-[#170d2b] via-[#4b1b80] to-[#ff5fa2]/30',
  AUDIO: 'from-[#101827] via-[#263a5f] to-[#8fb8ff]/25',
  FONT: 'from-[#2b160d] via-[#8f3d1d] to-[#ffc36b]/30',
}

function uploadWithProgress(
  url: string,
  method: string,
  headers: Record<string, string> | undefined,
  file: File,
  onProgress: (percent: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    Object.entries(headers ?? {}).forEach(([key, value]) => xhr.setRequestHeader(key, value))
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed with status ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('The upload connection failed'))
    xhr.send(file)
  })
}

function MediaPreview({ asset, sample }: { asset: MediaAsset; sample?: boolean }) {
  if (asset.previewUrl && !sample) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={asset.previewUrl}
        alt={asset.originalName}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
    )
  }

  const Icon = kindIcon[asset.kind]
  return (
    <div className={cn('absolute inset-0 bg-gradient-to-br', kindGradient[asset.kind])}>
      <div className="absolute inset-0 clip-stripes opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.14),transparent_45%)]" />
      {asset.kind === 'AUDIO' ? (
        <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 items-center justify-center gap-[3px]">
          {Array.from({ length: 32 }).map((_, index) => (
            <span
              key={index}
              className="w-full rounded-full bg-white/40"
              style={{ height: `${5 + ((index * 11) % 24)}px` }}
            />
          ))}
        </div>
      ) : (
        <Icon className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-white/60" />
      )}
      {asset.kind === 'VIDEO' ? (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-black/30 text-white/80 backdrop-blur">
            <Play className="h-3 w-3 translate-x-px" fill="currentColor" />
          </span>
        </span>
      ) : null}
    </div>
  )
}

function MediaContent() {
  const { workspaceId, isPreview, needsAuth } = useWorkspace()
  const queryClient = useQueryClient()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [filter, setFilter] = React.useState<KindFilter>('ALL')
  const [search, setSearch] = React.useState('')
  const deferredSearch = React.useDeferredValue(search)
  const [sort, setSort] = React.useState<'createdAt' | 'sizeBytes' | 'originalName'>('createdAt')
  const [dragOver, setDragOver] = React.useState(false)
  const [uploads, setUploads] = React.useState<UploadItem[]>([])
  const [selected, setSelected] = React.useState<MediaAsset | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<MediaAsset | null>(null)
  const [uploading, setUploading] = React.useState(false)

  const mediaQuery = useQuery({
    queryKey: ['media', workspaceId, filter, deferredSearch, sort],
    queryFn: () => {
      const params = new URLSearchParams({
        workspaceId: workspaceId ?? '',
        pageSize: '48',
        sort,
        order: sort === 'originalName' ? 'asc' : 'desc',
      })
      if (filter !== 'ALL') params.set('kind', filter)
      if (deferredSearch.trim()) params.set('q', deferredSearch.trim())
      return api.get<Paginated<MediaAsset>>(`/media?${params.toString()}`)
    },
    enabled: Boolean(workspaceId) && !isPreview,
    refetchInterval: (query) =>
      (query.state.data?.items ?? []).some(
        (asset) => asset.status === 'PROCESSING' || asset.status === 'UPLOADING'
      )
        ? 4000
        : false,
  })

  const workspaceQuery = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api.get<WorkspaceDetail>(`/workspaces/${workspaceId}`),
    enabled: Boolean(workspaceId) && !isPreview,
  })

  const selectedQuery = useQuery({
    queryKey: ['media-detail', selected?.id],
    queryFn: () =>
      api.get<MediaAsset & { downloadUrl: string; previewUrl: string | null }>(`/media/${selected?.id}`),
    enabled: Boolean(selected?.id) && !isPreview && !(selected as MediaAsset & { sample?: boolean })?.sample,
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/media/${deleteTarget?.id}`),
    onSuccess: () => {
      toast.success('Asset deleted')
      setDeleteTarget(null)
      setSelected(null)
      void queryClient.invalidateQueries({ queryKey: ['media'] })
    },
    onError: (error) => toast.error('Could not delete asset', { description: (error as Error).message }),
  })

  const updateUpload = (id: string, patch: Partial<UploadItem>) => {
    setUploads((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (!list.length || !workspaceId) return
    if (isPreview) {
      toast.message('Sign in to upload media', {
        description: 'Uploads are stored in your workspace and require an authenticated session.',
        action: { label: 'Sign in', onClick: () => (window.location.href = '/auth/sign-in') },
      })
      return
    }

    setUploading(true)
    for (const file of list) {
      const kind = UPLOAD_MIME_TYPES[file.type]
      if (!kind) {
        toast.error(`Unsupported file: ${file.name}`, {
          description: 'Use MP4, MOV, WebM, JPG, PNG, WebP, MP3, WAV, AAC, or OGG.',
        })
        continue
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${file.name} is too large`, { description: `The maximum upload size is ${formatBytes(MAX_UPLOAD_BYTES)}.` })
        continue
      }

      const localId = `${file.name}-${Date.now()}-${Math.random()}`
      setUploads((items) => [
        ...items,
        { id: localId, name: file.name, progress: 0, status: 'uploading' },
      ])

      try {
        const init = await api.post<{
          asset: MediaAsset
          upload: { url: string; method: string; headers?: Record<string, string> }
        }>('/media/uploads/init', {
          workspaceId,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        })

        await uploadWithProgress(
          init.upload.url,
          init.upload.method ?? 'PUT',
          init.upload.headers,
          file,
          (progress) => updateUpload(localId, { progress })
        )

        updateUpload(localId, { progress: 100, status: 'processing' })
        await api.post(`/media/${init.asset.id}/complete`, {})
        updateUpload(localId, { status: 'done', progress: 100 })
        toast.success(`${file.name} uploaded`, { description: 'Probing started in the background.' })
        void queryClient.invalidateQueries({ queryKey: ['media'] })
        window.setTimeout(() => {
          setUploads((items) => items.filter((item) => item.id !== localId))
        }, 3500)
      } catch (error) {
        updateUpload(localId, { status: 'error', error: (error as Error).message })
        toast.error(`Upload failed: ${file.name}`, { description: (error as Error).message })
      }
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const downloadAsset = async (asset: MediaAsset) => {
    if (isPreview) {
      toast.message('Sample asset', { description: 'Connect the API and sign in to download real files.' })
      return
    }
    try {
      const result = await api.get<{ url: string }>(`/media/${asset.id}/download`)
      window.open(result.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error('Download unavailable', { description: (error as Error).message })
    }
  }

  const displayAssets = isPreview ? SAMPLE_MEDIA : (mediaQuery.data?.items ?? [])
  const usageSummary = workspaceQuery.data?.usage
  const storagePercent =
    usageSummary && usageSummary.limits.storageBytes > 0
      ? Math.min(
          100,
          Math.round(
            (usageSummary.usage.storageBytes / usageSummary.limits.storageBytes) * 100
          )
        )
      : 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Media library"
        title="The raw material."
        description="Upload footage, stills, audio, and fonts. Every asset is probed, previewed, and attached to this workspace."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                if (isPreview) {
                  toast.message('Sign in to upload media', {
                    description: 'Authenticated workspaces can store real assets.',
                    action: { label: 'Sign in', onClick: () => (window.location.href = '/auth/sign-in') },
                  })
                } else {
                  fileInputRef.current?.click()
                }
              }}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={Object.keys(UPLOAD_MIME_TYPES).join(',')}
              className="hidden"
              onChange={(event) => event.target.files && void uploadFiles(event.target.files)}
            />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-card p-4 sm:col-span-2">
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragOver(false)
              void uploadFiles(event.dataTransfer.files)
            }}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border border-dashed px-5 py-7 text-center transition-colors',
              dragOver
                ? 'border-brand/60 bg-brand/[0.06]'
                : 'border-border-strong/60 bg-surface-2/30'
            )}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-brand-bright" />
              ) : (
                <Upload className="h-4 w-4 text-brand-bright" />
              )}
            </span>
            <p className="mt-3 text-xs font-medium text-foreground">
              {dragOver ? 'Drop to upload' : 'Drag media here, or choose files'}
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
              MP4 · MOV · WebM · JPG · PNG · WAV · MP3 · up to {formatBytes(MAX_UPLOAD_BYTES)}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-7 text-[10px]"
              onClick={() => {
                if (isPreview) {
                  toast.message('Sign in to upload media')
                } else {
                  fileInputRef.current?.click()
                }
              }}
            >
              Choose files
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">Storage</p>
            <HardDrive className="h-3.5 w-3.5 text-faint" />
          </div>
          <p className="mt-3 font-mono text-xl text-foreground">
            {isPreview
              ? '—'
              : usageSummary
                ? `${formatBytes(usageSummary.usage.storageBytes)} / ${formatBytes(usageSummary.limits.storageBytes)}`
                : '…'}
          </p>
          <Progress value={storagePercent} className="mt-2.5 h-1" />
          <p className="mt-2 text-[10px] text-muted-foreground">
            {isPreview ? 'Sign in to view quota' : 'Processed and processing assets count toward quota.'}
          </p>
        </div>
      </div>

      {uploads.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-border/80 bg-card p-3">
          {uploads.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface-2">
                {item.status === 'done' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : item.status === 'error' ? (
                  <X className="h-3.5 w-3.5 text-danger" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-bright" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] text-foreground">{item.name}</p>
                  <span className="font-mono text-[9px] text-faint">
                    {item.status === 'processing' ? 'probing' : `${item.progress}%`}
                  </span>
                </div>
                <Progress value={item.progress} className="mt-1.5 h-1" />
                {item.error ? <p className="mt-1 text-[9px] text-danger">{item.error}</p> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={cn(
                'rounded-full px-3 py-1.5 text-[11px] transition-colors',
                filter === item.value
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search media"
              className="h-8 pl-8 text-xs"
              aria-label="Search media"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setSort('createdAt')}>
                Newest {sort === 'createdAt' ? '✓' : ''}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSort('sizeBytes')}>
                Largest {sort === 'sizeBytes' ? '✓' : ''}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSort('originalName')}>
                Name A–Z {sort === 'originalName' ? '✓' : ''}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {mediaQuery.isLoading && !isPreview ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-xl border border-border/80">
              <div className="aspect-video animate-pulse bg-muted/60" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted/60" />
                <div className="h-2 w-1/2 animate-pulse rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      ) : displayAssets.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={search || filter !== 'ALL' ? 'No assets match that view' : 'The library is empty'}
          description={
            search || filter !== 'ALL'
              ? 'Try a different search term or media type.'
              : 'Drop footage, stills, audio, or fonts here to start building your project.'
          }
          action={
            search || filter !== 'ALL' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('')
                  setFilter('ALL')
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Upload media
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayAssets.map((asset) => {
            const isSample = isPreview || (asset as MediaAsset & { sample?: boolean }).sample
            const Icon = kindIcon[asset.kind]
            return (
              <div
                key={asset.id}
                className="group relative overflow-hidden rounded-xl border border-border/80 bg-card transition-colors hover:border-border-strong"
              >
                <button
                  type="button"
                  className="block w-full text-left focus-visible:outline-none"
                  onClick={() => setSelected(asset)}
                  aria-label={`Preview ${asset.originalName}`}
                >
                  <div className="relative aspect-video overflow-hidden bg-surface-2">
                    <MediaPreview asset={asset} sample={isSample} />
                    <div className="absolute left-2 top-2 flex items-center gap-1.5">
                      <span className="flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-white/75 backdrop-blur">
                        <Icon className="h-2.5 w-2.5" />
                        {asset.kind}
                      </span>
                      {isSample ? (
                        <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-white/60 backdrop-blur">
                          Sample
                        </span>
                      ) : null}
                    </div>
                    {asset.status !== 'READY' ? (
                      <div className="absolute bottom-2 left-2">
                        <StatusBadge status={asset.status} />
                      </div>
                    ) : null}
                    {asset.durationMs ? (
                      <span className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 font-mono text-[8px] text-white/75 backdrop-blur">
                        {formatClock(asset.durationMs)}
                      </span>
                    ) : null}
                  </div>
                </button>

                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-foreground">
                        {asset.originalName}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[9px] text-faint">
                        <span>{formatBytes(asset.sizeBytes)}</span>
                        <span>·</span>
                        <span>{timeAgo(asset.createdAt)}</span>
                      </p>
                    </div>
                    {!isSample ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${asset.originalName}`}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => void downloadAsset(asset)}>
                            <Download className="h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onSelect={() => setDeleteTarget(asset)}>
                            <Trash2 className="h-4 w-4" />
                            Delete asset
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Badge variant="muted" className="text-[8px]">
                        {needsAuth ? 'Sign in' : 'Preview'}
                      </Badge>
                    )}
                  </div>
                  {asset.kind === 'VIDEO' && asset.width && asset.height ? (
                    <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
                      {asset.width} × {asset.height}
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="truncate pr-8">{selected.originalName}</DialogTitle>
                <DialogDescription>
                  {selected.kind} · {formatBytes(selected.sizeBytes)}
                  {selected.durationMs ? ` · ${formatClock(selected.durationMs)}` : ''}
                </DialogDescription>
              </DialogHeader>

              <div className="relative aspect-video overflow-hidden rounded-xl border border-border/70 bg-surface-2">
                {isPreview || (selected as MediaAsset & { sample?: boolean }).sample ? (
                  <MediaPreview asset={selected} sample />
                ) : selectedQuery.data?.previewUrl ? (
                  selected.kind === 'IMAGE' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedQuery.data.previewUrl}
                      alt={selected.originalName}
                      className="h-full w-full object-contain"
                    />
                  ) : selected.kind === 'VIDEO' && selectedQuery.data.downloadUrl ? (
                    <video
                      src={selectedQuery.data.downloadUrl}
                      controls
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="grid h-full place-items-center font-mono text-xs text-muted-foreground">
                      No inline preview for this asset
                    </div>
                  )
                ) : selectedQuery.isLoading ? (
                  <div className="grid h-full place-items-center">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-bright" />
                  </div>
                ) : (
                  <MediaPreview asset={selected} sample={false} />
                )}
              </div>

              {isPreview || (selected as MediaAsset & { sample?: boolean }).sample ? (
                <p className="rounded-lg border border-warning/20 bg-warning/[0.06] px-3 py-2 text-[11px] text-warning">
                  This is a sample library item. Sign in with a connected API to preview and download
                  real files.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-4">
                  <div>
                    <p className="text-faint">Status</p>
                    <div className="mt-1">
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-faint">Dimensions</p>
                    <p className="mt-1 font-mono text-foreground">
                      {selected.width && selected.height
                        ? `${selected.width} × ${selected.height}`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-faint">Audio</p>
                    <p className="mt-1 font-mono text-foreground">
                      {selected.hasAudio == null ? '—' : selected.hasAudio ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-faint">Uploaded</p>
                    <p className="mt-1 text-foreground">{timeAgo(selected.createdAt)}</p>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  Close
                </Button>
                {!isPreview && !(selected as MediaAsset & { sample?: boolean }).sample ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteTarget(selected)}
                      className="text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                    <Button onClick={() => void downloadAsset(selected)}>
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </>
                ) : (
                  <Button asChild>
                    <Link href="/auth/sign-in">Sign in to use this asset</Link>
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete asset?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.originalName}” will be removed from storage and this workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Keep asset
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete asset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function MediaPage() {
  return (
    <AppShell>
      <MediaContent />
    </AppShell>
  )
}
