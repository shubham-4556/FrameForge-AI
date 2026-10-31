'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  AudioLines,
  Captions,
  Image as ImageIcon,
  Layers,
  Pause,
  Play,
  Scissors,
  Sparkles,
  Type,
  Wand2,
} from 'lucide-react'
import { cn, formatClock } from '@/lib/utils'

const scenes = [
  {
    id: 'aurora',
    index: '01',
    title: 'AURORA',
    subtitle: 'Light finds a way.',
    prompt: 'Slow aerial push over glacial ridges at blue hour, volumetric aurora, anamorphic flare.',
    palette: ['#0e2a3a', '#1c6f7a', '#8ff3d4'],
    tags: ['Cinematic', '16:9', '24 fps'],
    art: 'aurora',
    clipLabel: 'Aurora — establishing',
  },
  {
    id: 'night-drive',
    index: '02',
    title: 'NIGHT DRIVE',
    subtitle: 'Chase the quiet.',
    prompt: 'Rain-slick city street, neon reflections, tracking shot from a low bumper rig.',
    palette: ['#170d2b', '#6d2bb8', '#ff5fa2'],
    tags: ['Neo-noir', '16:9', '30 fps'],
    art: 'night',
    clipLabel: 'Night drive — pursuit',
  },
  {
    id: 'afterglow',
    index: '03',
    title: 'AFTERGLOW',
    subtitle: 'Stay for the last light.',
    prompt: 'Wide desert vista, warm afterglow, slow dissolve as dust catches the last sun.',
    palette: ['#2b160d', '#a34c22', '#ffc36b'],
    tags: ['Golden hour', '16:9', '24 fps'],
    art: 'afterglow',
    clipLabel: 'Afterglow — resolve',
  },
] as const

const durationMs = 24_000

function SceneArt({ art, active }: { art: (typeof scenes)[number]['art']; active: boolean }) {
  return (
    <motion.div
      key={art}
      initial={{ opacity: 0, scale: 1.03 }}
      animate={{ opacity: 1, scale: active ? 1.025 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      data-motion-reveal
      className="absolute inset-0"
    >
      {art === 'aurora' ? (
        <div className="absolute inset-0 bg-[#050b10]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_20%,#1d6f78_0%,transparent_55%),radial-gradient(ellipse_at_72%_0%,#74e8c6_0%,transparent_42%),radial-gradient(ellipse_at_80%_80%,#0c2938_0%,transparent_60%)]" />
          <div className="absolute -left-1/4 top-1/4 h-[55%] w-[160%] -rotate-12 bg-[linear-gradient(100deg,transparent_10%,rgba(122,255,212,0.34)_34%,rgba(62,170,190,0.1)_48%,transparent_66%)] blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-[46%] bg-[linear-gradient(to_top,#020507_10%,transparent)]" />
          <svg viewBox="0 0 800 450" className="absolute inset-x-0 bottom-0 h-[48%] w-full" preserveAspectRatio="none">
            <path d="M0 290 L120 225 L210 268 L320 180 L430 260 L540 205 L660 262 L800 210 V450 H0Z" fill="#050c11" />
            <path d="M0 340 L150 290 L290 330 L430 268 L570 330 L720 282 L800 308 V450 H0Z" fill="#020507" />
          </svg>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_25%,rgba(0,0,0,0.55))]" />
        </div>
      ) : null}

      {art === 'night' ? (
        <div className="absolute inset-0 bg-[#0a0612]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_18%,#8a2be2_0%,transparent_48%),radial-gradient(ellipse_at_20%_70%,#ff2f8a_0%,transparent_45%)] opacity-70" />
          <div className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(to_bottom,rgba(20,8,40,0.2),rgba(5,2,12,0.85))]" />
          <div className="absolute left-[8%] right-[8%] top-[36%] h-px bg-gradient-to-r from-transparent via-pink-300/70 to-transparent" />
          {[18, 30, 46, 58, 70, 84].map((left, index) => (
            <div
              key={left}
              className="absolute top-[20%] h-[38%] w-[3%] bg-gradient-to-b from-white/70 via-fuchsia-300/30 to-transparent"
              style={{ left: `${left}%`, opacity: 0.5 + index * 0.06, filter: 'blur(2px)' }}
            />
          ))}
          <div className="absolute inset-x-0 bottom-0 h-[35%] bg-[linear-gradient(to_top,#05030a_20%,#1b0b2b80)]" />
          <div className="absolute bottom-[18%] left-[28%] h-[2px] w-[50%] bg-gradient-to-r from-transparent via-pink-400/80 to-transparent blur-[1px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,transparent_20%,rgba(0,0,0,0.6))]" />
        </div>
      ) : null}

      {art === 'afterglow' ? (
        <div className="absolute inset-0 bg-[#160b06]">
          <div className="absolute inset-0 bg-[linear-gradient(to_top,#1b0c05_0%,#7a2f12_38%,#d4763b_62%,#f8c271_78%,#ffd79a_100%)]" />
          <div className="absolute left-1/2 top-[54%] h-[34%] w-[34%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#ffe7b8_0%,#ffb85c_45%,transparent_72%)] blur-2xl opacity-80" />
          <svg viewBox="0 0 800 450" className="absolute inset-x-0 bottom-0 h-[38%] w-full" preserveAspectRatio="none">
            <path d="M0 250 L110 225 L230 248 L350 210 L470 238 L600 204 L720 232 L800 216 V450 H0Z" fill="#2a1209" />
            <path d="M0 310 L160 285 L330 304 L520 272 L690 300 L800 282 V450 H0Z" fill="#150804" />
          </svg>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_30%,rgba(20,6,2,0.5))]" />
        </div>
      ) : null}
    </motion.div>
  )
}

export function StudioPreview() {
  const reduceMotion = useReducedMotion()
  const [playing, setPlaying] = React.useState(true)
  const [progress, setProgress] = React.useState(6)
  const [mounted, setMounted] = React.useState(false)

  const sceneIndex = Math.min(scenes.length - 1, Math.floor(progress / (100 / scenes.length)))
  const scene = scenes[sceneIndex] ?? scenes[0]

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!playing || reduceMotion) return
    const timer = window.setInterval(() => {
      setProgress((value) => {
        const next = value + 0.42
        return next >= 100 ? 0 : next
      })
    }, 80)
    return () => window.clearInterval(timer)
  }, [playing, reduceMotion])

  const jumpToScene = (index: number) => {
    setProgress(index * (100 / scenes.length) + 1)
    setPlaying(false)
  }

  const timecode = formatClock((progress / 100) * durationMs)

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-x-10 -top-8 h-24 bg-brand/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-border-strong/70 bg-[#07080b] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
        <div className="flex h-11 items-center gap-3 border-b border-white/[0.07] bg-white/[0.025] px-4">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
          </div>
          <div className="ml-2 hidden items-center gap-2 text-[11px] text-white/45 sm:flex">
            <Layers className="h-3 w-3" />
            <span className="text-white/75">Aurora — Brand Film</span>
            <span className="text-white/25">/</span>
            <span>Sequence 01</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-300/90 sm:flex">
              <span className="h-1 w-1 rounded-full bg-emerald-300" />
              Autosaved
            </span>
            <span className="flex items-center gap-1.5 rounded-md border border-violet-400/25 bg-violet-400/10 px-2 py-1 text-[10px] font-medium text-violet-200">
              <Sparkles className="h-3 w-3" />
              AI Studio
            </span>
          </div>
        </div>

        <div className="flex min-h-[330px]">
          <div className="hidden w-12 shrink-0 flex-col items-center gap-1 border-r border-white/[0.06] bg-white/[0.015] py-3 md:flex">
            {[Wand2, ImageIcon, Type, Captions, Scissors].map((Icon, index) => (
              <span
                key={index}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-md text-white/35',
                  index === 0 && 'bg-white/[0.07] text-white/80'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
            ))}
            <span className="mt-auto grid h-8 w-8 place-items-center rounded-md text-white/35">
              <AudioLines className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative aspect-[16/9] max-h-[420px] w-full overflow-hidden bg-black">
              <SceneArt art={scene.art} active={playing} />

              <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-7">
                <div className="flex items-start justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-white/50">
                  <span>Cam A · 35mm</span>
                  <span className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-red-500" />
                    PREVIEW
                  </span>
                </div>

                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  data-motion-reveal
                  className="max-w-[78%]"
                >
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.28em] text-white/55">
                    Scene {scene.index} — {scene.tags[0]}
                  </p>
                  <h2 className="font-serif text-3xl leading-[0.95] tracking-[-0.02em] text-white sm:text-5xl lg:text-6xl">
                    {scene.title}
                  </h2>
                  <p className="mt-2 text-xs italic text-white/65 sm:text-sm">{scene.subtitle}</p>
                </motion.div>

                <div className="flex items-end justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-white/50">
                  <span>{timecode} / 00:24</span>
                  <span className="hidden sm:inline">16:9 · 24 FPS · H.264</span>
                </div>
              </div>

              {mounted && playing && !reduceMotion ? (
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/[0.045] to-transparent"
                  animate={{ x: ['-20%', '580%'] }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
                />
              ) : null}
            </div>
          </div>

          <div className="hidden w-[188px] shrink-0 border-l border-white/[0.06] bg-white/[0.015] p-3.5 lg:block">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                Inspector
              </span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[8px] text-white/45">
                AI
              </span>
            </div>
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Prompt</p>
              <p className="mt-1.5 line-clamp-4 text-[11px] leading-relaxed text-white/70">
                {scene.prompt}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-1">
              {scene.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-white/55"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-5 space-y-2.5">
              {['Motion', 'Depth', 'Grain'].map((label, index) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-[9px] text-white/40">
                    <span>{label}</span>
                    <span>{[72, 58, 26][index]}%</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400"
                      style={{ width: `${[72, 58, 26][index]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5">
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/35">
                Palette
              </p>
              <div className="mt-2 flex gap-1.5">
                {scene.palette.map((color) => (
                  <span
                    key={color}
                    className="h-5 flex-1 rounded-sm border border-white/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.07] bg-[#08090d]">
          <div className="flex h-11 items-center gap-2 px-3.5">
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? 'Pause preview' : 'Play preview'}
              className="grid h-7 w-7 place-items-center rounded-md bg-white text-black transition-transform hover:scale-105"
            >
              {playing ? <Pause className="h-3.5 w-3.5" fill="currentColor" /> : <Play className="h-3.5 w-3.5 translate-x-px" fill="currentColor" />}
            </button>
            <span className="font-mono text-[10px] tabular-nums text-white/55">{timecode}</span>
            <div className="mx-1 h-3 w-px bg-white/10" />
            <div className="hidden items-center gap-1 sm:flex">
              {scenes.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => jumpToScene(index)}
                  aria-label={`Preview scene ${item.index}: ${item.title}`}
                  aria-pressed={sceneIndex === index}
                  className={cn(
                    'rounded px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors',
                    sceneIndex === index
                      ? 'bg-white/10 text-white'
                      : 'text-white/35 hover:text-white/70'
                  )}
                >
                  {item.index}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Timeline live
            </div>
          </div>

          <div className="border-t border-white/[0.06] px-3.5 pb-4 pt-2.5">
            <div className="mb-2 flex items-center justify-between px-1 font-mono text-[8px] uppercase tracking-[0.16em] text-white/25">
              {['00:00', '00:06', '00:12', '00:18', '00:24'].map((mark) => (
                <span key={mark}>{mark}</span>
              ))}
            </div>
            <div className="relative">
              <div className="space-y-1.5">
                {[
                  { label: 'V1', clips: scenes.map((item) => item) },
                  { label: 'T1', clips: scenes.map((item) => item) },
                  { label: 'A1', clips: [] },
                ].map((track, trackIndex) => (
                  <div key={track.label} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 font-mono text-[8px] text-white/30">
                      {track.label}
                    </span>
                    <div className="relative flex h-8 flex-1 gap-0.5 overflow-hidden rounded border border-white/[0.06] bg-white/[0.02]">
                      {track.clips.map((item, clipIndex) => (
                        <button
                          key={`${track.label}-${item.id}-${clipIndex}`}
                          type="button"
                          onClick={() => jumpToScene(clipIndex)}
                          aria-label={`Jump to ${item.clipLabel}`}
                          className={cn(
                            'group relative h-full flex-1 overflow-hidden border-r border-black/40 text-left transition-opacity',
                            trackIndex === 0
                              ? 'bg-gradient-to-r from-violet-500/35 via-fuchsia-500/25 to-orange-400/25'
                              : trackIndex === 1
                                ? 'bg-cyan-400/10'
                                : 'bg-white/[0.04]'
                          )}
                          style={
                            trackIndex === 2
                              ? {
                                  backgroundImage:
                                    'repeating-linear-gradient(90deg, rgba(124,92,255,0.35) 0 2px, transparent 2px 6px)',
                                }
                              : undefined
                          }
                        >
                          <span className="absolute inset-0 clip-stripes opacity-40" />
                          {trackIndex === 0 ? (
                            <span className="absolute bottom-0 left-1 top-0 flex items-center font-mono text-[7px] uppercase tracking-wide text-white/45">
                              {item.title.split(' ')[0]}
                            </span>
                          ) : null}
                          {trackIndex === 1 ? (
                            <span className="absolute inset-x-1 top-1/2 h-[2px] -translate-y-1/2 bg-cyan-200/40" />
                          ) : null}
                        </button>
                      ))}
                      {track.clips.length === 0 ? (
                        <div className="flex flex-1 items-center gap-1 px-2">
                          {Array.from({ length: 22 }).map((_, index) => (
                            <span
                              key={index}
                              className="w-full rounded-full bg-violet-300/30"
                              style={{ height: `${4 + ((index * 7) % 14)}px` }}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-white/80"
                style={{ left: `calc(${Math.min(100, Math.max(0, progress))}% + 32px)` }}
              >
                <span className="absolute -left-[3px] top-0 h-[7px] w-[7px] rounded-full bg-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center justify-between gap-2 text-[10px] text-muted-foreground sm:flex-row">
        <p className="font-mono uppercase tracking-[0.18em] text-faint">
          Interactive product preview · Illustrative footage
        </p>
        <p>Click a scene or clip to scrub the timeline.</p>
      </div>
    </div>
  )
}
