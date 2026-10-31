'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ASPECT_RATIOS, FPS_OPTIONS, type AspectRatio, type Fps } from '@frameforge/shared'
import { ArrowRight, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useWorkspace } from '@/components/workspace-provider'
import { Button, type ButtonProps } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface NewProjectDialogProps {
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
  label?: string
  labelClassName?: string
  compact?: boolean
}

const ratioClasses: Record<AspectRatio, string> = {
  '16:9': 'aspect-video w-full',
  '9:16': 'aspect-[9/16] h-9 w-5',
  '1:1': 'aspect-square h-8 w-8',
  '4:5': 'aspect-[4/5] h-9 w-7',
  '4:3': 'aspect-[4/3] h-7 w-10',
  '21:9': 'aspect-[21/9] h-5 w-12',
}

export function NewProjectDialog({
  variant = 'brand',
  size = 'default',
  className,
  label = 'New project',
  labelClassName,
  compact = false,
}: NewProjectDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { workspace, isPreview, needsAuth, isLoading } = useWorkspace()
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [ratio, setRatio] = React.useState<AspectRatio>('16:9')
  const [fps, setFps] = React.useState<Fps>(30)

  const create = useMutation({
    mutationFn: () =>
      api.post<{ id: string; title: string }>('/projects', {
        workspaceId: workspace?.id,
        title: title.trim(),
        aspectRatio: ratio,
        fps,
      }),
    onSuccess: (project) => {
      toast.success('Project created', { description: 'Your timeline is ready.' })
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      setOpen(false)
      setTitle('')
      router.push(`/editor/${project.id}`)
    },
    onError: (error) => {
      toast.error('Could not create project', {
        description: error instanceof ApiError ? error.message : 'Please try again.',
      })
    },
  })

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!workspace || isPreview) return
    if (title.trim().length < 1) {
      toast.error('Give your project a title first')
      return
    }
    create.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className} aria-label={label}>
          <Plus className="h-4 w-4" />
          {!compact ? <span className={labelClassName}>{label}</span> : null}
        </Button>
      </DialogTrigger>
      <DialogContent>
        {isPreview || !workspace ? (
          <>
            <DialogHeader>
              <DialogTitle>{needsAuth ? 'Sign in to start a project' : 'Connect the studio API'}</DialogTitle>
              <DialogDescription>
                {needsAuth
                  ? 'Projects are saved to your workspace. Sign in to create your first timeline.'
                  : 'The web app is running without the API. Start it with `npm run dev:api`, then refresh to create real projects.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button asChild variant="brand">
                <a href={needsAuth ? '/auth/sign-in' : '/dashboard'}>
                  {needsAuth ? 'Sign in' : 'Back to studio'}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Create a project</DialogTitle>
              <DialogDescription>
                Start with a clean timeline. You can change the format before your first render.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="project-title">Project title</Label>
                <Input
                  id="project-title"
                  autoFocus
                  placeholder="Untitled film"
                  value={title}
                  maxLength={120}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Format</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ASPECT_RATIOS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRatio(option)}
                      aria-pressed={ratio === option}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl border p-2.5 text-xs transition-colors',
                        ratio === option
                          ? 'border-brand/60 bg-brand/10 text-foreground'
                          : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                      )}
                    >
                      <span className="flex h-10 w-full items-center justify-center">
                        <span
                          className={cn(
                            'rounded-[3px] border',
                            ratioClasses[option],
                            ratio === option ? 'border-brand bg-brand/20' : 'border-border-strong bg-muted'
                          )}
                        />
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Frame rate</Label>
                <div className="flex flex-wrap gap-2">
                  {FPS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFps(option)}
                      aria-pressed={fps === option}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors',
                        fps === option
                          ? 'border-brand/60 bg-brand/10 text-brand-bright'
                          : 'border-border text-muted-foreground hover:border-border-strong'
                      )}
                    >
                      {option} fps
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="brand" disabled={create.isPending || isLoading}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create project
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
