import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  className?: string
}

export function StatCard({ label, value, icon: Icon, hint, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 transition-colors hover:border-border-strong',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">{label}</p>
          <p className="mt-2 font-mono text-2xl tracking-tight text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-border/70 bg-surface-2 text-muted-foreground transition-colors group-hover:text-brand-bright">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  )
}
