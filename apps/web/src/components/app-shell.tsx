'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ChevronDown,
  Clapperboard,
  Download,
  FolderOpen,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { NewProjectDialog } from '@/components/new-project-dialog'
import { ThemeToggle } from '@/components/theme-toggle'
import { WorkspaceProvider, useWorkspace } from '@/components/workspace-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api'
import type { WorkspaceDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ai', label: 'AI Studio', icon: Wand2 },
  { href: '/media', label: 'Media Library', icon: FolderOpen },
  { href: '/exports', label: 'Exports', icon: Download },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function initials(name: string | undefined) {
  if (!name) return 'FF'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { workspace, workspaces, setWorkspaceId, isPreview, session } = useWorkspace()

  const workspaceQuery = useQuery({
    queryKey: ['workspace', workspace?.id],
    queryFn: () => api.get<WorkspaceDetail>(`/workspaces/${workspace?.id}`),
    enabled: Boolean(workspace?.id) && !isPreview,
    staleTime: 60_000,
  })

  const usage = workspaceQuery.data?.usage.usage
  const limits = workspaceQuery.data?.usage.limits
  const creditPercent =
    usage && limits && limits.aiCredits > 0
      ? Math.min(100, Math.round((usage.aiCredits / limits.aiCredits) * 100))
      : 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link href="/" className="focus-ring rounded-lg" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      <div className="px-3">
        {workspace ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-xl border border-border/80 bg-surface-2/60 px-3 py-2.5 text-left transition-colors hover:border-border-strong">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand/15 font-mono text-[10px] font-semibold text-brand-bright">
                  {workspace.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">
                    {workspace.name}
                  </span>
                  <span className="block text-[10px] uppercase tracking-[0.16em] text-faint">
                    {workspace.plan} plan
                  </span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-faint" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[248px]">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              {workspaces.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onSelect={() => setWorkspaceId(item.id)}
                  className="justify-between"
                >
                  <span className="truncate">{item.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-faint">{item.plan}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" onClick={onNavigate}>
                  <Settings className="h-4 w-4" />
                  Workspace settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="rounded-xl border border-dashed border-border-strong/60 px-3 py-2.5">
            <p className="text-xs font-medium text-foreground">Preview workspace</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-faint">
              Not connected
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex-1 px-3">
        <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-faint">
          Studio
        </p>
        <nav className="space-y-1" aria-label="Studio">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                  active
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <item.icon
                  className={cn(
                    'h-4 w-4',
                    active ? 'text-brand-bright' : 'text-faint group-hover:text-muted-foreground'
                  )}
                />
                {item.label}
                {active ? <span className="ml-auto h-1 w-1 rounded-full bg-brand" /> : null}
              </Link>
            )
          })}
        </nav>

        <p className="px-2 pb-2 pt-6 text-[10px] font-medium uppercase tracking-[0.2em] text-faint">
          Create
        </p>
        <NewProjectDialog
          variant="outline"
          size="sm"
          label="New project"
          className="w-full justify-start border-dashed"
        />
      </div>

      <div className="p-3">
        <div className="rounded-xl border border-border/80 bg-surface-2/50 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-foreground">AI credits</span>
            <span className="font-mono text-[10px] text-faint">
              {usage && limits ? `${usage.aiCredits} / ${limits.aiCredits}` : '—'}
            </span>
          </div>
          <Progress value={creditPercent} className="mt-2.5 h-1" />
          <p className="mt-2 text-[10px] leading-relaxed text-faint">
            {session ? 'Resets on the first of each month.' : 'Sign in to see workspace usage.'}
          </p>
          {!session ? (
            <Button asChild variant="outline" size="sm" className="mt-2.5 h-7 w-full text-[11px]">
              <Link href="/auth/sign-in" onClick={onNavigate}>
                <LogIn className="h-3 w-3" />
                Sign in
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function AppShellFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const { session, workspace, isPreview, needsAuth, error, signOut, refresh } = useWorkspace()

  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  React.useEffect(() => {
    if (!mobileOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-border/70 bg-surface-1/60 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 w-[280px] border-r border-border bg-surface-1 shadow-panel">
            <button
              className="absolute right-3 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <Clapperboard className="h-3.5 w-3.5 text-faint" />
            <span className="hidden truncate sm:inline">{workspace?.name ?? 'Preview workspace'}</span>
            <span className="hidden text-border-strong sm:inline">/</span>
            <span className="truncate font-medium text-foreground">
              {navItems.find((item) => pathname.startsWith(item.href))?.label ?? 'Studio'}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/ai">
                <Sparkles className="h-3.5 w-3.5" />
                Generate
              </Link>
            </Button>
            <NewProjectDialog size="sm" label="New project" className="h-8" labelClassName="hidden sm:inline" />
            <ThemeToggle className="h-8 w-8" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="grid h-8 w-8 place-items-center rounded-full border border-border-strong/60 bg-surface-3 text-[10px] font-semibold text-foreground transition-colors hover:border-brand/50"
                  aria-label="Account menu"
                >
                  {initials(session?.user.name)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {session ? (
                  <>
                    <DropdownMenuLabel className="normal-case tracking-normal">
                      <span className="block text-xs font-medium text-foreground">
                        {session.user.name}
                      </span>
                      <span className="block truncate text-[11px] text-faint">{session.user.email}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void signOut()} destructive>
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuLabel className="normal-case tracking-normal">
                      {needsAuth ? 'Not signed in' : 'Preview mode'}
                    </DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href="/auth/sign-in">
                        <LogIn className="h-4 w-4" />
                        Sign in
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {isPreview ? (
          <div className="border-b border-warning/20 bg-warning/[0.06] px-4 py-2.5 sm:px-6">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning" />
              <span className="text-warning">
                {needsAuth
                  ? 'Preview mode — sign in to load your real workspace.'
                  : `Preview mode — ${error?.message ?? 'the API is unavailable.'}`}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {needsAuth ? (
                  <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                    <Link href="/auth/sign-in">Sign in</Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={refresh}
                  >
                    Retry connection
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <AppShellFrame>{children}</AppShellFrame>
    </WorkspaceProvider>
  )
}
