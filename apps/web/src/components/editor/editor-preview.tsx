'use client'

import * as React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Grid2X2,
  Image as ImageIcon,
  LayoutTemplate,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import {
  FONT_FAMILIES,
  timelineDurationMs,
  type TimelineClip,
  type TimelineDocument,
} from '@frameforge/shared'
import type { MediaAsset } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn, formatClock } from '@/lib/utils'

function fadeMultiplier(
  clip: Pick<TimelineClip, 'startMs' | 'durationMs' | 'fadeInMs' | 'fadeOutMs'>,
  playheadMs: number
) {
  const local = playheadMs - clip.startMs
  let factor = 1
  if (clip.fadeInMs > 0 && local < clip.fadeInMs) factor = Math.min(factor, local / clip.fadeInMs)
  const remaining = clip.durationMs - local
  if (clip.fadeOutMs > 0 && remaining < clip.fadeOutMs) {
    factor = Math.min(factor, remaining / clip.fadeOutMs)
  }
  return Math.max(0, Math.min(1, factor))
}

const layerPriority: Record<string, number> = { video: 0, overlay: 1, text: 2, audio: 3 }

export function EditorPreview({
  document: timeline,
  playheadMs,
  isPlaying,
  assets,
  sample,
  onTogglePlay,
  onSeek,
}: {
  document: TimelineDocument
  playheadMs: number
  isPlaying: boolean
  assets: Map<string, MediaAsset>
  sample: boolean
  onTogglePlay: () => void
  onSeek: (ms: number) => void
}) {
  const [guides, setGuides] = React.useState(false)
  const durationMs = Math.max(1000, timelineDurationMs(timeline))
  const atEnd = playheadMs >= durationMs - 10

  const activeClips = React.useMemo(() => {
    const result: Array<{ clip: TimelineClip; layer: number }> = []
    for (const track of timeline.tracks) {
      if (track.hidden || track.type === 'audio') continue
      for (const clip of track.clips) {
        if (playheadMs >= clip.startMs && playheadMs < clip.startMs + clip.durationMs) {
          result.push({ clip, layer: layerPriority[track.type] ?? 0 })
        }
      }
    }
    return result.sort((a, b) => a.layer - b.layer)
  }, [timeline.tracks, playheadMs])

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#08090c]">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
            Composition preview
          </span>
          {sample ? (
            <span className="rounded border border-[#ffc36b]/25 bg-[#ffc36b]/10 px-1.5 py-px font-mono text-[8px] uppercase tracking-[0.1em] text-[#ffc36b]">
              Sample project
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-pressed={guides}
            aria-label="Toggle safe guides"
            onClick={() => setGuides((value) => !value)}
            className={cn('text-white/40 hover:bg-white/10 hover:text-white', guides && 'bg-white/10 text-white')}
          >
            <LayoutTemplate className="h-3 w-3" />
          </Button>
          <span className="ml-1 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-white/35">
            {timeline.aspectRatio} · {timeline.fps}fps
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-5">
        <div
          className="relative max-h-full w-full overflow-hidden rounded-md bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
          style={{
            aspectRatio: `${timeline.width} / ${timeline.height}`,
            maxWidth:
              timeline.width >= timeline.height
                ? '100%'
                : `calc((100vh - 330px) * ${timeline.width / timeline.height})`,
            backgroundColor: timeline.background,
            containerType: 'inline-size',
          }}
        >
          {activeClips.length === 0 ? (
            <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.05),transparent_60%)]">
              <div className="px-6 text-center">
                <Film className="mx-auto h-6 w-6 text-white/20" />
                <p className="mt-2 text-[11px] text-white/40">
                  {timeline.tracks.some((track) => track.clips.length > 0)
                    ? 'No visual clips at this time'
                    : 'Drop media on a track, or add a title'}
                </p>
                <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-white/20">
                  {formatClock(playheadMs)} / {formatClock(durationMs)}
                </p>
              </div>
            </div>
          ) : (
            activeClips.map(({ clip, layer }) => {
              if (clip.kind === 'text') {
                const opacity = clip.opacity * fadeMultiplier(clip, playheadMs)
                return (
                  <div
                    key={clip.id}
                    className="pointer-events-none absolute z-20"
                    style={{
                      left: `${clip.xPercent}%`,
                      top: `${clip.yPercent}%`,
                      maxWidth: `${clip.maxWidthPercent}%`,
                      transform: 'translate(-50%, -50%)',
                      opacity,
                    }}
                  >
                    <div
                      style={{
                        color: clip.color,
                        fontFamily: FONT_FAMILIES[clip.fontFamily].stack,
                        fontSize: `${(clip.fontSize / timeline.width) * 100}cqw`,
                        fontWeight: clip.bold ? 700 : 400,
                        textAlign: clip.align,
                        lineHeight: 1.12,
                        letterSpacing: '-0.01em',
                        background: clip.background ?? 'transparent',
                        padding: clip.background ? '0.35em 0.55em' : 0,
                        borderRadius: clip.background ? '0.25em' : 0,
                        whiteSpace: 'pre-wrap',
                        textShadow: '0 2px 18px rgba(0,0,0,0.45)',
                      }}
                    >
                      {clip.text}
                    </div>
                  </div>
                )
              }

              const asset = assets.get(clip.assetId)
              const opacity = clip.opacity * fadeMultiplier(clip, playheadMs)
              return (
                <div
                  key={clip.id}
                  className="pointer-events-none absolute inset-0"
                  style={{
                    zIndex: 5 + layer,
                    opacity,
                    transform: 'scale' in clip && clip.kind === 'image' ? `scale(${clip.scale})` : undefined,
                  }}
                >
                  {asset?.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.previewUrl}
                      alt=""
                      className="h-full w-full"
                      style={{ objectFit: clip.kind === 'video' || clip.kind === 'image' ? clip.fit : 'cover' }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#101b2b,#1b3644_45%,#0d1016)]">
                      <div className="absolute inset-0 clip-stripes opacity-15" />
                      <div className="absolute inset-0 grid place-items-center">
                        {clip.kind === 'image' ? (
                          <ImageIcon className="h-6 w-6 text-white/20" />
                        ) : (
                          <Film className="h-6 w-6 text-white/20" />
                        )}
                      </div>
                    </div>
                  )}
                  {clip.kind === 'video' && asset ? (
                    <span className="absolute bottom-2 left-2 rounded bg-black/45 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.1em] text-white/50 backdrop-blur">
                      Poster · {asset.originalName}
                    </span>
                  ) : null}
                </div>
              )
            })
          )}

          {guides ? (
            <div className="pointer-events-none absolute inset-0 z-30">
              <div className="absolute inset-[5%] border border-white/20" />
              <div className="absolute inset-[10%] border border-white/10" />
              <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
              <div className="absolute left-0 top-1/2 h-px w-full bg-white/10" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Go to start"
            onClick={() => onSeek(0)}
            className="text-white/55 hover:bg-white/10 hover:text-white"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back one second"
            onClick={() => onSeek(Math.max(0, playheadMs - 1000))}
            className="text-white/55 hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon-sm"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
            className="h-8 w-8 rounded-full border border-white/15 bg-white/10 text-white shadow-none hover:bg-white/20"
          >
            {isPlaying && !atEnd ? (
              <Pause className="h-3.5 w-3.5" fill="currentColor" />
            ) : (
              <Play className="h-3.5 w-3.5 translate-x-px" fill="currentColor" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Forward one second"
            onClick={() => onSeek(Math.min(durationMs, playheadMs + 1000))}
            className="text-white/55 hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Go to end"
            onClick={() => onSeek(durationMs)}
            className="text-white/55 hover:bg-white/10 hover:text-white"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
          <span className="ml-2 font-mono text-[10px] tabular-nums text-white/55">
            {formatClock(playheadMs)}
            <span className="text-white/25"> / {formatClock(durationMs)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-white/25">
          <Grid2X2 className="h-2.5 w-2.5" />
          <span>Space to play · S to split</span>
        </div>
      </div>
    </div>
  )
}
