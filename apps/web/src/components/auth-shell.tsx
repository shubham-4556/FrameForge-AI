import Link from 'next/link'
import { ArrowUpRight, Check, Layers, Play, Sparkles } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { ThemeToggle } from '@/components/theme-toggle'

const points = [
  'Generate treatments, storyboards, and scenes in one place.',
  'Shape every frame on a frame-accurate, layered timeline.',
  'Queue a render and download the finished cut when it lands.',
]

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
      <aside className="auth-aside dark relative hidden flex-col overflow-hidden border-r border-border bg-background p-10 lg:flex xl:p-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 marketing-grid opacity-60" />
          <div className="absolute -left-32 top-1/4 h-[420px] w-[420px] rounded-full bg-brand/20 blur-[130px]" />
          <div className="absolute -right-24 bottom-0 h-[340px] w-[340px] rounded-full bg-magenta/15 blur-[120px]" />
          <div className="absolute inset-x-0 top-0 h-64 bg-grid-fade" />
        </div>

        <Link href="/" className="relative z-10 w-fit rounded-lg focus-ring" aria-label="FrameForge AI home">
          <Logo />
        </Link>

        <div className="auth-hero relative z-10 my-auto max-w-lg py-14">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-brand-bright">
            The AI-native studio
          </p>
          <p className="mt-6 text-[clamp(2.4rem,4vw,3.8rem)] font-medium leading-[0.95] tracking-tightest text-foreground">
            Make the first cut
            <span className="mt-1 block font-serif italic text-gradient">before the doubt.</span>
          </p>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            Bring a thought. Leave with a shot list, a timeline, and a finished cut. FrameForge
            keeps the whole story in one workspace.
          </p>

          <ul className="mt-8 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[13px] leading-relaxed text-muted-foreground">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-brand/30 bg-brand/10 text-brand-bright">
                  <Check className="h-3 w-3" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-timeline relative z-10 overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-3 shadow-panel backdrop-blur">
          <div className="flex items-center justify-between px-2 pb-2.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
              Aurora — Sequence 01
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#8ff3d4]/25 bg-[#8ff3d4]/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8ff3d4]">
              <span className="h-1 w-1 rounded-full bg-[#8ff3d4]" />
              Autosaved
            </span>
          </div>
          <div className="auth-timeline-visual relative aspect-[16/7] overflow-hidden rounded-lg bg-[linear-gradient(120deg,#041014,#0a3438_48%,#1b6b63_100%)]">
            <div className="absolute inset-0 clip-stripes opacity-20" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(143,243,212,0.28),transparent_45%)]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute left-4 top-4 font-mono text-[8px] uppercase tracking-[0.18em] text-white/55">
              Cam A · 35mm
            </div>
            <div className="absolute bottom-4 left-4">
              <p className="font-serif text-2xl italic text-white/90">Aurora</p>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-white/45">
                Light above a quiet coast
              </p>
            </div>
            <span className="absolute bottom-4 right-4 grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-black/30 text-white backdrop-blur">
              <Play className="h-3 w-3 translate-x-px" />
            </span>
          </div>
          <div className="flex items-center gap-2 px-2 pt-3">
            <span className="font-mono text-[8px] text-faint">00:12</span>
            <div className="flex h-8 flex-1 items-center gap-1 rounded-md border border-border/70 bg-surface-2/70 px-2">
              <span className="h-4 w-1/3 rounded-sm bg-[#8ff3d4]/20" />
              <span className="h-4 w-1/4 rounded-sm bg-brand/25" />
              <span className="h-4 w-1/5 rounded-sm bg-magenta/20" />
              <span className="h-px flex-1 bg-border" />
            </div>
            <Sparkles className="h-3.5 w-3.5 text-brand-bright" />
            <Layers className="h-3.5 w-3.5 text-faint" />
          </div>
        </div>

        <div className="auth-footer relative z-10 mt-8 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
          <span>Local-first preview</span>
          <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
            Back to site
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </aside>

      <main className="relative flex min-h-[100dvh] flex-col px-5 py-5 sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-grid-fade opacity-60 lg:hidden" />
        <div className="relative flex items-center justify-between">
          <Link href="/" className="rounded-lg focus-ring lg:hidden" aria-label="FrameForge AI home">
            <Logo />
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center py-10 sm:py-14">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brand-bright">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-[clamp(2rem,6vw,2.8rem)] font-medium leading-[1.02] tracking-tightest">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>

          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">{footer}</div>
        </div>
      </main>
    </div>
  )
}
