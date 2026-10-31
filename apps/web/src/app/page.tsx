'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clapperboard,
  Cpu,
  Download,
  FolderOpen,
  GitBranch,
  Layers,
  Play,
  Scissors,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react'
import { PLAN_DEFINITIONS } from '@frameforge/shared'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { StudioPreview } from '@/components/landing/studio-preview'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      data-motion-reveal
      className={className}
    >
      {children}
    </motion.div>
  )
}

const capabilities = [
  {
    icon: Sparkles,
    title: 'AI-powered creation',
    description: 'Turn a brief into scripts, storyboards, and generated scenes without leaving the studio.',
  },
  {
    icon: Layers,
    title: 'Professional timeline editing',
    description: 'Frame-accurate trimming, layered tracks, captions, and revisions built for real edits.',
  },
  {
    icon: Clapperboard,
    title: 'High-quality exports',
    description: 'Queue background renders in H.264 for YouTube, Reels, TikTok, and square formats.',
  },
]

const features = [
  {
    icon: Wand2,
    title: 'Direct AI like a collaborator',
    description:
      'Write a prompt, refine the treatment, and turn it into a storyboard. Every generated clip is clearly marked as mock or live.',
    className: 'md:col-span-2',
  },
  {
    icon: Layers,
    title: 'A timeline that keeps up',
    description:
      'Video, overlay, title, caption, and audio tracks with optimistic concurrency and full revision history.',
  },
  {
    icon: Download,
    title: 'Every platform, one cut',
    description:
      'Reformat for 16:9, 9:16, 1:1, 4:5, and 21:9 with export presets for the channels you ship to.',
  },
  {
    icon: FolderOpen,
    title: 'A media library with receipts',
    description:
      'Uploads are probed, storage is accounted for, and every asset stays attached to the workspace that owns it.',
  },
  {
    icon: GitBranch,
    title: 'Revisions without fear',
    description:
      'Every timeline save creates a revision. Restore an earlier cut when an experiment does not land.',
  },
  {
    icon: Cpu,
    title: 'Rendering in the background',
    description:
      'Exports run through a dedicated render queue, so the editor stays open while the final cut is encoded.',
  },
]

const workflow = [
  {
    number: '01',
    title: 'Direct the idea',
    description:
      'Start with a prompt or a script. Build a treatment, choose a style and aspect ratio, then generate a storyboard to react to.',
    label: 'Develop',
    icon: Wand2,
  },
  {
    number: '02',
    title: 'Shape the cut',
    description:
      'Move scenes onto the timeline, trim to the frame, layer titles over footage, and save a revision whenever the story changes.',
    label: 'Edit',
    icon: Scissors,
  },
  {
    number: '03',
    title: 'Deliver everywhere',
    description:
      'Pick a platform preset, queue the render, and download the finished MP4 when the worker reports back.',
    label: 'Export',
    icon: Download,
  },
]

const showcaseScenes = [
  { title: 'The ridge at blue hour', tag: 'Establishing', tone: 'from-cyan-400/30 to-teal-500/10' },
  { title: 'Neon on wet asphalt', tag: 'Pursuit', tone: 'from-fuchsia-400/30 to-violet-500/10' },
  { title: 'Dust in the last light', tag: 'Resolve', tone: 'from-amber-400/30 to-orange-500/10' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden pb-16 pt-32 sm:pt-36 lg:pb-24 lg:pt-40">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 marketing-grid opacity-70" />
            <div className="absolute inset-x-0 top-0 h-[560px] bg-grid-fade" />
            <div className="absolute left-1/2 top-20 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]" />
            <div className="absolute right-[8%] top-[30%] h-40 w-40 rounded-full bg-magenta/10 blur-[90px]" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="container">
            <div className="mx-auto max-w-4xl text-center">
              <div
                className="inline-flex animate-fade-up items-center gap-2.5 rounded-full border border-border-strong/60 bg-surface-2/70 px-3.5 py-1.5 shadow-ring backdrop-blur"
                style={{ animationDelay: '40ms' }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-bright" />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Your AI-native video studio
                </span>
              </div>

              <h1
                className="mt-7 animate-fade-up text-[clamp(2.9rem,8vw,6.4rem)] font-medium leading-[0.9] tracking-tightest"
                style={{ animationDelay: '110ms' }}
              >
                <span className="block text-foreground">From Imagination</span>
                <span className="mt-1 block text-foreground/90">
                  to{' '}
                  <span className="font-serif italic text-gradient">Final Cut.</span>
                </span>
              </h1>

              <p
                className="mx-auto mt-7 max-w-2xl animate-fade-up text-base leading-relaxed text-muted-foreground sm:text-lg"
                style={{ animationDelay: '190ms' }}
              >
                An AI-native creative studio to generate scenes, shape stories on a frame-accurate
                timeline, and deliver cinematic video — from the first spark to the final export.
              </p>

              <div
                className="mt-8 flex animate-fade-up flex-col items-center justify-center gap-3 sm:flex-row"
                style={{ animationDelay: '260ms' }}
              >
                <Button asChild variant="brand" size="lg" className="w-full sm:w-auto">
                  <Link href="/auth/sign-up">
                    Create Your First Video
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link href="/dashboard">
                    <Play className="h-4 w-4" />
                    Explore the Studio
                  </Link>
                </Button>
              </div>

              <p
                className="mt-4 animate-fade-up font-mono text-[10px] uppercase tracking-[0.16em] text-faint"
                style={{ animationDelay: '320ms' }}
              >
                Local mode uses clearly labeled mock AI · No card to explore
              </p>
            </div>

            <Reveal className="mt-14" delay={0.05}>
              <StudioPreview />
            </Reveal>

            <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border/80 bg-border/70 sm:grid-cols-3 lg:mt-20">
              {capabilities.map((capability) => (
                <div key={capability.title} className="bg-card/90 px-5 py-6 sm:px-6 lg:px-7">
                  <capability.icon className="h-4 w-4 text-brand-bright" />
                  <h2 className="mt-3 text-sm font-medium text-foreground">{capability.title}</h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {capability.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 border-t border-border/60 py-20 lg:py-28">
          <div className="container">
            <Reveal className="max-w-3xl">
              <p className="eyebrow">Everything in one edit</p>
              <h2 className="mt-3 text-3xl font-medium leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                The tools are serious.
                <span className="block text-muted-foreground">The workflow feels effortless.</span>
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                FrameForge is not a heap of disconnected AI demos. It is a production workspace
                where generation, editing, media, and delivery share one timeline.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Reveal
                  key={feature.title}
                  delay={index * 0.04}
                  className={cn(feature.className)}
                >
                  <div className="group relative h-full overflow-hidden rounded-2xl border border-border/80 bg-card p-5 transition-colors hover:border-border-strong sm:p-6">
                    <div className="flex items-start justify-between">
                      <span className="grid h-9 w-9 place-items-center rounded-lg border border-border/80 bg-surface-2 text-brand-bright">
                        <feature.icon className="h-4 w-4" />
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <h3 className="mt-5 text-[15px] font-medium tracking-[-0.01em] text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                    {index === 0 ? (
                      <div className="mt-6 rounded-xl border border-border/70 bg-surface-1/80 p-3">
                        <div className="flex items-center gap-2 text-[10px] text-faint">
                          <Sparkles className="h-3 w-3 text-brand-bright" />
                          <span className="font-mono uppercase tracking-[0.14em]">
                            Prompt → storyboard
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          “A quiet coastal town wakes beneath an aurora. Three shots, hopeful,
                          anamorphic.”
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {showcaseScenes.map((scene) => (
                            <div
                              key={scene.title}
                              className={cn(
                                'rounded-md border border-border/70 bg-gradient-to-br p-2',
                                scene.tone
                              )}
                            >
                              <div className="h-8 rounded-sm bg-black/25 clip-stripes" />
                              <p className="mt-1.5 truncate text-[9px] text-muted-foreground">
                                {scene.tag}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {index === 1 ? (
                      <div className="mt-6 space-y-1.5">
                        {[
                          { label: 'V2', tone: 'bg-brand/30 border-brand/40', width: 'w-4/5' },
                          { label: 'V1', tone: 'bg-fuchsia-400/20 border-fuchsia-300/30', width: 'w-full' },
                          { label: 'A1', tone: 'bg-cyan-400/15 border-cyan-300/25', width: 'w-3/4' },
                        ].map((track) => (
                          <div key={track.label} className="flex items-center gap-2">
                            <span className="w-5 font-mono text-[8px] text-faint">{track.label}</span>
                            <div className="h-4 flex-1 rounded-sm border border-border/60 bg-surface-2/60">
                              <div className={cn('h-full rounded-sm border', track.tone, track.width)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-24 border-t border-border/60 py-20 lg:py-28">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
              <Reveal>
                <p className="eyebrow">The workflow</p>
                <h2 className="mt-3 text-3xl font-medium leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                  From a sentence
                  <span className="block font-serif italic text-muted-foreground">
                    to a finished film.
                  </span>
                </h2>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Three deliberate stages. No handoffs between six tools. The same workspace carries
                  the idea, the cut, and the export.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {['AI storyboards', 'Frame-accurate cuts', 'Background renders', 'Revision history'].map(
                    (item) => (
                      <span
                        key={item}
                        className="rounded-full border border-border bg-surface-2/60 px-3 py-1 text-[11px] text-muted-foreground"
                      >
                        {item}
                      </span>
                    )
                  )}
                </div>
              </Reveal>

              <div className="space-y-3">
                {workflow.map((step, index) => (
                  <Reveal key={step.number} delay={index * 0.08}>
                    <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 transition-colors hover:border-border-strong sm:p-6">
                      <div className="flex items-start gap-4 sm:gap-6">
                        <span className="font-mono text-[11px] text-faint">{step.number}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-[15px] font-medium text-foreground">{step.title}</h3>
                            <span className="flex items-center gap-1.5 rounded-full border border-border/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                              <step.icon className="h-2.5 w-2.5" />
                              {step.label}
                            </span>
                          </div>
                          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                            {step.description}
                          </p>
                        </div>
                      </div>
                      <span className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-brand/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="studio" className="scroll-mt-24 border-t border-border/60 py-20 lg:py-28">
          <div className="container">
            <div className="relative overflow-hidden rounded-3xl border border-border-strong/60 bg-surface-1">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,hsl(var(--brand)/0.18),transparent_55%),radial-gradient(ellipse_at_90%_100%,hsl(var(--magenta)/0.12),transparent_50%)]" />
              <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:p-14">
                <Reveal>
                  <p className="eyebrow">Inside the AI Studio</p>
                  <h2 className="mt-3 text-3xl font-medium leading-[1.05] tracking-[-0.035em] sm:text-[2.8rem]">
                    Start with a thought.
                    <span className="block font-serif italic text-muted-foreground">
                      Leave with a shot list.
                    </span>
                  </h2>
                  <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Write the idea in plain language. FrameForge can produce a treatment,
                    storyboard, voiceover, or transcription — then hand the result to the editor
                    instead of a separate download folder.
                  </p>
                  <ul className="mt-7 space-y-3 text-sm text-muted-foreground">
                    {[
                      'Script, storyboard, and shot descriptions from one brief',
                      'Choose cinematic, documentary, product, social, anime, or minimal direction',
                      'Every job shows provider and mock status before you rely on it',
                    ].map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-bright" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="outline" size="lg" className="mt-8">
                    <Link href="/ai">
                      Open AI Studio
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </Reveal>

                <Reveal delay={0.1} className="relative">
                  <div className="rounded-2xl border border-white/[0.08] bg-[#090a0f] p-3 shadow-panel">
                    <div className="flex items-center gap-2 border-b border-white/[0.06] px-2 pb-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/15">
                        <Sparkles className="h-2.5 w-2.5 text-violet-300" />
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                        AI generation
                      </span>
                      <span className="ml-auto rounded border border-amber-300/20 bg-amber-300/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide text-amber-200/80">
                        Mock in local mode
                      </span>
                    </div>
                    <div className="p-2">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                        Prompt
                      </p>
                      <div className="mt-2 rounded-lg border border-white/[0.07] bg-white/[0.025] p-3 text-xs leading-relaxed text-white/75">
                        A documentary opening for a coastal town at dawn. Quiet, textural, 16:9.
                        Three scenes that build toward hope.
                      </div>
                      <div className="mt-5 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                          Storyboard
                        </span>
                        <span className="font-mono text-[9px] text-white/30">3 scenes · 18s</span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {showcaseScenes.map((scene, index) => (
                          <div key={scene.title}>
                            <div
                              className={cn(
                                'relative aspect-[4/3] overflow-hidden rounded-md border border-white/[0.08] bg-gradient-to-br',
                                scene.tone
                              )}
                            >
                              <div className="absolute inset-0 clip-stripes opacity-30" />
                              <span className="absolute left-1.5 top-1 font-mono text-[8px] text-white/50">
                                0{index + 1}
                              </span>
                              <span className="absolute inset-x-1 bottom-1 rounded bg-black/30 px-1 py-0.5 text-[8px] text-white/65 backdrop-blur">
                                {scene.tag}
                              </span>
                            </div>
                            <p className="mt-1.5 truncate text-[9px] text-white/45">{scene.title}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3">
                        <span className="flex items-center gap-1.5 text-[9px] text-white/35">
                          <Zap className="h-3 w-3 text-violet-300" />
                          Queued to the studio timeline
                        </span>
                        <span className="rounded bg-white px-2.5 py-1 text-[9px] font-medium text-black">
                          Use storyboard
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-3 -right-2 hidden rounded-lg border border-border bg-card px-3 py-2 shadow-panel sm:block">
                    <p className="text-[9px] uppercase tracking-[0.16em] text-faint">Provider</p>
                    <p className="mt-0.5 font-mono text-[10px] text-foreground">mock · labeled</p>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 border-t border-border/60 py-20 lg:py-28">
          <div className="container">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Simple plans</p>
              <h2 className="mt-3 text-3xl font-medium leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                Start small. Ship something real.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Every plan includes the full studio. Limits scale with the work you deliver, not the
                features we hide.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {Object.values(PLAN_DEFINITIONS).map((plan, index) => (
                <Reveal key={plan.id} delay={index * 0.06}>
                  <div
                    className={cn(
                      'relative flex h-full flex-col rounded-2xl border bg-card p-6',
                      plan.id === 'PRO'
                        ? 'border-brand/50 shadow-glow'
                        : 'border-border/80'
                    )}
                  >
                    {plan.id === 'PRO' ? (
                      <span className="absolute -top-2.5 left-6 rounded-full border border-brand/40 bg-background px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-brand-bright">
                        Most creators
                      </span>
                    ) : null}
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-sm font-medium text-foreground">{plan.name}</h3>
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                        {plan.id}
                      </span>
                    </div>
                    <p className="mt-1.5 min-h-10 text-xs leading-relaxed text-muted-foreground">
                      {plan.tagline}
                    </p>
                    <div className="mt-6 flex items-baseline gap-1.5">
                      <span className="font-mono text-4xl tracking-tight text-foreground">
                        ${plan.priceMonthlyUsd}
                      </span>
                      <span className="text-xs text-faint">/ month</span>
                    </div>
                    <ul className="mt-6 flex-1 space-y-2.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2 text-xs text-muted-foreground">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-brand-bright" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      variant={plan.id === 'PRO' ? 'brand' : 'outline'}
                      className="mt-7 w-full"
                    >
                      <Link href="/auth/sign-up">
                        {plan.priceMonthlyUsd === 0 ? 'Start free' : `Choose ${plan.name}`}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="mt-6 text-center text-[11px] text-faint">
              Local development runs AI jobs in labeled mock mode. Connect a provider key in the API
              environment for live generations.
            </p>
          </div>
        </section>

        <section className="pb-24">
          <div className="container">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border border-border-strong/60 bg-[#090a0f] px-6 py-16 text-center sm:px-12 sm:py-20">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(124,92,255,0.35),transparent_60%),radial-gradient(ellipse_at_80%_120%,rgba(217,70,239,0.18),transparent_50%)]" />
                <div className="pointer-events-none absolute inset-0 marketing-grid opacity-20" />
                <div className="relative mx-auto max-w-2xl">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
                    Your next film is already in your head
                  </p>
                  <h2 className="mt-4 text-3xl font-medium leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl">
                    Make the first cut
                    <span className="block font-serif italic text-white/60">before the doubt.</span>
                  </h2>
                  <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-white/55">
                    Open the studio, start with a sentence, and let the timeline take it from there.
                  </p>
                  <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Button asChild variant="brand" size="lg">
                      <Link href="/auth/sign-up">
                        Create Your First Video
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
                    >
                      <Link href="/dashboard">
                        <Play className="h-4 w-4" />
                        Explore the Studio
                      </Link>
                    </Button>
                  </div>
                  <p className="mt-4 flex items-center justify-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">
                    <ShieldCheck className="h-3 w-3" />
                    No card required to explore
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
