import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  markClassName?: string
  showWordmark?: boolean
  showBadge?: boolean
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
  showBadge = true,
}: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'relative grid h-8 w-8 place-items-center overflow-hidden rounded-[10px] bg-[linear-gradient(140deg,hsl(var(--brand-deep)),hsl(var(--brand))_55%,hsl(var(--magenta)))] shadow-[0_4px_18px_-6px_hsl(var(--brand)/0.8),inset_0_1px_0_0_rgba(255,255,255,0.35)]',
          markClassName
        )}
        aria-hidden="true"
      >
        <span className="absolute inset-[1px] rounded-[9px] border border-white/20" />
        <svg viewBox="0 0 24 24" className="relative h-[18px] w-[18px]" fill="none">
          <path
            d="M6.25 5.25h11.5v13.5H6.25z"
            stroke="white"
            strokeOpacity="0.42"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M6.25 9.25h11.5M6.25 14.75h11.5" stroke="white" strokeOpacity="0.3" strokeWidth="1" />
          <path d="M10.4 8.35v7.3L16.5 12l-6.1-3.65Z" fill="white" />
        </svg>
      </span>
      {showWordmark ? (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-semibold tracking-[-0.025em] text-foreground">
            FrameForge
          </span>
          {showBadge ? (
            <span className="rounded border border-brand/35 bg-brand/10 px-1 py-px font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-brand-bright">
              AI
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  )
}
