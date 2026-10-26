'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Loader2, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export default function SignUpPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post('/auth/sign-up', formData)
      toast.success('Account created successfully')
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>
      
      <div className="w-full max-w-md space-y-6 animate-fade-up">
        <div className="flex flex-col items-center space-y-3 text-center">
          <Link href="/" className="flex items-center gap-2 group">
            <Sparkles className="h-10 w-10 text-primary animate-glow group-hover:scale-110 transition-transform" />
            <span className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              FrameForge AI
            </span>
          </Link>
          <p className="text-muted-foreground">Start creating amazing videos today</p>
        </div>

        <Card className="border-2 shadow-2xl hover-glow backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Create your account</CardTitle>
            <CardDescription className="text-center">Get started with your free account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-11"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-11 gap-2 hover-glow" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Creating account...' : 'Sign Up'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              Already have an account?{' '}
              <Link href="/auth/sign-in" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
