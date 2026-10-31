'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AuthOAuthButtons } from '@/components/auth-oauth-buttons'
import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

export default function SignInPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    try {
      await api.post('/auth/sign-in', formData)
      toast.success('Signed in successfully')
      router.push('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(true)
    try {
      await api.post(`/auth/oauth/${provider}`, { idToken: 'mock-token' })
      toast.success(`Signed in with ${provider}`)
      router.push('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to sign in with ${provider}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back."
      description="Pick up your timeline, your renders, and the story you left in motion."
      footer={
        <>
          New to FrameForge?{' '}
          <Link href="/auth/sign-up" className="font-medium text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)] sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@studio.com"
              autoComplete="email"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              required
            />
          </div>
          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Signing in…' : 'Sign in'}
            {!loading ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-2 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              Or continue with
            </span>
          </div>
        </div>

        <AuthOAuthButtons disabled={loading} onSelect={handleOAuth} />

        <p className="mt-5 text-center text-[11px] leading-relaxed text-faint">
          By continuing you agree to the studio terms and privacy policy.
        </p>
      </div>
    </AuthShell>
  )
}
