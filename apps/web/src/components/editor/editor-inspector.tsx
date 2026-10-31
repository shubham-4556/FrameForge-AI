'use client'

import type { ReactNode } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Copy,
  Film,
  Image as ImageIcon,
  Lock,
  Music,
  Scissors,
  Trash2,
  Type,
} from 'lucide-react'
import {
  FONT_FAMILIES,
  type TimelineClip,
  type TimelineDocument,
} from '@frameforge/shared'
import type { MediaAsset } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { cn, formatBytes, formatClock } from '@/lib/utils'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] uppercase tracking-[0.12em] text-white/40">{label}</Label>
        {hint ? <span className="font-mono text-[8px] text-white/30">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

const inputClass =
  'h-7 border-white/10 bg-white/[0.04] text-[11px] text-white placeholder:text-white/25 focus-visible:ring-[#8ff3d4]/40'
const selectClass =
  'h-7 w-full rounded-md border border-white/10 bg-[#111319] px-2 text-[11px] text-white/80 outline-none focus:border-[#8ff3d4]/40'

const kindMeta = {
  text: { label: 'Text clip', icon: Type },
  video: { label: 'Video clip', icon: Film },
  image: { label: 'Image clip', icon: ImageIcon },
  audio: { label: 'Audio clip', icon: Music },
}

export function EditorInspector({
  document: timeline,
  clip,
  assets,
  locked,
  onUpdateClip,
  onUpdateDocument,
  onDelete,
  onDuplicate,
  onSplit,
}: {
  document: TimelineDocument
  clip: TimelineClip | null
  assets: Map<string, MediaAsset>
  locked: boolean
  onUpdateClip: (patch: Record<string, unknown>) => void
  onUpdateDocument: (patch: Partial<TimelineDocument>) => void
  onDelete: () => void
  onDuplicate: () => void
  onSplit: () => void
}) {
  if (!clip) {
    const clipCount = timeline.tracks.reduce((sum, track) => sum + track.clips.length, 0)
    return (
      <aside className="flex h-full w-full flex-col overflow-y-auto border-l border-white/10 bg-[#0b0d11]">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">Inspector</p>
          <p className="mt-1 text-[11px] text-white/60">Project canvas</p>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Ratio', timeline.aspectRatio],
              ['FPS', `${timeline.fps}`],
              ['Canvas', `${timeline.width} × ${timeline.height}`],
              ['Clips', `${clipCount}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5">
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/30">{label}</p>
                <p className="mt-1 font-mono text-[11px] text-white/70">{value}</p>
              </div>
            ))}
          </div>

          <Field label="Background">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={timeline.background}
                onChange={(event) => onUpdateDocument({ background: event.target.value })}
                className="h-7 w-10 cursor-pointer rounded border border-white/10 bg-transparent p-0.5"
                aria-label="Canvas background color"
              />
              <Input
                value={timeline.background}
                onChange={(event) => {
                  const value = event.target.value
                  if (/^#[0-9a-fA-F]{6}$/.test(value)) onUpdateDocument({ background: value })
                }}
                className={inputClass}
                aria-label="Background hex value"
              />
            </div>
          </Field>

          <Field label="Tracks" hint={`${timeline.tracks.length} total`}>
            <div className="space-y-1.5">
              {timeline.tracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5"
                >
                  <span className="truncate text-[10px] text-white/55">{track.name}</span>
                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-white/25">
                    {track.clips.length} clip{track.clips.length === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </div>
          </Field>

          <p className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5 text-[10px] leading-relaxed text-white/35">
            Select a clip on the timeline to edit its properties. Drag clip edges to trim, and drag
            media from the library onto any compatible track.
          </p>
        </div>
      </aside>
    )
  }

  const meta = kindMeta[clip.kind]
  const Icon = meta.icon
  const asset = clip.kind === 'text' ? null : assets.get(clip.assetId)
  const seconds = (ms: number) => (Math.round(ms / 100) / 10).toFixed(1)

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-l border-white/10 bg-[#0b0d11]">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0b0d11]/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded border border-white/10 bg-white/[0.04] text-[#8ff3d4]">
            <Icon className="h-3 w-3" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-white/80">{meta.label}</p>
            <p className="truncate text-[9px] text-white/35">
              {clip.kind === 'text' ? clip.text : asset?.originalName ?? 'Asset'}
            </p>
          </div>
          {locked ? <Lock className="h-3 w-3 text-[#8fb8ff]" /> : null}
        </div>
      </div>

      {locked ? (
        <p className="mx-4 mt-3 rounded-lg border border-[#8fb8ff]/20 bg-[#8fb8ff]/[0.06] px-2.5 py-2 text-[10px] text-[#b7d0ff]">
          This track is locked. Unlock it in the timeline header to edit clips.
        </p>
      ) : null}

      <div className={cn('space-y-4 p-4', locked && 'pointer-events-none opacity-45')}>
        {clip.kind === 'text' ? (
          <>
            <Field label="Text">
              <textarea
                value={clip.text}
                rows={3}
                maxLength={500}
                onChange={(event) => onUpdateClip({ text: event.target.value })}
                className="w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] leading-relaxed text-white outline-none focus:border-[#8ff3d4]/40"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Font">
                <select
                  value={clip.fontFamily}
                  onChange={(event) => onUpdateClip({ fontFamily: event.target.value })}
                  className={selectClass}
                >
                  {Object.entries(FONT_FAMILIES).map(([key, font]) => (
                    <option key={key} value={key}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Role">
                <select
                  value={clip.role}
                  onChange={(event) => onUpdateClip({ role: event.target.value })}
                  className={selectClass}
                >
                  <option value="title">Title</option>
                  <option value="caption">Caption</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Size" hint="px">
                <Input
                  type="number"
                  min={12}
                  max={220}
                  value={clip.fontSize}
                  onChange={(event) =>
                    onUpdateClip({ fontSize: Math.max(12, Math.min(220, Number(event.target.value) || 12)) })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Color">
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={clip.color}
                    onChange={(event) => onUpdateClip({ color: event.target.value })}
                    className="h-7 w-9 cursor-pointer rounded border border-white/10 bg-transparent p-0.5"
                    aria-label="Text color"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateClip({ bold: !clip.bold })}
                    className={cn(
                      'h-7 flex-1 rounded-md border text-[10px] font-semibold',
                      clip.bold
                        ? 'border-[#8ff3d4]/30 bg-[#8ff3d4]/10 text-[#b8f7e4]'
                        : 'border-white/10 text-white/40'
                    )}
                  >
                    B
                  </button>
                </div>
              </Field>
            </div>
            <Field label="Alignment">
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    ['left', AlignLeft],
                    ['center', AlignCenter],
                    ['right', AlignRight],
                  ] as const
                ).map(([align, AlignIcon]) => (
                  <button
                    key={align}
                    type="button"
                    aria-pressed={clip.align === align}
                    onClick={() => onUpdateClip({ align })}
                    className={cn(
                      'grid h-7 place-items-center rounded-md border text-white/40',
                      clip.align === align
                        ? 'border-[#8ff3d4]/30 bg-[#8ff3d4]/10 text-[#b8f7e4]'
                        : 'border-white/10 hover:bg-white/5'
                    )}
                  >
                    <AlignIcon className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-[0.12em] text-white/40">Backdrop</Label>
              <Switch
                checked={Boolean(clip.background)}
                onCheckedChange={(checked) =>
                  onUpdateClip({ background: checked ? '#000000' : null })
                }
              />
            </div>
            {clip.background ? (
              <Field label="Backdrop color">
                <input
                  type="color"
                  value={clip.background}
                  onChange={(event) => onUpdateClip({ background: event.target.value })}
                  className="h-7 w-12 cursor-pointer rounded border border-white/10 bg-transparent p-0.5"
                  aria-label="Text backdrop color"
                />
              </Field>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Position X" hint={`${Math.round(clip.xPercent)}%`}>
                <Slider
                  value={[clip.xPercent]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) => onUpdateClip({ xPercent: value })}
                />
              </Field>
              <Field label="Position Y" hint={`${Math.round(clip.yPercent)}%`}>
                <Slider
                  value={[clip.yPercent]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) => onUpdateClip({ yPercent: value })}
                />
              </Field>
            </div>
            <Field label="Max width" hint={`${Math.round(clip.maxWidthPercent)}%`}>
              <Slider
                value={[clip.maxWidthPercent]}
                min={10}
                max={100}
                step={1}
                onValueChange={([value]) => onUpdateClip({ maxWidthPercent: value })}
              />
            </Field>
          </>
        ) : null}

        {clip.kind === 'video' || clip.kind === 'image' ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Frame">
              <select
                value={clip.fit}
                onChange={(event) => onUpdateClip({ fit: event.target.value })}
                className={selectClass}
              >
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
              </select>
            </Field>
            <Field label={clip.kind === 'image' ? 'Scale' : 'Speed'} hint={clip.kind === 'image' ? '×' : '×'}>
              {clip.kind === 'image' ? (
                <Input
                  type="number"
                  min={1}
                  max={1.5}
                  step={0.01}
                  value={clip.scale}
                  onChange={(event) =>
                    onUpdateClip({ scale: Math.max(1, Math.min(1.5, Number(event.target.value) || 1)) })
                  }
                  className={inputClass}
                />
              ) : (
                <Input
                  type="number"
                  min={0.25}
                  max={4}
                  step={0.05}
                  value={clip.speed}
                  onChange={(event) =>
                    onUpdateClip({ speed: Math.max(0.25, Math.min(4, Number(event.target.value) || 1)) })
                  }
                  className={inputClass}
                />
              )}
            </Field>
          </div>
        ) : null}

        {clip.kind === 'audio' ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Speed" hint="×">
              <Input
                type="number"
                min={0.25}
                max={4}
                step={0.05}
                value={clip.speed}
                onChange={(event) =>
                  onUpdateClip({ speed: Math.max(0.25, Math.min(4, Number(event.target.value) || 1)) })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Duration" hint={formatClock(clip.durationMs)}>
              <span className="flex h-7 items-center font-mono text-[10px] text-white/40">
                {formatClock(clip.durationMs)}
              </span>
            </Field>
          </div>
        ) : null}

        {clip.kind === 'video' || clip.kind === 'audio' ? (
          <>
            <Field label="Volume" hint={`${Math.round(clip.volume * 100)}%`}>
              <Slider
                value={[clip.volume]}
                min={0}
                max={2}
                step={0.05}
                onValueChange={([value]) => onUpdateClip({ volume: value })}
              />
            </Field>
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                {clip.kind === 'video' ? 'Clip audio' : 'Mute'}
              </Label>
              <Switch
                checked={clip.muted}
                onCheckedChange={(checked) => onUpdateClip({ muted: checked })}
              />
            </div>
          </>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Field label="Start" hint="seconds">
            <Input
              type="number"
              min={0}
              step={0.1}
              value={seconds(clip.startMs)}
              onChange={(event) =>
                onUpdateClip({ startMs: Math.max(0, Math.round(Number(event.target.value) * 1000) || 0) })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Duration" hint="seconds">
            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={seconds(clip.durationMs)}
              onChange={(event) =>
                onUpdateClip({
                  durationMs: Math.max(100, Math.round(Number(event.target.value) * 1000) || 100),
                })
              }
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Opacity" hint={`${Math.round(clip.opacity * 100)}%`}>
          <Slider
            value={[clip.opacity]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={([value]) => onUpdateClip({ opacity: value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Fade in" hint="ms">
            <Input
              type="number"
              min={0}
              max={5000}
              step={100}
              value={clip.fadeInMs}
              onChange={(event) =>
                onUpdateClip({
                  fadeInMs: Math.max(0, Math.min(5000, Number(event.target.value) || 0)),
                })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Fade out" hint="ms">
            <Input
              type="number"
              min={0}
              max={5000}
              step={100}
              value={clip.fadeOutMs}
              onChange={(event) =>
                onUpdateClip({
                  fadeOutMs: Math.max(0, Math.min(5000, Number(event.target.value) || 0)),
                })
              }
              className={inputClass}
            />
          </Field>
        </div>

        {'transition' in clip ? (
          <Field label="Transition">
            <select
              value={clip.transition}
              onChange={(event) => onUpdateClip({ transition: event.target.value })}
              className={selectClass}
            >
              <option value="none">None</option>
              <option value="fade">Fade</option>
            </select>
          </Field>
        ) : null}

        {asset ? (
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5">
            <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/30">Source</p>
            <p className="mt-1 truncate text-[10px] text-white/55">{asset.originalName}</p>
            <p className="mt-0.5 font-mono text-[8px] text-white/25">
              {formatBytes(asset.sizeBytes)}
              {asset.durationMs ? ` · ${formatClock(asset.durationMs)}` : ''}
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-1.5 border-t border-white/[0.07] pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onSplit}
            className="h-7 border-white/10 bg-transparent px-1 text-[9px] text-white/60 hover:bg-white/10 hover:text-white"
          >
            <Scissors className="h-3 w-3" />
            Split
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDuplicate}
            className="h-7 border-white/10 bg-transparent px-1 text-[9px] text-white/60 hover:bg-white/10 hover:text-white"
          >
            <Copy className="h-3 w-3" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="h-7 border-[#ff6b6b]/20 bg-transparent px-1 text-[9px] text-[#ff9a9a] hover:bg-[#ff6b6b]/10"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        </div>
      </div>
    </aside>
  )
}
