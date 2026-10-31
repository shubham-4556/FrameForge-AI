'use client'

import * as React from 'react'
import {
  Copy,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Lock,
  LockOpen,
  Music,
  Scissors,
  Trash2,
  Type,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { MediaAsset } from '@/lib/types'
import {
  timelineDurationMs,
  type TimelineClip,
  type TimelineDocument,
  type TimelineTrack,
} from '@frameforge/shared'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const TRACK_HEIGHT = 56
const RULER_HEIGHT = 28
const HEADER_WIDTH = 132

const trackMeta: Record<
  TimelineTrack['type'],
  { label: string; icon: typeof Film; accent: string; clip: string }
> = {
  video: {
    label: 'Video',
    icon: Film,
    accent: 'text-[#8ff3d4]',
    clip: 'border-[#49b99a]/50 bg-[#123b35]/85 text-[#b8f7e4]',
  },
  overlay: {
    label: 'Overlay',
    icon: ImageIcon,
    accent: 'text-[#8fb8ff]',
    clip: 'border-[#5b83d6]/50 bg-[#16263f]/85 text-[#c4d8ff]',
  },
  audio: {
    label: 'Audio',
    icon: Music,
    accent: 'text-[#ffc36b]',
    clip: 'border-[#c38a3e]/50 bg-[#3a2a16]/85 text-[#ffe0a8]',
  },
  text: {
    label: 'Text',
    icon: Type,
    accent: 'text-[#ff9ec4]',
    clip: 'border-[#c4558a]/50 bg-[#3a1830]/85 text-[#ffd0e4]',
  },
}

function msToPx(ms: number, pixelsPerSecond: number) {
  return (ms / 1000) * pixelsPerSecond
}

function pxToMs(px: number, pixelsPerSecond: number) {
  return (px / pixelsPerSecond) * 1000
}

function snap(ms: number) {
  return Math.max(0, Math.round(ms / 50) * 50)
}

function clipLabel(clip: TimelineClip, assets: Map<string, MediaAsset>) {
  if (clip.kind === 'text') return clip.text
  return assets.get(clip.assetId)?.originalName ?? `${clip.kind} clip`
}

export function EditorTimeline({
  document: timeline,
  assets,
  selectedClipId,
  playheadMs,
  pixelsPerSecond,
  onPixelsPerSecond,
  onSeek,
  onSelectClip,
  onMoveClip,
  onTrimClip,
  onDropAsset,
  onToggleTrack,
  onSplit,
  onDuplicate,
  onDelete,
}: {
  document: TimelineDocument
  assets: Map<string, MediaAsset>
  selectedClipId: string | null
  playheadMs: number
  pixelsPerSecond: number
  onPixelsPerSecond: (value: number) => void
  onSeek: (ms: number) => void
  onSelectClip: (id: string | null) => void
  onMoveClip: (id: string, startMs: number) => void
  onTrimClip: (
    id: string,
    patch: { startMs: number; durationMs: number; trimInMs: number }
  ) => void
  onDropAsset: (assetId: string, trackId: string, startMs: number) => void
  onToggleTrack: (trackId: string, field: 'muted' | 'locked' | 'hidden') => void
  onSplit: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const rulerRef = React.useRef<HTMLDivElement>(null)
  const cleanupRef = React.useRef<(() => void) | null>(null)
  const [scrubbing, setScrubbing] = React.useState(false)

  React.useEffect(
    () => () => {
      cleanupRef.current?.()
    },
    []
  )

  const durationMs = timelineDurationMs(timeline)
  const timelineMs = Math.max(30_000, durationMs + 10_000)
  const contentWidth = msToPx(timelineMs, pixelsPerSecond) + 200
  const tickStep =
    pixelsPerSecond >= 80 ? 1000 : pixelsPerSecond >= 45 ? 2000 : pixelsPerSecond >= 22 ? 5000 : 10_000

  const ticks = React.useMemo(() => {
    const result: number[] = []
    for (let ms = 0; ms <= timelineMs; ms += tickStep) result.push(ms)
    return result
  }, [tickStep, timelineMs])

  const seekFromClientX = (clientX: number) => {
    const element = rulerRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    const next = Math.max(0, Math.min(timelineMs, pxToMs(clientX - rect.left, pixelsPerSecond)))
    onSeek(snap(next))
  }

  const beginScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    setScrubbing(true)
    seekFromClientX(event.clientX)
    const move = (moveEvent: PointerEvent) => seekFromClientX(moveEvent.clientX)
    const end = () => {
      setScrubbing(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      cleanupRef.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    cleanupRef.current = end
  }

  const beginClipInteraction = (
    event: React.PointerEvent,
    mode: 'move' | 'trim-start' | 'trim-end',
    clip: TimelineClip,
    track: TimelineTrack
  ) => {
    event.preventDefault()
    event.stopPropagation()
    onSelectClip(clip.id)
    if (track.locked) return

    const startX = event.clientX
    const origin = {
      startMs: clip.startMs,
      durationMs: clip.durationMs,
      trimInMs: clip.trimInMs,
    }
    const move = (moveEvent: PointerEvent) => {
      const delta = snap(pxToMs(moveEvent.clientX - startX, pixelsPerSecond))
      if (mode === 'move') {
        onMoveClip(clip.id, Math.max(0, origin.startMs + delta))
        return
      }
      if (mode === 'trim-start') {
        const nextStart = Math.max(0, origin.startMs + delta)
        const deltaStart = nextStart - origin.startMs
        const nextDuration = Math.max(100, origin.durationMs - deltaStart)
        onTrimClip(clip.id, {
          startMs: nextStart,
          durationMs: nextDuration,
          trimInMs: Math.max(0, origin.trimInMs + deltaStart),
        })
        return
      }
      onTrimClip(clip.id, {
        startMs: origin.startMs,
        durationMs: Math.max(100, origin.durationMs + delta),
        trimInMs: origin.trimInMs,
      })
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      cleanupRef.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    cleanupRef.current = end
  }

  return (
    <section className="flex min-h-0 flex-col border-t border-white/10 bg-[#08090c]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="mr-2 hidden font-mono text-[9px] uppercase tracking-[0.14em] text-white/35 sm:inline">
            Timeline
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onSplit}
                disabled={!selectedClipId}
                aria-label="Split clip at playhead"
                className="text-white/60 hover:bg-white/10 hover:text-white"
              >
                <Scissors className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split at playhead · S</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onDuplicate}
                disabled={!selectedClipId}
                aria-label="Duplicate clip"
                className="text-white/60 hover:bg-white/10 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate clip</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onDelete}
                disabled={!selectedClipId}
                aria-label="Delete clip"
                className="text-white/60 hover:bg-white/10 hover:text-[#ff9a9a]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete clip · ⌫</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">
            {ticks.length > 0 ? `${Math.round(timelineMs / 1000)}s canvas` : ''}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom out"
              className="text-white/50 hover:bg-white/10 hover:text-white"
              onClick={() => onPixelsPerSecond(Math.max(16, pixelsPerSecond - 8))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <input
              type="range"
              min={16}
              max={160}
              step={4}
              value={pixelsPerSecond}
              onChange={(event) => onPixelsPerSecond(Number(event.target.value))}
              aria-label="Timeline zoom"
              className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/15 accent-[hsl(var(--brand))]"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom in"
              className="text-white/50 hover:bg-white/10 hover:text-white"
              onClick={() => onPixelsPerSecond(Math.min(160, pixelsPerSecond + 8))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className="shrink-0 border-r border-white/10 bg-[#0b0d11]"
          style={{ width: HEADER_WIDTH }}
        >
          <div
            className="flex items-center border-b border-white/10 px-3 font-mono text-[8px] uppercase tracking-[0.16em] text-white/30"
            style={{ height: RULER_HEIGHT }}
          >
            Tracks
          </div>
          {timeline.tracks.map((track) => {
            const meta = trackMeta[track.type]
            const Icon = meta.icon
            return (
              <div
                key={track.id}
                className="flex items-center gap-1 border-b border-white/[0.06] px-2"
                style={{ height: TRACK_HEIGHT }}
              >
                <Icon className={cn('h-3 w-3 shrink-0', meta.accent)} />
                <span className="min-w-0 flex-1 truncate text-[9px] text-white/55">{track.name}</span>
                <button
                  type="button"
                  onClick={() => onToggleTrack(track.id, 'muted')}
                  aria-label={track.muted ? `Unmute ${track.name}` : `Mute ${track.name}`}
                  className={cn(
                    'grid h-5 w-5 place-items-center rounded text-white/35 hover:bg-white/10 hover:text-white',
                    track.muted && 'text-[#ff9a9a]'
                  )}
                >
                  {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleTrack(track.id, 'hidden')}
                  aria-label={track.hidden ? `Show ${track.name}` : `Hide ${track.name}`}
                  className={cn(
                    'grid h-5 w-5 place-items-center rounded text-white/35 hover:bg-white/10 hover:text-white',
                    track.hidden && 'text-[#ffc36b]'
                  )}
                >
                  {track.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleTrack(track.id, 'locked')}
                  aria-label={track.locked ? `Unlock ${track.name}` : `Lock ${track.name}`}
                  className={cn(
                    'grid h-5 w-5 place-items-center rounded text-white/35 hover:bg-white/10 hover:text-white',
                    track.locked && 'text-[#8fb8ff]'
                  )}
                >
                  {track.locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                </button>
              </div>
            )
          })}
        </div>

        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
          <div className="relative" style={{ width: contentWidth }}>
            <div
              ref={rulerRef}
              onPointerDown={beginScrub}
              role="slider"
              tabIndex={0}
              aria-label="Timeline playhead"
              aria-valuemin={0}
              aria-valuemax={Math.round(timelineMs)}
              aria-valuenow={Math.round(playheadMs)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight') onSeek(snap(playheadMs + 1000))
                if (event.key === 'ArrowLeft') onSeek(snap(playheadMs - 1000))
              }}
              className={cn(
                'relative cursor-ew-resize border-b border-white/10 bg-[#0b0d11] select-none',
                scrubbing && 'cursor-grabbing'
              )}
              style={{ height: RULER_HEIGHT }}
            >
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className="absolute top-0 h-full border-l border-white/10"
                  style={{ left: msToPx(tick, pixelsPerSecond) }}
                >
                  <span className="absolute left-1.5 top-1 font-mono text-[8px] tabular-nums text-white/30">
                    {Math.floor(tick / 60_000)}:{String(Math.floor((tick % 60_000) / 1000)).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>

            {timeline.tracks.map((track) => (
              <div
                key={track.id}
                className={cn(
                  'relative border-b border-white/[0.06]',
                  track.type === 'audio' ? 'bg-[#0d1015]/60' : 'bg-[#0b0d11]'
                )}
                style={{ height: TRACK_HEIGHT }}
                onDragOver={(event) => {
                  if (!track.locked) event.preventDefault()
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  if (track.locked) return
                  const assetId = event.dataTransfer.getData('application/x-frameforge-asset')
                  if (!assetId) return
                  const rect = event.currentTarget.getBoundingClientRect()
                  onDropAsset(assetId, track.id, snap(pxToMs(event.clientX - rect.left, pixelsPerSecond)))
                }}
                onClick={(event) => {
                  if (event.target === event.currentTarget) onSelectClip(null)
                }}
              >
                {track.clips.map((clip) => {
                  const asset = clip.kind === 'text' ? null : assets.get(clip.assetId)
                  const meta = trackMeta[track.type]
                  const Icon = clip.kind === 'audio' ? Music : clip.kind === 'text' ? Type : clip.kind === 'image' ? ImageIcon : Film
                  const selected = selectedClipId === clip.id
                  return (
                    <div
                      key={clip.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${clip.kind} clip ${clipLabel(clip, assets)}`}
                      onPointerDown={(event) => beginClipInteraction(event, 'move', clip, track)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') onSelectClip(clip.id)
                      }}
                      className={cn(
                        'group absolute top-1.5 flex cursor-grab items-center gap-1.5 overflow-hidden rounded-[5px] border px-1.5 text-left shadow-[0_2px_10px_-4px_rgba(0,0,0,0.8)] select-none',
                        meta.clip,
                        selected && 'z-20 ring-2 ring-[#8ff3d4] ring-offset-1 ring-offset-[#0b0d11]',
                        track.locked && 'cursor-not-allowed opacity-70',
                        clip.kind === 'text' && 'border-dashed'
                      )}
                      style={{
                        left: msToPx(clip.startMs, pixelsPerSecond),
                        width: Math.max(14, msToPx(clip.durationMs, pixelsPerSecond)),
                        height: TRACK_HEIGHT - 12,
                        opacity: clip.opacity,
                      }}
                    >
                      {asset?.previewUrl ? (
                        <span
                          className="absolute inset-0 bg-cover bg-center opacity-20"
                          style={{ backgroundImage: `url(${asset.previewUrl})` }}
                        />
                      ) : null}
                      {clip.kind === 'audio' ? (
                        <span className="absolute inset-x-1 top-1/2 flex -translate-y-1/2 items-center gap-px opacity-35">
                          {Array.from({ length: 60 }).map((_, index) => (
                            <span
                              key={index}
                              className="w-px shrink-0 rounded-full bg-current"
                              style={{ height: `${3 + ((index * 7) % 18)}px` }}
                            />
                          ))}
                        </span>
                      ) : null}
                      <Icon className="relative h-2.5 w-2.5 shrink-0 opacity-80" />
                      <span className="relative truncate text-[9px] font-medium">
                        {clipLabel(clip, assets)}
                      </span>
                      {selected && !track.locked ? (
                        <>
                          <span
                            role="separator"
                            aria-label="Trim clip start"
                            onPointerDown={(event) => beginClipInteraction(event, 'trim-start', clip, track)}
                            className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-white/25 opacity-0 transition-opacity group-hover:opacity-100"
                          />
                          <span
                            role="separator"
                            aria-label="Trim clip end"
                            onPointerDown={(event) => beginClipInteraction(event, 'trim-end', clip, track)}
                            className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-white/25 opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </>
                      ) : null}
                    </div>
                  )
                })}
                {track.locked ? (
                  <span className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,rgba(255,255,255,0.02)_8px,rgba(255,255,255,0.02)_16px)]" />
                ) : null}
              </div>
            ))}

            <div
              className="pointer-events-none absolute top-0 z-30 w-px bg-[#8ff3d4] shadow-[0_0_10px_rgba(143,243,212,0.5)]"
              style={{
                left: msToPx(playheadMs, pixelsPerSecond),
                height: RULER_HEIGHT + timeline.tracks.length * TRACK_HEIGHT,
              }}
            >
              <span className="absolute -left-[5px] top-0 h-2.5 w-2.5 rotate-45 rounded-[2px] bg-[#8ff3d4]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
