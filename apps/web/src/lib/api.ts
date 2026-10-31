const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api/v1'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(message: string, status: number, code = 'REQUEST_FAILED', details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    let res: Response
    try {
      res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-frameforge-csrf': '1',
          ...options.headers,
        },
      })
    } catch {
      throw new ApiError(
        'The FrameForge API is unreachable. Start it with `npm run dev:api`.',
        0,
        'API_UNREACHABLE'
      )
    }

    if (!res.ok) {
      const payload = await res.json().catch(() => null)
      const error = payload?.error ?? payload ?? {}
      throw new ApiError(
        typeof error.message === 'string' ? error.message : 'Request failed',
        res.status,
        typeof error.code === 'string' ? error.code : 'REQUEST_FAILED',
        error.details
      )
    }

    if (res.status === 204) return undefined as T
    const data = await res.json()
    return data?.data !== undefined ? data.data : data
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint)
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient()
