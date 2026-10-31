'use client'

import * as React from 'react'
import Link from 'next/link'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Download, Loader2, TriangleAlert } from 'lucide-react'
import { EXPORT_PRESETS, timelineDurationMs, type TimelineDocument } from '@frameforge/shared'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/api'
import type { RenderJob } from '@/lib/types'
import { cn, formatBytes, formatClock } from '@/lib/utils'

const selectClass =
  'h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-brand/50'

export function EditorExportDialog({
  open,
  onOpenChange,
  projectId,
  timeline,
  dirty,
  sample,
  saveBeforeExport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  timeline: TimelineDocument
  dirty: boolean
  sample: boolean
  saveBeforeExport: () => Promise<number>
}) {
  const [presetId, setPresetId] = React.useState<string>('youtube-1080p')
  const [quality, setQuality] = React.useState<'standard' | 'high' | 'max'>('high')
  const [audioBitrate, setAudioBitrate] = React.useState<128 | 192 | 256>(192)
  const [includeAudio, setIncludeAudio] = React.useState(true)
  const [jobId, setJobId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setPresetId(timeline.aspectRatio === '9:16' ? 'reels-1080p' : 'youtube-1080p')
    setJobId(null)
  }, [open, timeline.aspectRatio])

  const preset = EXPORT_PRESETS.find((item) => item.id === presetId) ?? EXPORT_PRESETS[0]
  const durationMs = timelineDurationMs(timeline)

  const createRender = useMutation({
    mutationFn: async () => {
      const revision = await saveBeforeExport()
      return api.post<RenderJob>(`/projects/${projectId}/renders`, {
        presetId,
        quality,
        audioBitrateKbps: audioBitrate,
        includeAudio,
        revision,
      })
    },
    onSuccess: (job) => {
      setJobId(job.id)
      toast.success('Export queued', { description: 'The render worker will process this revision.' })
    },
    onError: (error) => {
      toast.error('Could not queue export', { description: (error as Error).message })
    },
  })

  const renderQuery = useQuery({
    queryKey: ['render-job', jobId],
    queryFn: () => api.get<RenderJob>(`/renders/${jobId}`),
    enabled: Boolean(jobId) && !sample,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'QUEUED' || status === 'RUNNING' ? 2500 : false
    },
  })

  const download = useMutation({
    mutationFn: () => api.get<{ url: string }>(`/renders/${jobId}/download`),
    onSuccess: (result) => window.open(result.url, '_blank', 'noopener,noreferrer'),
    onError: (error) => toast.error('Download unavailable', { description: (error as Error).message }),
  })

  const job = renderQuery.data
  const busy = createRender.isPending
  const active = job?.status === 'QUEUED' || job?.status === 'RUNNING'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export the cut</DialogTitle>
          <DialogDescription>
            The current timeline revision is rendered to an MP4 by the worker. Nothing is exported
            until a clip exists.
          </DialogDescription>
        </DialogHeader>

        {sample ? (
          <div className="space-y-3 rounded-xl border border-warning/25 bg-warning/[0.06] p-4">
            <p className="flex items-center gap-2 text-xs font-medium text-warning">
              <TriangleAlert className="h-4 w-4" />
              You are viewing a sample project
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Sign in with a connected API to create projects, save timelines, and queue real
              renders. Sample edits stay in this browser tab only.
            </p>
            <Button asChild className="w-full">
              <Link href="/auth/sign-in">Sign in to export</Link>
            </Button>
          </div>
        ) : jobId ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/80 bg-card p-4">
              <div className="flex items-center justify-between">
                <Badge
                  variant={
                    job?.status === 'SUCCEEDED'
                      ? 'success'
                      : job?.status === 'FAILED' || job?.status === 'CANCELED'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {job?.status ?? 'QUEUED'}
                </Badge>
                <span className="font-mono text-[10px] text-muted-foreground">{job?.progress ?? 0}%</span>
              </div>
              <Progress value={job?.progress ?? 0} className="mt-3 h-1.5" />
              <p className="mt-3 text-[11px] text-muted-foreground">
                {active
                  ? 'Render worker is processing the current revision. You can close this dialog and keep editing.'
                  : job?.status === 'SUCCEEDED'
                    ? `${formatClock(job.durationMs ?? durationMs)} · ${job.width ?? ''}×${job.height ?? ''} · ${job.outputSizeBytes ? formatBytes(job.outputSizeBytes) : 'ready'}`
                    : job?.errorMessage ?? 'The render did not complete.'}
              </p>
              {job?.errorCode ? (
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-danger">
                  {job.errorCode}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/exports">View all exports</Link>
              </Button>
              {job?.status === 'SUCCEEDED' ? (
                <Button onClick={() => download.mutate()} disabled={download.isPending}>
                  {download.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download MP4
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setJobId(null)}
                  disabled={active}
                >
                  New export
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Destination preset
                </Label>
                <select
                  value={presetId}
                  onChange={(event) => setPresetId(event.target.value)}
                  className={selectClass}
                >
                  {EXPORT_PRESETS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} — {item.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Quality
                  </Label>
                  <select
                    value={quality}
                    onChange={(event) => setQuality(event.target.value as typeof quality)}
                    className={selectClass}
                  >
                    <option value="standard">Standard · smaller file</option>
                    <option value="high">High · balanced</option>
                    <option value="max">Max · best detail</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Audio bitrate
                  </Label>
                  <select
                    value={audioBitrate}
                    onChange={(event) => setAudioBitrate(Number(event.target.value) as typeof audioBitrate)}
                    className={selectClass}
                  >
                    <option value={128}>128 kbps</option>
                    <option value={192}>192 kbps</option>
                    <option value={256}>256 kbps</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/80 bg-surface-2/40 px-3 py-2.5">
                <div>
                  <p className="text-xs font-medium text-foreground">Include timeline audio</p>
                  <p className="text-[10px] text-muted-foreground">Mix all audio clips in the export.</p>
                </div>
                <Switch checked={includeAudio} onCheckedChange={setIncludeAudio} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Format', 'MP4 · H.264'],
                  ['Frame', `${preset.aspectRatio} · ${preset.fps}fps`],
                  ['Length', formatClock(durationMs)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border/70 bg-card p-2.5">
                    <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">{label}</p>
                    <p className="mt-1 font-mono text-[10px] text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              {dirty ? (
                <p className="rounded-lg border border-brand/20 bg-brand/[0.05] px-3 py-2 text-[10px] text-brand-bright">
                  Unsaved changes will be saved as a new revision before the render starts.
                </p>
              ) : null}

              {durationMs <= 0 ? (
                <p className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/[0.06] px-3 py-2 text-[10px] text-warning">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  Add at least one clip before exporting.
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createRender.mutate()}
                disabled={busy || durationMs <= 0 || sample}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {busy ? 'Saving & queuing…' : 'Queue export'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
