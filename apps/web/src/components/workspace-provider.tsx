'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { SessionResponse, WorkspaceSummary } from '@frameforge/shared'
import { api, ApiError } from '@/lib/api'

const STORAGE_KEY = 'frameforge:workspace'

interface WorkspaceContextValue {
  session: SessionResponse | undefined
  workspaces: WorkspaceSummary[]
  workspace: WorkspaceSummary | undefined
  workspaceId: string | undefined
  setWorkspaceId: (id: string) => void
  isLoading: boolean
  isPreview: boolean
  needsAuth: boolean
  error: ApiError | null
  refresh: () => void
  signOut: () => Promise<void>
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [workspaceId, setWorkspaceIdState] = React.useState<string>()

  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: () => api.get<SessionResponse>('/auth/session'),
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const workspaces = sessionQuery.data?.workspaces ?? []

  React.useEffect(() => {
    if (!workspaces.length) return
    const stored =
      typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    const next =
      workspaces.find((candidate) => candidate.id === workspaceId) ??
      workspaces.find((candidate) => candidate.id === stored) ??
      workspaces[0]
    if (next && next.id !== workspaceId) setWorkspaceIdState(next.id)
  }, [workspaces, workspaceId])

  const setWorkspaceId = React.useCallback((id: string) => {
    setWorkspaceIdState(id)
    window.localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const signOut = React.useCallback(async () => {
    try {
      await api.post('/auth/sign-out')
    } catch {
      // Local sessions are still cleared so the user can return to the marketing site.
    }
    queryClient.removeQueries({ queryKey: ['session'] })
    queryClient.clear()
    window.location.href = '/'
  }, [queryClient])

  const workspace = workspaces.find((candidate) => candidate.id === workspaceId) ?? workspaces[0]

  const error =
    sessionQuery.error instanceof ApiError
      ? sessionQuery.error
      : sessionQuery.error
        ? new ApiError((sessionQuery.error as Error).message, 0)
        : null

  const value: WorkspaceContextValue = {
    session: sessionQuery.data,
    workspaces,
    workspace,
    workspaceId: workspace?.id,
    setWorkspaceId,
    isLoading: sessionQuery.isLoading,
    isPreview: !sessionQuery.isLoading && !sessionQuery.data,
    needsAuth: error?.status === 401,
    error,
    refresh: () => void sessionQuery.refetch(),
    signOut,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const context = React.useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used inside WorkspaceProvider')
  }
  return context
}
