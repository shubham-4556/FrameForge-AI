'use client'

import * as React from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CreditCard,
  Crown,
  HardDrive,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  PLAN_DEFINITIONS,
  hasMinimumRole,
  type Plan,
  type WorkspaceRole,
} from '@frameforge/shared'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { useWorkspace } from '@/components/workspace-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import type { BillingOverview, WorkspaceDetail, WorkspaceMember } from '@/lib/types'
import { cn, formatBytes, timeAgo } from '@/lib/utils'

const GIB = 1024 ** 3

const SAMPLE_MEMBERS: WorkspaceMember[] = [
  {
    id: 'sample-member-1',
    userId: 'sample-user-1',
    name: 'Alex Morgan',
    email: 'alex@northlight.studio',
    avatarUrl: null,
    role: 'OWNER',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 210).toISOString(),
  },
  {
    id: 'sample-member-2',
    userId: 'sample-user-2',
    name: 'Priya Shah',
    email: 'priya@northlight.studio',
    avatarUrl: null,
    role: 'ADMIN',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 96).toISOString(),
  },
  {
    id: 'sample-member-3',
    userId: 'sample-user-3',
    name: 'Jonas Reed',
    email: 'jonas@northlight.studio',
    avatarUrl: null,
    role: 'EDITOR',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
  },
]

const SAMPLE_BILLING: BillingOverview = {
  plan: PLAN_DEFINITIONS.PRO,
  subscription: {
    status: 'active',
    provider: 'preview',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  },
  usage: {
    storageBytes: 18.4 * GIB,
    renderSeconds: 1548,
    renderMinutes: 25.8,
    aiCredits: 312,
    exports: 14,
    projects: 9,
    members: 3,
  },
  limits: {
    storageBytes: PLAN_DEFINITIONS.PRO.storageGb * GIB,
    renderMinutes: PLAN_DEFINITIONS.PRO.renderMinutesPerMonth,
    aiCredits: PLAN_DEFINITIONS.PRO.aiCreditsPerMonth,
    maxProjects: PLAN_DEFINITIONS.PRO.maxProjects,
    maxMembers: PLAN_DEFINITIONS.PRO.maxMembers,
  },
  period: {
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
  },
  role: 'OWNER',
  canManage: true,
  billingConfigured: false,
  plans: Object.values(PLAN_DEFINITIONS),
}

const ROLE_COPY: Record<WorkspaceRole, string> = {
  OWNER: 'Full control, billing, and workspace ownership.',
  ADMIN: 'Manage members, settings, and every project.',
  EDITOR: 'Create projects, upload media, and queue exports.',
  VIEWER: 'Review projects and download finished exports.',
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'FF'
}

function roleBadgeVariant(role: WorkspaceRole) {
  return role === 'OWNER' ? 'brand' : role === 'ADMIN' ? 'default' : role === 'EDITOR' ? 'outline' : 'muted'
}

const selectClass =
  'h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none transition-colors focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-ring/50'

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  action,
}: {
  title: string
  description?: string
  icon: typeof UserPlus
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4 text-brand-bright" />
            {title}
          </CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  )
}

function SettingsContent() {
  const {
    workspace,
    workspaceId,
    session,
    isPreview,
    needsAuth,
    isLoading: sessionLoading,
    signOut,
  } = useWorkspace()
  const queryClient = useQueryClient()

  const [profileName, setProfileName] = React.useState('')
  const [workspaceName, setWorkspaceName] = React.useState('')
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRole, setInviteRole] = React.useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('EDITOR')
  const [removeTarget, setRemoveTarget] = React.useState<WorkspaceMember | null>(null)

  React.useEffect(() => {
    if (session?.user.name) setProfileName(session.user.name)
  }, [session?.user.name])

  React.useEffect(() => {
    if (workspace?.name) setWorkspaceName(workspace.name)
  }, [workspace?.name])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const billingState = params.get('billing')
    if (billingState === 'success') {
      toast.success('Checkout complete', {
        description: 'Your plan updates as soon as Stripe confirms the subscription.',
      })
      void queryClient.invalidateQueries({ queryKey: ['billing'] })
      void queryClient.invalidateQueries({ queryKey: ['session'] })
    } else if (billingState === 'canceled') {
      toast.message('Checkout canceled', { description: 'Your current plan was not changed.' })
    }
    if (billingState) {
      params.delete('billing')
      const query = params.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
    }
  }, [queryClient])

  const billingQuery = useQuery({
    queryKey: ['billing', workspaceId],
    queryFn: () => api.get<BillingOverview>(`/workspaces/${workspaceId}/billing`),
    enabled: Boolean(workspaceId) && !isPreview,
    staleTime: 30_000,
  })

  const membersQuery = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
    enabled: Boolean(workspaceId) && !isPreview,
  })

  const workspaceQuery = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api.get<WorkspaceDetail>(`/workspaces/${workspaceId}`),
    enabled: Boolean(workspaceId) && !isPreview,
    staleTime: 60_000,
  })

  const workspaceDetail = workspaceQuery.data
  const billing = isPreview ? SAMPLE_BILLING : billingQuery.data
  const role: WorkspaceRole = billing?.role ?? workspace?.role ?? 'VIEWER'
  const canManage = !isPreview && (billing?.canManage ?? hasMinimumRole(role, 'ADMIN'))
  const members = isPreview ? SAMPLE_MEMBERS : (membersQuery.data ?? [])

  const invalidateWorkspace = () => {
    void queryClient.invalidateQueries({ queryKey: ['session'] })
    void queryClient.invalidateQueries({ queryKey: ['workspace'] })
    void queryClient.invalidateQueries({ queryKey: ['billing'] })
  }

  const profileMutation = useMutation({
    mutationFn: (name: string) => api.patch('/auth/profile', { name }),
    onSuccess: () => {
      toast.success('Profile updated')
      void queryClient.invalidateQueries({ queryKey: ['session'] })
    },
    onError: (error) => toast.error('Could not update profile', { description: (error as Error).message }),
  })

  const passwordMutation = useMutation({
    mutationFn: () =>
      api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      }),
    onSuccess: () => {
      toast.success('Password changed', { description: 'Use the new password on your next sign-in.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (error) => toast.error('Could not change password', { description: (error as Error).message }),
  })

  const renameMutation = useMutation({
    mutationFn: (name: string) => api.patch(`/workspaces/${workspaceId}`, { name }),
    onSuccess: () => {
      toast.success('Workspace renamed')
      invalidateWorkspace()
    },
    onError: (error) => toast.error('Could not rename workspace', { description: (error as Error).message }),
  })

  const inviteMutation = useMutation({
    mutationFn: () =>
      api.post<WorkspaceMember>(`/workspaces/${workspaceId}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      }),
    onSuccess: (member) => {
      toast.success('Member added', { description: `${member.email} joined as ${member.role.toLowerCase()}.` })
      setInviteEmail('')
      setInviteRole('EDITOR')
      void queryClient.invalidateQueries({ queryKey: ['members'] })
      void queryClient.invalidateQueries({ queryKey: ['billing'] })
    },
    onError: (error) => toast.error('Could not add member', { description: (error as Error).message }),
  })

  const roleMutation = useMutation({
    mutationFn: ({ member, nextRole }: { member: WorkspaceMember; nextRole: WorkspaceRole }) =>
      api.patch(`/workspaces/${workspaceId}/members/${member.id}`, { role: nextRole }),
    onSuccess: () => {
      toast.success('Member role updated')
      void queryClient.invalidateQueries({ queryKey: ['members'] })
    },
    onError: (error) => toast.error('Could not update role', { description: (error as Error).message }),
  })

  const removeMutation = useMutation({
    mutationFn: (member: WorkspaceMember) =>
      api.delete(`/workspaces/${workspaceId}/members/${member.id}`),
    onSuccess: () => {
      toast.success('Member removed')
      setRemoveTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['members'] })
      void queryClient.invalidateQueries({ queryKey: ['billing'] })
    },
    onError: (error) => toast.error('Could not remove member', { description: (error as Error).message }),
  })

  const checkoutMutation = useMutation({
    mutationFn: (plan: 'PRO' | 'STUDIO') =>
      api.post<{ url: string }>(`/workspaces/${workspaceId}/billing/checkout`, { plan }),
    onSuccess: (result) => window.location.assign(result.url),
    onError: (error) => toast.error('Could not start checkout', { description: (error as Error).message }),
  })

  const portalMutation = useMutation({
    mutationFn: () => api.post<{ url: string }>(`/workspaces/${workspaceId}/billing/portal`, {}),
    onSuccess: (result) => window.location.assign(result.url),
    onError: (error) => toast.error('Could not open billing portal', { description: (error as Error).message }),
  })

  const submitProfile = (event: React.FormEvent) => {
    event.preventDefault()
    const name = profileName.trim()
    if (name.length < 2) {
      toast.error('Name is too short', { description: 'Use at least 2 characters.' })
      return
    }
    if (name === session?.user.name) return
    profileMutation.mutate(name)
  }

  const submitPassword = (event: React.FormEvent) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error('Choose a stronger password', {
        description: 'Use at least 10 characters with a letter and a number.',
      })
      return
    }
    passwordMutation.mutate()
  }

  const submitWorkspace = (event: React.FormEvent) => {
    event.preventDefault()
    const name = workspaceName.trim()
    if (name.length < 2) {
      toast.error('Workspace name is too short', { description: 'Use at least 2 characters.' })
      return
    }
    if (name === workspace?.name) return
    renameMutation.mutate(name)
  }

  const submitInvite = (event: React.FormEvent) => {
    event.preventDefault()
    if (!inviteEmail.trim()) {
      toast.error('Enter an email address')
      return
    }
    inviteMutation.mutate()
  }

  const plan = billing?.plan ?? PLAN_DEFINITIONS[(workspace?.plan as Plan) ?? 'FREE']
  const usage = billing?.usage
  const limits = billing?.limits
  const subscription = billing?.subscription ?? null
  const demoName = isPreview ? 'Alex Morgan' : (session?.user.name ?? 'Your profile')
  const demoEmail = isPreview ? 'alex@northlight.studio' : (session?.user.email ?? '')
  const workspaceDisplayName = isPreview ? 'Northlight Studio' : (workspace?.name ?? 'Your workspace')

  const usageRows = usage && limits
    ? [
        {
          label: 'AI credits',
          used: `${usage.aiCredits}`,
          limit: `${limits.aiCredits}`,
          percent: limits.aiCredits > 0 ? (usage.aiCredits / limits.aiCredits) * 100 : 0,
        },
        {
          label: 'Render minutes',
          used: `${usage.renderMinutes}`,
          limit: `${limits.renderMinutes}`,
          percent: limits.renderMinutes > 0 ? (usage.renderMinutes / limits.renderMinutes) * 100 : 0,
        },
        {
          label: 'Media storage',
          used: formatBytes(usage.storageBytes),
          limit: formatBytes(limits.storageBytes),
          percent: limits.storageBytes > 0 ? (usage.storageBytes / limits.storageBytes) * 100 : 0,
        },
        {
          label: 'Projects',
          used: `${usage.projects}`,
          limit: `${limits.maxProjects}`,
          percent: limits.maxProjects > 0 ? (usage.projects / limits.maxProjects) * 100 : 0,
        },
        {
          label: 'Seats',
          used: `${usage.members}`,
          limit: `${limits.maxMembers}`,
          percent: limits.maxMembers > 0 ? (usage.members / limits.maxMembers) * 100 : 0,
        },
      ]
    : []

  const upgrades = (billing?.plans ?? Object.values(PLAN_DEFINITIONS)).filter(
    (candidate) => candidate.priceMonthlyUsd > plan.priceMonthlyUsd
  )

  const inviteRoleOptions: Array<'ADMIN' | 'EDITOR' | 'VIEWER'> =
    role === 'OWNER' ? ['ADMIN', 'EDITOR', 'VIEWER'] : ['EDITOR', 'VIEWER']

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace settings"
        title="Set the stage."
        description="Your profile, your team, and the plan behind the studio. Changes are applied to this workspace immediately."
        actions={
          <>
            <Badge variant={roleBadgeVariant(role)} className="h-9 px-3 text-[10px] uppercase tracking-[0.1em]">
              {role}
            </Badge>
            <Badge variant="outline" className="h-9 px-3 font-mono text-[10px] uppercase tracking-[0.08em]">
              {plan.name} plan
            </Badge>
            {session ? (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => void signOut()}>
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline" className="h-9">
                <Link href="/auth/sign-in">Sign in</Link>
              </Button>
            )}
          </>
        }
      />

      {isPreview ? (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Badge variant="warning" className="mt-0.5 shrink-0 text-[9px] uppercase tracking-[0.1em]">
              Preview data
            </Badge>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Sample profile, team, and plan data. {needsAuth ? 'Sign in' : 'Connect the API'} to edit your
              real workspace settings.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="h-8 shrink-0">
            <Link href={needsAuth ? '/auth/sign-in' : '/dashboard'}>
              {needsAuth ? 'Sign in' : 'Connect workspace'}
            </Link>
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue="profile">
        <TabsList className="flex h-auto w-full flex-wrap justify-start bg-surface-2/50 p-1 lg:w-auto lg:flex-nowrap">
          <TabsTrigger value="profile" className="gap-1.5 px-3 py-1.5">
            <Shield className="h-3.5 w-3.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="workspace" className="gap-1.5 px-3 py-1.5">
            <Crown className="h-3.5 w-3.5" />
            Workspace
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5 px-3 py-1.5">
            <Users className="h-3.5 w-3.5" />
            Team
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5 px-3 py-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Plan & usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <SectionCard
            title="Profile"
            description="How you appear across projects, comments, and exports."
            icon={BadgeCheck}
          >
            {sessionLoading && !isPreview ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <form onSubmit={submitProfile} className="space-y-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/15 font-mono text-sm font-semibold text-brand-bright">
                    {initials(demoName)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{demoName}</p>
                    <p className="text-[11px] text-muted-foreground">{demoEmail || 'No email on this session'}</p>
                  </div>
                  {session?.user.emailVerified || isPreview ? (
                    <Badge variant="success" className="ml-auto text-[9px] uppercase tracking-[0.08em]">
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="ml-auto text-[9px] uppercase tracking-[0.08em]">
                      Unverified
                    </Badge>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="profile-name">Full name</Label>
                  <Input
                    id="profile-name"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    placeholder={isPreview ? 'Alex Morgan' : 'Your name'}
                    disabled={isPreview || profileMutation.isPending}
                    autoComplete="name"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input id="profile-email" value={demoEmail} readOnly disabled />
                  <p className="text-[10px] leading-relaxed text-faint">
                    Email changes are not available in this build. Contact support if your address needs
                    updating.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      isPreview ||
                      profileMutation.isPending ||
                      profileName.trim().length < 2 ||
                      profileName.trim() === session?.user.name
                    }
                  >
                    {profileMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Save profile
                  </Button>
                  {isPreview ? (
                    <span className="text-[10px] text-faint">Sign in to edit your real profile.</span>
                  ) : null}
                </div>
              </form>
            )}
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="Password"
              description="Use a unique password for FrameForge."
              icon={KeyRound}
            >
              <form onSubmit={submitPassword} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    disabled={isPreview || passwordMutation.isPending}
                    autoComplete="current-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={isPreview || passwordMutation.isPending}
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={isPreview || passwordMutation.isPending}
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={
                    isPreview ||
                    passwordMutation.isPending ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                >
                  {passwordMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                  Change password
                </Button>
              </form>
            </SectionCard>

            <SectionCard title="Session" description="This browser's active session." icon={Shield}>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="flex items-center justify-between gap-3">
                  <span>Signed in as</span>
                  <span className="truncate font-medium text-foreground">{demoEmail || 'Preview session'}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span>Session expires</span>
                  <span className="font-medium text-foreground">
                    {session ? timeAgo(session.session.expiresAt) : '—'}
                  </span>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => void signOut()}
                disabled={!session}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="workspace" className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <SectionCard
            title="Workspace identity"
            description="The name and address your team sees."
            icon={Crown}
          >
            <form onSubmit={submitWorkspace} className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="workspace-name">Workspace name</Label>
                <Input
                  id="workspace-name"
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder={workspaceDisplayName}
                  disabled={isPreview || !canManage || renameMutation.isPending}
                  autoComplete="organization"
                />
                {!canManage && !isPreview ? (
                  <p className="text-[10px] text-faint">Only owners and admins can rename this workspace.</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="workspace-slug">Workspace slug</Label>
                <Input
                  id="workspace-slug"
                  value={workspaceDetail?.slug ?? workspace?.slug ?? 'northlight-studio'}
                  readOnly
                  disabled
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-faint">Slugs are generated once and locked to the workspace.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    isPreview ||
                    !canManage ||
                    renameMutation.isPending ||
                    workspaceName.trim().length < 2 ||
                    workspaceName.trim() === workspace?.name
                  }
                >
                  {renameMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save workspace
                </Button>
                <span className="text-[10px] text-faint">
                  Created {workspaceDetail ? timeAgo(workspaceDetail.createdAt) : 'in preview'}
                </span>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Access" description="What your role can do in this workspace." icon={Shield}>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-2/35 p-3">
                <div>
                  <p className="text-xs font-medium text-foreground">Your role</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                    {ROLE_COPY[role]}
                  </p>
                </div>
                <Badge variant={roleBadgeVariant(role)} className="shrink-0 text-[9px] uppercase tracking-[0.08em]">
                  {role}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-2/35 p-3">
                <div>
                  <p className="text-xs font-medium text-foreground">Current plan</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{plan.tagline}</p>
                </div>
                <Badge variant="outline" className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em]">
                  {plan.name}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-2/35 p-3">
                <div>
                  <p className="text-xs font-medium text-foreground">Billing state</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {subscription ? `Provider: ${subscription.provider}` : 'No paid subscription'}
                  </p>
                </div>
                <Badge
                  variant={subscription?.status === 'active' ? 'success' : subscription ? 'warning' : 'muted'}
                  className="shrink-0 text-[9px] uppercase tracking-[0.08em]"
                >
                  {subscription?.status ?? 'Free'}
                </Badge>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="team" className="space-y-5">
          <SectionCard
            title="Invite a teammate"
            description="Add an existing FrameForge account to this workspace."
            icon={UserPlus}
            action={
              usage && limits ? (
                <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.08em]">
                  {usage.members} / {limits.maxMembers} seats
                </Badge>
              ) : null
            }
          >
            {canManage || isPreview ? (
              <form onSubmit={submitInvite} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end">
                <div className="grid gap-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="teammate@studio.com"
                      className="pl-9"
                      disabled={isPreview || inviteMutation.isPending}
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <select
                    id="invite-role"
                    className={selectClass}
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value as 'ADMIN' | 'EDITOR' | 'VIEWER')}
                    disabled={isPreview || inviteMutation.isPending}
                  >
                    {inviteRoleOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.charAt(0) + option.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" size="sm" className="h-9" disabled={isPreview || inviteMutation.isPending}>
                  {inviteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add member
                </Button>
              </form>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Only workspace owners and admins can invite members. Ask an admin if you need access for a
                teammate.
              </p>
            )}
            {canManage || isPreview ? (
              <p className="mt-3 text-[10px] leading-relaxed text-faint">
                The account must already exist. Invites grant access immediately; FrameForge does not send a
                pending invitation email in this build.
              </p>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Members"
            description="Roles control editing, exports, and workspace administration."
            icon={Users}
            action={
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => void membersQuery.refetch()}
                disabled={isPreview || membersQuery.isFetching}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', membersQuery.isFetching && 'animate-spin')} />
                Refresh
              </Button>
            }
          >
            {!isPreview && membersQuery.isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : !isPreview && membersQuery.isError ? (
              <div className="rounded-xl border border-danger/30 bg-danger/[0.06] p-4">
                <p className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-danger" />
                  Could not load members
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {(membersQuery.error as Error).message}
                </p>
                <Button size="sm" variant="outline" className="mt-3 h-8" onClick={() => void membersQuery.refetch()}>
                  Try again
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {members.map((member) => {
                  const isSelf = member.userId === session?.user.id
                  const manageable =
                    canManage &&
                    member.role !== 'OWNER' &&
                    !isSelf &&
                    (role === 'OWNER' || member.role !== 'ADMIN')
                  const options: WorkspaceRole[] =
                    role === 'OWNER' ? ['ADMIN', 'EDITOR', 'VIEWER'] : ['EDITOR', 'VIEWER']
                  return (
                    <div key={member.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 font-mono text-[10px] text-brand-bright">
                        {initials(member.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-foreground">
                          <span className="truncate">{member.name}</span>
                          {isSelf ? <span className="text-[10px] font-normal text-faint">(you)</span> : null}
                          <Badge variant={roleBadgeVariant(member.role)} className="text-[8px] uppercase tracking-[0.08em]">
                            {member.role}
                          </Badge>
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">{member.email}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {manageable ? (
                          <>
                            <select
                              aria-label={`Role for ${member.name}`}
                              className={cn(selectClass, 'h-8 w-[108px]')}
                              value={member.role}
                              onChange={(event) =>
                                roleMutation.mutate({
                                  member,
                                  nextRole: event.target.value as WorkspaceRole,
                                })
                              }
                              disabled={roleMutation.isPending}
                            >
                              {options.map((option) => (
                                <option key={option} value={option}>
                                  {option.charAt(0) + option.slice(1).toLowerCase()}
                                </option>
                              ))}
                            </select>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Remove ${member.name}`}
                              onClick={() => setRemoveTarget(member)}
                              disabled={removeMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-[10px] text-faint">
                            Joined {timeAgo(member.joinedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="billing" className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          {!isPreview && billingQuery.isError ? (
            <div className="rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-4 xl:col-span-2">
              <p className="flex items-center gap-2 text-xs font-medium text-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-danger" />
                Could not load billing and usage
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {(billingQuery.error as Error).message}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 h-8"
                onClick={() => void billingQuery.refetch()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </Button>
            </div>
          ) : null}
          <div className="space-y-5">
            <SectionCard title="Current plan" description="Your subscription and workspace seat." icon={Crown}>
              {!isPreview && billingQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-48" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-medium tracking-[-0.03em] text-foreground">{plan.name}</p>
                        <Badge variant={plan.id === 'FREE' ? 'muted' : 'brand'} className="text-[9px] uppercase tracking-[0.08em]">
                          {subscription?.status ?? 'Free'}
                        </Badge>
                      </div>
                      <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">{plan.tagline}</p>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
                        ${plan.priceMonthlyUsd} / month
                        {subscription?.currentPeriodEnd
                          ? ` · renews ${timeAgo(subscription.currentPeriodEnd)}`
                          : ''}
                      </p>
                    </div>
                    {canManage && subscription?.provider === 'stripe' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => portalMutation.mutate()}
                        disabled={portalMutation.isPending}
                      >
                        {portalMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                        Manage billing
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {plan.features.map((feature) => (
                      <p key={feature} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                        {feature}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Usage this month" description="Reset at the start of each billing period." icon={HardDrive}>
              {!isPreview && billingQuery.isLoading ? (
                <div className="space-y-4">
                  {[0, 1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-10 w-full" />
                  ))}
                </div>
              ) : usageRows.length ? (
                <div className="space-y-4">
                  {usageRows.map((row) => (
                    <div key={row.label}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px]">
                        <span className="font-medium text-foreground">{row.label}</span>
                        <span className="font-mono text-faint">
                          {row.used} / {row.limit}
                        </span>
                      </div>
                      <Progress value={Math.min(100, row.percent)} className="h-1.5" />
                    </div>
                  ))}
                  {subscription?.cancelAtPeriodEnd ? (
                    <p className="rounded-lg border border-warning/25 bg-warning/[0.06] px-3 py-2 text-[10px] text-warning">
                      This subscription cancels at the end of the current period.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Usage appears here once the workspace is connected to the API.
                </p>
              )}
            </SectionCard>
          </div>

          <div className="space-y-5">
            <SectionCard title="Upgrade" description="More render minutes, storage, and seats." icon={Crown}>
              {upgrades.length ? (
                <div className="space-y-3">
                  {upgrades.map((candidate) => (
                    <div key={candidate.id} className="rounded-xl border border-border/70 bg-surface-2/30 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{candidate.name}</p>
                          <p className="text-[10px] text-muted-foreground">{candidate.tagline}</p>
                        </div>
                        <p className="shrink-0 font-mono text-xs text-foreground">${candidate.priceMonthlyUsd}/mo</p>
                      </div>
                      <ul className="mt-2.5 space-y-1">
                        {candidate.features.slice(0, 3).map((feature) => (
                          <li key={feature} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                            <Check className="mt-0.5 h-2.5 w-2.5 shrink-0 text-success" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        className="mt-3 h-8 w-full"
                        variant="outline"
                        disabled={
                          isPreview ||
                          !canManage ||
                          !billing?.billingConfigured ||
                          checkoutMutation.isPending
                        }
                        onClick={() => checkoutMutation.mutate(candidate.id as 'PRO' | 'STUDIO')}
                      >
                        {checkoutMutation.isPending && checkoutMutation.variables === candidate.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5" />
                        )}
                        Upgrade to {candidate.name}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  You are on the highest self-serve plan. Contact us for volume pricing.
                </p>
              )}

              {billing && !billing.billingConfigured ? (
                <p className="mt-3 rounded-lg border border-border/70 bg-surface-2/40 px-3 py-2 text-[10px] leading-relaxed text-faint">
                  Online upgrades are not available in this deployment yet. Stripe billing must be configured
                  before checkout can start.
                </p>
              ) : null}
              {!canManage && !isPreview ? (
                <p className="mt-3 text-[10px] text-faint">
                  Only workspace owners and admins can change the plan.
                </p>
              ) : null}
            </SectionCard>

            <SectionCard title="Plan comparison" description="Every plan includes the timeline editor." icon={CreditCard}>
              <div className="space-y-2">
                {(billing?.plans ?? Object.values(PLAN_DEFINITIONS)).map((candidate) => (
                  <div
                    key={candidate.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-[11px]',
                      candidate.id === plan.id
                        ? 'border-brand/40 bg-brand/[0.06] text-foreground'
                        : 'border-border/60 text-muted-foreground'
                    )}
                  >
                    <span className="font-medium">{candidate.name}</span>
                    <span className="font-mono text-[10px]">
                      {candidate.priceMonthlyUsd === 0 ? 'Free' : `$${candidate.priceMonthlyUsd}/mo`}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this member?</DialogTitle>
            <DialogDescription>
              {removeTarget
                ? `${removeTarget.name} will lose access to this workspace immediately. Their uploads and projects stay in place.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>
              Keep member
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeTarget && removeMutation.mutate(removeTarget)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? 'Removing…' : 'Remove member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  )
}
