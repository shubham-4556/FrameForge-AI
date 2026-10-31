'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Film,
  Image as ImageIcon,
  Music,
  Plus,
  Search,
  Sparkles,
  Type,
  Upload,
} from 'lucide-react'
import type { MediaAsset } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, timeAgo } from '@/lib/utils'

type Filter = 'ALL' | 'VIDEO' | 'IMAGE' | 'AUDIO'

const filterLabels: Array<{ value: Filter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'AUDIO', label: 'Audio' },
]

const kindIcon = { VIDEO: Film, IMAGE: ImageIcon, AUDIO: Music, FONT: Type }

export function EditorLibrary({
  assets,
  sample,
  loading,
  onAddAsset,
  onAddText,
}: {
  assets: MediaAsset[]
  sample: boolean
  loading: boolean
  onAddAsset: (assetId: string) => void
  onAddText: (preset: 'title' | 'caption' | 'lowerThird') => void
}) {
  const [filter, setFilter] = React.useState<Filter>('ALL')
  const [query, setQuery] = React.useState('')

  const visible = assets.filter((asset) => {
    if (asset.status !== 'READY' || asset.kind === 'FONT') return false
    if (filter !== 'ALL' && asset.kind !== filter) return false
    if (query.trim() && !asset.originalName.toLowerCase().includes(query.trim().toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <aside className="flex h-full w-full flex-col border-r border-white/10 bg-[#0b0d11]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">Library</p>
          <p className="mt-0.5 text-[10px] text-white/45">Drag onto a track</p>
        </div>
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="text-white/40 hover:bg-white/10 hover:text-white"
        >
          <Link href="/media" target="_blank" aria-label="Open media library">
            <Upload className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {sample ? (
        <p className="mx-3 mt-3 rounded-md border border-[#ffc36b]/20 bg-[#ffc36b]/[0.06] px-2 py-1.5 text-[9px] leading-relaxed text-[#ffc36b]/80">
          Sample assets. Sign in to load your workspace media.
        </p>
      ) : null}

      <div className="space-y-2 border-b border-white/10 p-3">
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              ['title', 'Title'],
              ['caption', 'Caption'],
              ['lowerThird', 'Lower 3rd'],
            ] as const
          ).map(([preset, label]) => (
            <button
              key={preset}
              type="button"
              onClick={() => onAddText(preset)}
              className="flex h-8 items-center justify-center gap-1 rounded-md border border-white/10 bg-white/[0.03] text-[9px] text-white/55 transition-colors hover:border-[#8ff3d4]/30 hover:bg-[#8ff3d4]/[0.06] hover:text-[#b8f7e4]"
            >
              <Plus className="h-2.5 w-2.5" />
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/25" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search media"
            aria-label="Search editor media"
            className="h-7 border-white/10 bg-white/[0.04] pl-7 text-[10px] text-white placeholder:text-white/25"
          />
        </div>
        <div className="flex items-center gap-1">
          {filterLabels.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={cn(
                'rounded px-2 py-0.5 text-[9px] transition-colors',
                filter === item.value
                  ? 'bg-white/10 text-white'
                  : 'text-white/35 hover:bg-white/5 hover:text-white/70'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-1.5">
                <div className="aspect-video animate-pulse rounded-md bg-white/[0.04]" />
                <div className="h-2 w-2/3 animate-pulse rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Film className="mx-auto h-4 w-4 text-white/20" />
            <p className="mt-2 text-[10px] text-white/35">
              {assets.length === 0 ? 'No media yet.' : 'No media matches this view.'}
            </p>
            {!sample ? (
              <Button asChild variant="outline" size="sm" className="mt-2 h-7 border-white/10 bg-transparent text-[9px] text-white/60">
                <Link href="/media">Upload in library</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {visible.map((asset) => {
              const Icon = kindIcon[asset.kind]
              return (
                <button
                  key={asset.id}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-frameforge-asset', asset.id)
                    event.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => onAddAsset(asset.id)}
                  title={`Add ${asset.originalName} at the playhead`}
                  className="group overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.02] text-left transition-colors hover:border-[#8ff3d4]/35 hover:bg-white/[0.04]"
                >
                  <span className="relative block aspect-video overflow-hidden bg-[#11151d]">
                    {asset.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.previewUrl}
                        alt=""
                        className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#101b2b,#1d3a3f_55%,#0d1016)]">
                        <Icon className="h-4 w-4 text-white/30" />
                      </span>
                    )}
                    <span className="absolute left-1 top-1 rounded bg-black/50 px-1 py-px font-mono text-[7px] uppercase tracking-[0.08em] text-white/55">
                      {asset.kind}
                    </span>
                  </span>
                  <span className="block px-1.5 py-1">
                    <span className="block truncate text-[9px] text-white/60">{asset.originalName}</span>
                    <span className="block text-[8px] text-white/25">{timeAgo(asset.createdAt)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-1.5 border-t border-white/10 p-2.5">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 w-full justify-between px-2 text-[9px] text-white/40 hover:bg-white/10 hover:text-white"
        >
          <Link href="/ai" target="_blank">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[#8ff3d4]" />
              Open AI Studio
            </span>
            <ArrowUpRight className="h-2.5 w-2.5" />
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 w-full justify-between px-2 text-[9px] text-white/40 hover:bg-white/10 hover:text-white"
        >
          <Link href="/media" target="_blank">
            <span className="flex items-center gap-1.5">
              <Upload className="h-3 w-3" />
              Media library
            </span>
            <ArrowUpRight className="h-2.5 w-2.5" />
          </Link>
        </Button>
      </div>
    </aside>
  )
}
