import { Badge } from '@/components/ui/badge'

const MAP: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'outline' }> = {
  DRAFT: { label: 'Draft', variant: 'outline' },
  PROCESSING: { label: 'Processing', variant: 'warning' },
  READY: { label: 'Ready', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'danger' },
  ARCHIVED: { label: 'Archived', variant: 'muted' },
  QUEUED: { label: 'Queued', variant: 'outline' },
  RUNNING: { label: 'Running', variant: 'warning' },
  SUCCEEDED: { label: 'Succeeded', variant: 'success' },
  CANCELED: { label: 'Canceled', variant: 'muted' },
  UPLOADING: { label: 'Uploading', variant: 'warning' },
  DELETED: { label: 'Deleted', variant: 'muted' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = MAP[status] ?? { label: status, variant: 'outline' as const }
  return (
    <Badge variant={config.variant} className="shrink-0">
      <span
        className={
          config.variant === 'warning'
            ? 'h-1.5 w-1.5 rounded-full bg-warning animate-pulse-soft'
            : config.variant === 'success'
              ? 'h-1.5 w-1.5 rounded-full bg-success'
              : config.variant === 'danger'
                ? 'h-1.5 w-1.5 rounded-full bg-danger'
                : 'h-1.5 w-1.5 rounded-full bg-current opacity-60'
        }
      />
      {config.label}
    </Badge>
  )
}
