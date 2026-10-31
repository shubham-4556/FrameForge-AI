import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border-strong/60 bg-surface-2/30 px-6 py-16 text-center',
        className
      )}
    >
      <div className="absolute inset-0 clip-stripes opacity-30" />
      <div className="relative">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-border bg-card shadow-ring">
          <Icon className="h-5 w-5 text-brand-bright" />
        </span>
        <h2 className="mt-4 text-sm font-medium text-foreground">{title}</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  )
}
