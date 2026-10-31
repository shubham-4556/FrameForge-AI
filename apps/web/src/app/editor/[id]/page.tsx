'use client'

import * as React from 'react'
import Link from 'next/link'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CloudOff,
  Loader2,
  PanelLeft,
  PanelRight,
  Save,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react'
import {
  createId,
  findClip,
  timelineDurationMs,
  type TimelineClip,
  type TimelineDocument,
  type TimelineTrack,
} from '@frameforge/shared'
import { toast } from 'sonner'
import { Logo } from '@/components/brand/logo'
import { EditorExportDialog } from '@/components/editor/editor-export-dialog'
import { EditorInspector } from '@/components/editor/editor-inspector'
import { EditorLibrary } from '@/components/editor/editor-library'
import { EditorPreview } from '@/components/editor/editor-preview'
import { EditorTimeline } from '@/components/editor/editor-timeline'
import { Button } from '@/components/ui/button'
import { ApiError, api } from '@/lib/api'
import type { MediaAsset, Paginated, ProjectDetail } from '@/lib/types'
import { cn, timeAgo } from '@/lib/utils'

interface SaveTimelineResult {
  saved: boolean
  version: number
  durationMs: number
  updatedAt: string
}

interface ConflictState {
  currentVersion?: number
  lastEditedAt?: string
}

const SAMPLE_ASSETS: MediaAsset[] = [
  {
    id: 'sample_asset_video',
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
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    updatedAt: new Date().toISOString(),
    previewUrl: null,
  },
  {
    id: 'sample_asset_image',
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
  },
  {
    id: 'sample_asset_audio',
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
  },
]

function createSampleTimeline(): TimelineDocument {
  const overlayTrack = createId()
  const titleTrack = createId()
  const videoTrack = createId()
  const audioTrack = createId()
  return {
    version: 1,
    name: 'Aurora — sample cut',
    aspectRatio: '16:9',
    width: 1920,
    height: 1080,
    fps: 30,
    background: '#05070b',
    tracks: [
      {
        id: overlayTrack,
        type: 'overlay',
        name: 'Overlays',
        muted: false,
        locked: false,
        hidden: false,
        clips: [
          {
            id: createId(),
            kind: 'image',
            assetId: 'sample_asset_image',
            startMs: 2800,
            durationMs: 5600,
            trimInMs: 0,
            opacity: 0.9,
            fadeInMs: 500,
            fadeOutMs: 500,
            fit: 'cover',
            scale: 1.04,
            transition: 'fade',
          },
        ],
      },
      {
        id: titleTrack,
        type: 'text',
        name: 'Titles',
        muted: false,
        locked: false,
        hidden: false,
        clips: [
          {
            id: createId(),
            kind: 'text',
            role: 'title',
            text: 'FROM IMAGINATION',
            fontFamily: 'sans',
            fontSize: 82,
            color: '#ffffff',
            background: null,
            align: 'center',
            xPercent: 50,
            yPercent: 38,
            maxWidthPercent: 80,
            bold: true,
            transition: 'fade',
            startMs: 400,
            durationMs: 3600,
            trimInMs: 0,
            opacity: 1,
            fadeInMs: 400,
            fadeOutMs: 600,
          },
          {
            id: createId(),
            kind: 'text',
            role: 'title',
            text: 'TO FINAL CUT.',
            fontFamily: 'sans',
            fontSize: 82,
            color: '#ffffff',
            background: null,
            align: 'center',
            xPercent: 50,
            yPercent: 38,
            maxWidthPercent: 80,
            bold: true,
            transition: 'fade',
            startMs: 5200,
            durationMs: 5200,
            trimInMs: 0,
            opacity: 1,
            fadeInMs: 400,
            fadeOutMs: 800,
          },
        ],
      },
      {
        id: videoTrack,
        type: 'video',
        name: 'Video 1',
        muted: false,
        locked: false,
        hidden: false,
        clips: [
          {
            id: createId(),
            kind: 'video',
            assetId: 'sample_asset_video',
            startMs: 0,
            durationMs: 12_000,
            trimInMs: 0,
            opacity: 1,
            fadeInMs: 0,
            fadeOutMs: 0,
            fit: 'cover',
            volume: 0.8,
            muted: false,
            speed: 1,
            transition: 'none',
          },
        ],
      },
      {
        id: audioTrack,
        type: 'audio',
        name: 'Audio',
        muted: false,
        locked: false,
        hidden: false,
        clips: [
          {
            id: createId(),
            kind: 'audio',
            assetId: 'sample_asset_audio',
            startMs: 0,
            durationMs: 12_000,
            trimInMs: 0,
            opacity: 1,
            fadeInMs: 300,
            fadeOutMs: 1200,
            volume: 0.7,
            muted: false,
            speed: 1,
          },
        ],
      },
    ],
  }
}

function compatible(assetKind: MediaAsset['kind'], trackType: TimelineTrack['type']) {
  if (assetKind === 'AUDIO') return trackType === 'audio'
  if (assetKind === 'VIDEO' || assetKind === 'IMAGE') {
    return trackType === 'video' || trackType === 'overlay'
  }
  return false
}

function assetClip(asset: MediaAsset, startMs: number): TimelineClip {
  const durationMs = Math.max(
    100,
    Math.round(asset.durationMs ?? (asset.kind === 'IMAGE' ? 5000 : 5000))
  )
  const base = {
    id: createId(),
    startMs,
    durationMs,
    trimInMs: 0,
    opacity: 1,
    fadeInMs: 0,
    fadeOutMs: 0,
  }
  if (asset.kind === 'VIDEO') {
    return {
      ...base,
      kind: 'video',
      assetId: asset.id,
      fit: 'cover',
      volume: 1,
      muted: false,
      speed: 1,
      transition: 'none',
    }
  }
  if (asset.kind === 'IMAGE') {
    return {
      ...base,
      kind: 'image',
      assetId: asset.id,
      fit: 'cover',
      scale: 1,
      transition: 'none',
    }
  }
  return {
    ...base,
    kind: 'audio',
    assetId: asset.id,
    volume: 1,
    muted: false,
    speed: 1,
  }
}

function textClip(
  preset: 'title' | 'caption' | 'lowerThird',
  startMs: number
): TimelineClip {
  const base = {
    id: createId(),
    kind: 'text' as const,
    startMs,
    durationMs: preset === 'caption' ? 3000 : 4000,
    trimInMs: 0,
    opacity: 1,
    fadeInMs: preset === 'caption' ? 120 : 300,
    fadeOutMs: preset === 'caption' ? 120 : 300,
    fontFamily: 'sans' as const,
    color: '#ffffff',
    bold: true,
    transition: 'fade' as const,
  }
  if (preset === 'caption') {
    return {
      ...base,
      role: 'caption',
      text: 'Caption text',
      fontSize: 34,
      background: '#000000',
      align: 'center',
      xPercent: 50,
      yPercent: 84,
      maxWidthPercent: 74,
    }
  }
  if (preset === 'lowerThird') {
    return {
      ...base,
      role: 'title',
      text: 'Name\nRole or detail',
      fontSize: 40,
      background: '#000000',
      align: 'left',
      xPercent: 28,
      yPercent: 76,
      maxWidthPercent: 46,
    }
  }
  return {
    ...base,
    role: 'title',
    text: 'Your title here',
    fontSize: 72,
    background: null,
    align: 'center',
    xPercent: 50,
    yPercent: 42,
    maxWidthPercent: 80,
  }
}

const sampleTimeline = createSampleTimeline()
const sampleAssetMap = new Map(SAMPLE_ASSETS.map((asset) => [asset.id, asset]))

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = React.use(params)
  return <EditorWorkspace projectId={projectId} />
}

function EditorWorkspace({ projectId }: { projectId: string }) {
  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<ProjectDetail>(`/projects/${projectId}`),
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  })

  const projectError = projectQuery.error instanceof ApiError ? projectQuery.error : null
  const preview = Boolean(
    projectQuery.isError && projectError && (projectError.status === 401 || projectError.status === 0)
  )

  const workspaceId = projectQuery.data?.workspaceId ?? null

  const mediaQuery = useQuery({
    queryKey: ['editor-media', workspaceId],
    queryFn: () => api.get<Paginated<MediaAsset>>(`/media?workspaceId=${workspaceId}&pageSize=100`),
    enabled: Boolean(workspaceId) && !preview,
    staleTime: 60_000,
  })

  const [timeline, setTimeline] = React.useState<TimelineDocument | null>(null)
  const [title, setTitle] = React.useState('Untitled project')
  const [selectedClipId, setSelectedClipId] = React.useState<string | null>(null)
  const [playheadMs, setPlayheadMs] = React.useState(0)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [pixelsPerSecond, setPixelsPerSecond] = React.useState(56)
  const [dirty, setDirty] = React.useState(false)
  const [conflict, setConflict] = React.useState<ConflictState | null>(null)
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null)
  const [exportOpen, setExportOpen] = React.useState(false)
  const [mobilePanel, setMobilePanel] = React.useState<'assets' | 'inspector' | null>(null)

  const timelineRef = React.useRef<TimelineDocument | null>(null)
  const versionRef = React.useRef(0)
  const playheadRef = React.useRef(0)
  const initializedRef = React.useRef(false)
  const sampleInitializedRef = React.useRef(false)

  React.useEffect(() => {
    timelineRef.current = timeline
  }, [timeline])

  React.useEffect(() => {
    playheadRef.current = playheadMs
  }, [playheadMs])

  React.useEffect(() => {
    if (projectQuery.data && !initializedRef.current) {
      initializedRef.current = true
      setTimeline(projectQuery.data.timeline)
      versionRef.current = projectQuery.data.version
      setTitle(projectQuery.data.title)
      setLastSavedAt(new Date(projectQuery.data.updatedAt))
      setDirty(false)
    }
  }, [projectQuery.data])

  React.useEffect(() => {
    if (preview && !sampleInitializedRef.current) {
      sampleInitializedRef.current = true
      setTimeline(sampleTimeline)
      versionRef.current = 1
      setTitle(sampleTimeline.name ?? 'Aurora — sample cut')
      setDirty(false)
    }
  }, [preview])

  const durationMs = timeline ? timelineDurationMs(timeline) : 0

  const assets = React.useMemo(() => {
    if (preview) return sampleAssetMap
    return new Map((mediaQuery.data?.items ?? []).map((asset) => [asset.id, asset]))
  }, [mediaQuery.data, preview])

  const assetList = preview ? SAMPLE_ASSETS : mediaQuery.data?.items ?? []

  const selection = React.useMemo(
    () => (timeline && selectedClipId ? findClip(timeline, selectedClipId) : null),
    [timeline, selectedClipId]
  )

  React.useEffect(() => {
    if (selectedClipId && timeline && !selection) setSelectedClipId(null)
  }, [selectedClipId, selection, timeline])

  React.useEffect(() => {
    if (playheadMs > Math.max(durationMs, 30_000)) setPlayheadMs(Math.max(durationMs, 30_000))
  }, [durationMs, playheadMs])

  React.useEffect(() => {
    if (!isPlaying) return
    if (!timeline) return
    const length = Math.max(100, timelineDurationMs(timeline))
    const origin = playheadRef.current >= length ? 0 : playheadRef.current
    const startedAt = performance.now() - origin
    const timer = window.setInterval(() => {
      const next = performance.now() - startedAt
      if (next >= length) {
        setPlayheadMs(length)
        setIsPlaying(false)
        return
      }
      setPlayheadMs(next)
    }, 33)
    return () => window.clearInterval(timer)
  }, [isPlaying, timeline])

  React.useEffect(() => {
    if (!dirty || preview) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, preview])

  const applyTimeline = (updater: (current: TimelineDocument) => TimelineDocument) => {
    setTimeline((current) => (current ? updater(current) : current))
    setDirty(true)
  }

  const notifySample = () => {
    toast.message('This is a sample project', {
      description: 'Sign in with a connected API to create, save, and export a real project.',
      action: {
        label: 'Sign in',
        onClick: () => {
          window.location.href = '/auth/sign-in'
        },
      },
    })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const current = timelineRef.current
      if (!current) throw new Error('Timeline is not ready')
      return api.put<SaveTimelineResult>(`/projects/${projectId}/timeline`, {
        baseVersion: versionRef.current,
        document: current,
        label: 'Editor save',
      })
    },
    onSuccess: (result) => {
      versionRef.current = result.version
      setDirty(false)
      setConflict(null)
      setLastSavedAt(new Date())
      toast.success('Timeline saved', { description: `Version ${result.version}` })
    },
    onError: (error) => {
      if (error instanceof ApiError && (error.status === 409 || error.code === 'VERSION_CONFLICT')) {
        const details =
          error.details && typeof error.details === 'object'
            ? (error.details as ConflictState)
            : null
        setConflict(details ?? {})
      }
      toast.error('Could not save timeline', { description: (error as Error).message })
    },
  })

  const reloadLatest = async () => {
    try {
      const latest = await api.get<ProjectDetail>(`/projects/${projectId}`)
      setTimeline(latest.timeline)
      timelineRef.current = latest.timeline
      versionRef.current = latest.version
      setTitle(latest.title)
      setDirty(false)
      setConflict(null)
      setSelectedClipId(null)
      setIsPlaying(false)
      setLastSavedAt(new Date(latest.updatedAt))
      toast.success('Reloaded the latest timeline')
    } catch (error) {
      toast.error('Could not reload the project', { description: (error as Error).message })
    }
  }

  const requestSave = () => {
    if (preview) {
      notifySample()
      return
    }
    if (!dirty || saveMutation.isPending) return
    saveMutation.mutate()
  }

  const renameMutation = useMutation({
    mutationFn: (nextTitle: string) =>
      api.patch(`/projects/${projectId}`, { title: nextTitle }),
    onSuccess: () => toast.success('Project renamed'),
    onError: (error) => {
      toast.error('Could not rename project', { description: (error as Error).message })
      setTitle(projectQuery.data?.title ?? title)
    },
  })

  const commitTitle = () => {
    const next = title.trim()
    if (!next) {
      setTitle(projectQuery.data?.title ?? 'Untitled project')
      return
    }
    if (preview || !projectQuery.data || next === projectQuery.data.title) return
    setTitle(next)
    renameMutation.mutate(next)
  }

  const seek = (ms: number) => {
    setPlayheadMs(Math.max(0, Math.min(Math.max(durationMs, 30_000), Math.round(ms))))
  }

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false)
      return
    }
    if (durationMs <= 0) {
      toast.message('Add a clip to preview the timeline')
      return
    }
    if (playheadMs >= durationMs) setPlayheadMs(0)
    setIsPlaying(true)
  }

  const selectedClip = selection?.clip ?? null
  const selectedTrack = selection?.track ?? null

  const updateClip = (clipId: string, patch: Record<string, unknown>) => {
    const located = timeline ? findClip(timeline, clipId) : null
    if (!located) return
    if (located.track.locked) {
      toast.message('This track is locked')
      return
    }
    applyTimeline((current) => ({
      ...current,
      tracks: current.tracks.map((track) =>
        track.id === located.track.id
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId ? ({ ...clip, ...patch } as TimelineClip) : clip
              ),
            }
          : track
      ),
    }))
  }

  const updateSelectedClip = (patch: Record<string, unknown>) => {
    if (selectedClipId) updateClip(selectedClipId, patch)
  }

  const updateDocument = (patch: Partial<TimelineDocument>) => {
    applyTimeline((current) => ({ ...current, ...patch }))
  }

  const addAsset = (assetId: string, trackId?: string, startMs?: number) => {
    if (!timeline) return
    const asset = assets.get(assetId)
    if (!asset) {
      toast.message('That asset is not available in this workspace')
      return
    }
    if (asset.status !== 'READY') {
      toast.message('This asset is still processing', {
        description: 'Wait for probing to finish before adding it to the timeline.',
      })
      return
    }
    if (asset.kind === 'FONT') {
      toast.message('Fonts are applied to existing text clips in the inspector')
      return
    }

    let targetTrack: TimelineTrack | undefined
    if (trackId) {
      targetTrack = timeline.tracks.find((track) => track.id === trackId)
      if (targetTrack && (targetTrack.locked || !compatible(asset.kind, targetTrack.type))) {
        toast.error(`That asset cannot sit on ${targetTrack.name}`, {
          description:
            asset.kind === 'AUDIO'
              ? 'Audio belongs on an audio track.'
              : 'Video and images belong on a video or overlay track.',
        })
        return
      }
    }
    targetTrack ??= timeline.tracks.find(
      (track) => !track.locked && compatible(asset.kind, track.type)
    )
    if (!targetTrack) {
      toast.error('No compatible track is available')
      return
    }

    const resolvedStart = Math.max(0, Math.round(startMs ?? playheadRef.current))
    const clip = assetClip(asset, resolvedStart)
    setTimeline((current) =>
      current
        ? {
            ...current,
            tracks: current.tracks.map((track) =>
              track.id === targetTrack.id
                ? {
                    ...track,
                    clips: [...track.clips, clip].sort((a, b) => a.startMs - b.startMs),
                  }
                : track
            ),
          }
        : current
    )
    setSelectedClipId(clip.id)
    setDirty(true)
  }

  const addText = (preset: 'title' | 'caption' | 'lowerThird') => {
    if (!timeline) return
    let targetTrack = timeline.tracks.find(
      (track) => !track.locked && track.type === 'text' && track.name.toLowerCase().includes('title')
    )
    targetTrack ??= timeline.tracks.find((track) => !track.locked && track.type === 'text')
    const newTrackId = createId()
    const clip = textClip(preset, Math.max(0, Math.round(playheadRef.current)))
    if (!targetTrack) {
      targetTrack = {
        id: newTrackId,
        type: 'text',
        name: 'Titles',
        muted: false,
        locked: false,
        hidden: false,
        clips: [clip],
      }
      setTimeline((current) =>
        current ? { ...current, tracks: [...current.tracks, targetTrack as TimelineTrack] } : current
      )
    } else {
      const trackId = targetTrack.id
      setTimeline((current) =>
        current
          ? {
              ...current,
              tracks: current.tracks.map((track) =>
                track.id === trackId
                  ? { ...track, clips: [...track.clips, clip].sort((a, b) => a.startMs - b.startMs) }
                  : track
              ),
            }
          : current
      )
    }
    setSelectedClipId(clip.id)
    setDirty(true)
  }

  const moveClip = (clipId: string, startMs: number) => {
    updateClip(clipId, { startMs })
  }

  const trimClip = (
    clipId: string,
    patch: { startMs: number; durationMs: number; trimInMs: number }
  ) => {
    updateClip(clipId, patch)
  }

  const toggleTrack = (trackId: string, field: 'muted' | 'locked' | 'hidden') => {
    applyTimeline((current) => ({
      ...current,
      tracks: current.tracks.map((track) =>
        track.id === trackId ? { ...track, [field]: !track[field] } : track
      ),
    }))
  }

  const splitClip = () => {
    if (!timeline) return
    let located = selectedClipId ? findClip(timeline, selectedClipId) : null
    if (!located) {
      for (const track of timeline.tracks) {
        if (track.locked) continue
        const clip = track.clips.find(
          (candidate) =>
            playheadRef.current > candidate.startMs &&
            playheadRef.current < candidate.startMs + candidate.durationMs
        )
        if (clip) {
          located = { track, clip }
          break
        }
      }
    }
    if (!located) {
      toast.message('Select a clip or place the playhead over one')
      return
    }
    if (located.track.locked) {
      toast.message('This track is locked')
      return
    }
    const at = Math.round(playheadRef.current)
    const { track, clip } = located
    if (at <= clip.startMs + 99 || at >= clip.startMs + clip.durationMs - 99) {
      toast.message('Move the playhead inside the clip to split it')
      return
    }
    const left = { ...clip, durationMs: at - clip.startMs } as TimelineClip
    const right = {
      ...clip,
      id: createId(),
      startMs: at,
      durationMs: clip.startMs + clip.durationMs - at,
      trimInMs: clip.trimInMs + (at - clip.startMs),
    } as TimelineClip
    setTimeline((current) =>
      current
        ? {
            ...current,
            tracks: current.tracks.map((candidate) =>
              candidate.id === track.id
                ? {
                    ...candidate,
                    clips: candidate.clips.flatMap((item) =>
                      item.id === clip.id ? [left, right] : [item]
                    ),
                  }
                : candidate
            ),
          }
        : current
    )
    setSelectedClipId(right.id)
    setDirty(true)
  }

  const duplicateClip = () => {
    if (!timeline || !selectedClip || !selectedTrack) return
    if (selectedTrack.locked) {
      toast.message('This track is locked')
      return
    }
    const copy = {
      ...selectedClip,
      id: createId(),
      startMs: selectedClip.startMs + selectedClip.durationMs,
    } as TimelineClip
    setTimeline((current) =>
      current
        ? {
            ...current,
            tracks: current.tracks.map((track) =>
              track.id === selectedTrack.id
                ? { ...track, clips: [...track.clips, copy].sort((a, b) => a.startMs - b.startMs) }
                : track
            ),
          }
        : current
    )
    setSelectedClipId(copy.id)
    setDirty(true)
  }

  const deleteClip = () => {
    if (!timeline || !selectedClipId) return
    const located = findClip(timeline, selectedClipId)
    if (located?.track.locked) {
      toast.message('This track is locked')
      return
    }
    setTimeline((current) =>
      current
        ? {
            ...current,
            tracks: current.tracks.map((track) => ({
              ...track,
              clips: track.clips.filter((clip) => clip.id !== selectedClipId),
            })),
          }
        : current
    )
    setSelectedClipId(null)
    setDirty(true)
  }

  const saveBeforeExport = async () => {
    if (preview) throw new Error('Sign in to export a real project')
    if (!dirty) return versionRef.current
    const result = await saveMutation.mutateAsync()
    return result.version
  }

  const shortcuts = React.useRef({
    save: requestSave,
    split: splitClip,
    remove: deleteClip,
    togglePlay,
  })
  shortcuts.current = {
    save: requestSave,
    split: splitClip,
    remove: deleteClip,
    togglePlay,
  }

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (typing) return

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        shortcuts.current.save()
        return
      }
      if (event.code === 'Space') {
        event.preventDefault()
        shortcuts.current.togglePlay()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        shortcuts.current.remove()
        return
      }
      if (event.key.toLowerCase() === 's' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        shortcuts.current.split()
        return
      }
      if (event.key === 'Escape') setSelectedClipId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (projectQuery.isLoading || (!timeline && (!projectQuery.isError || preview))) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#08090c] text-white">
        <div className="text-center">
          <Logo showWordmark={false} className="mx-auto" />
          <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-[#8ff3d4]" />
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">
            Loading studio
          </p>
        </div>
      </div>
    )
  }

  if (projectQuery.isError && !preview) {
    const notFound = projectError?.status === 404
    const forbidden = projectError?.status === 403
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#08090c] px-6 text-white">
        <div className="max-w-md text-center">
          <Logo showWordmark={false} className="mx-auto" />
          <h1 className="mt-6 text-2xl font-semibold tracking-[-0.02em]">
            {notFound ? 'Project not found' : forbidden ? 'No access to this project' : 'Studio unavailable'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/45">
            {notFound
              ? 'It may have been deleted, or the link belongs to another workspace.'
              : forbidden
                ? 'Ask a workspace owner or admin for an editor seat.'
                : projectError?.message ?? 'The API did not respond. Check that it is running and try again.'}
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button asChild variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/10">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
            <Button onClick={() => void projectQuery.refetch()}>Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!timeline) return null

  const libraryNode = (
    <EditorLibrary
      assets={assetList}
      sample={preview}
      loading={mediaQuery.isLoading && !preview}
      onAddAsset={(assetId) => {
        addAsset(assetId)
        setMobilePanel(null)
      }}
      onAddText={(preset) => {
        addText(preset)
        setMobilePanel(null)
      }}
    />
  )

  const inspectorNode = (
    <EditorInspector
      document={timeline}
      clip={selectedClip}
      assets={assets}
      locked={selectedTrack?.locked ?? false}
      onUpdateClip={updateSelectedClip}
      onUpdateDocument={updateDocument}
      onDelete={deleteClip}
      onDuplicate={duplicateClip}
      onSplit={splitClip}
    />
  )

  const savedLabel = preview
    ? 'Sample · not saved'
    : saveMutation.isPending
      ? 'Saving…'
      : conflict
        ? 'Version conflict'
        : dirty
          ? 'Unsaved changes'
          : lastSavedAt
            ? `Saved ${timeAgo(lastSavedAt.toISOString())}`
            : 'Saved'

  return (
    <div className="flex h-[100dvh] select-none flex-col overflow-hidden bg-[#08090c] text-white">
      <h1 className="sr-only">Video editor — {title || 'Untitled project'}</h1>
      <header className="flex h-12 shrink-0 items-center gap-1.5 border-b border-white/10 bg-[#0b0d11] px-2 sm:gap-2 sm:px-3">
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="text-white/50 hover:bg-white/10 hover:text-white"
        >
          <Link href="/dashboard" aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Link href="/" aria-label="FrameForge home" className="flex items-center gap-1.5">
          <Logo showWordmark={false} markClassName="h-7 w-7 rounded-lg" />
          <span className="hidden text-[12px] font-semibold tracking-[-0.02em] text-white/80 sm:inline">
            FrameForge
          </span>
        </Link>
        <ChevronRight className="hidden h-3 w-3 text-white/20 sm:block" />
        <input
          value={title}
          readOnly={preview}
          aria-label="Project title"
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              setTitle(projectQuery.data?.title ?? 'Untitled project')
              event.currentTarget.blur()
            }
          }}
          className={cn(
            'h-7 w-[min(32vw,260px)] rounded border border-transparent bg-transparent px-1.5 text-[11px] text-white/85 outline-none transition-colors hover:border-white/10 focus:border-[#8ff3d4]/40 focus:bg-white/[0.03] sm:w-[min(38vw,260px)]',
            preview && 'cursor-default'
          )}
        />
        {preview ? (
          <span className="hidden rounded border border-[#ffc36b]/25 bg-[#ffc36b]/10 px-1.5 py-px font-mono text-[8px] uppercase tracking-[0.1em] text-[#ffc36b] sm:inline">
            Sample
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-1.5">
          <span
            className={cn(
              'mr-1 hidden items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] sm:flex',
              conflict
                ? 'text-[#ffc36b]'
                : dirty
                  ? 'text-white/45'
                  : 'text-[#8ff3d4]/60'
            )}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : conflict ? (
              <TriangleAlert className="h-2.5 w-2.5" />
            ) : dirty ? (
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffc36b]" />
            ) : (
              <Check className="h-2.5 w-2.5" />
            )}
            {savedLabel}
          </span>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open media library panel"
            onClick={() => setMobilePanel((current) => (current === 'assets' ? null : 'assets'))}
            className="text-white/45 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open inspector panel"
            onClick={() => setMobilePanel((current) => (current === 'inspector' ? null : 'inspector'))}
            className="text-white/45 hover:bg-white/10 hover:text-white xl:hidden"
          >
            <PanelRight className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={requestSave}
            disabled={!preview && (!dirty || saveMutation.isPending)}
            aria-label="Save project"
            className="h-7 border-white/10 bg-transparent px-2 text-[9px] text-white/60 hover:bg-white/10 hover:text-white"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (preview) {
                notifySample()
                return
              }
              setExportOpen(true)
            }}
            aria-label="Export project"
            className="h-7 bg-[#8ff3d4] px-2 text-[9px] text-[#06211b] hover:bg-[#b8f7e4] sm:px-2.5"
          >
            <Upload className="h-3 w-3 rotate-180" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </header>

      {conflict ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#ffc36b]/25 bg-[#ffc36b]/[0.08] px-3 py-1.5 text-[10px] text-[#ffd89a]">
          <TriangleAlert className="h-3 w-3" />
          <span>
            This project changed elsewhere
            {conflict.currentVersion ? ` (server v${conflict.currentVersion})` : ''}. Reload the
            latest timeline before saving again.
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void reloadLatest()}
              className="h-6 border-[#ffc36b]/25 bg-transparent px-2 text-[9px] text-[#ffd89a] hover:bg-[#ffc36b]/10"
            >
              Reload latest
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setConflict(null)}
              aria-label="Dismiss conflict"
              className="h-6 w-6 text-[#ffd89a]/70 hover:bg-[#ffc36b]/10"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[10px] text-white/40">
          <CloudOff className="h-3 w-3 text-[#ffc36b]/70" />
          <span>
            You are editing a labeled sample project. Save and export require an authenticated
            workspace.
          </span>
          <Link href="/auth/sign-in" className="ml-auto text-[#8ff3d4] hover:underline">
            Sign in to create a real project
          </Link>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden w-[248px] shrink-0 lg:block">{libraryNode}</div>

        <main className="flex min-w-0 flex-1 flex-col">
          <EditorPreview
            document={timeline}
            playheadMs={playheadMs}
            isPlaying={isPlaying}
            assets={assets}
            sample={preview}
            onTogglePlay={togglePlay}
            onSeek={seek}
          />
          <EditorTimeline
            document={timeline}
            assets={assets}
            selectedClipId={selectedClipId}
            playheadMs={playheadMs}
            pixelsPerSecond={pixelsPerSecond}
            onPixelsPerSecond={setPixelsPerSecond}
            onSeek={seek}
            onSelectClip={setSelectedClipId}
            onMoveClip={moveClip}
            onTrimClip={trimClip}
            onDropAsset={(assetId, trackId, startMs) => addAsset(assetId, trackId, startMs)}
            onToggleTrack={toggleTrack}
            onSplit={splitClip}
            onDuplicate={duplicateClip}
            onDelete={deleteClip}
          />
        </main>

        <div className="hidden w-[280px] shrink-0 xl:block">{inspectorNode}</div>
      </div>

      {mobilePanel ? (
        <>
          <button
            type="button"
            aria-label="Close side panel"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobilePanel(null)}
          />
          <div
            className={cn(
              'fixed inset-y-0 z-50 w-[280px] shadow-2xl',
              mobilePanel === 'assets' ? 'left-0' : 'right-0'
            )}
          >
            {mobilePanel === 'assets' ? libraryNode : inspectorNode}
          </div>
        </>
      ) : null}

      <EditorExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        projectId={projectId}
        timeline={timeline}
        dirty={dirty}
        sample={preview}
        saveBeforeExport={saveBeforeExport}
      />

    </div>
  )
}
