import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, Video, Zap, Download } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">FrameForge AI</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-24 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Create Stunning Videos with{' '}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                AI Power
              </span>
            </h1>
            <p className="text-xl text-muted-foreground">
              FrameForge AI is a production-ready video editor that combines timeline editing, 
              AI generation, and professional rendering in one powerful platform.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Start Creating Free
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Video className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">Timeline Editor</h3>
              <p className="text-muted-foreground">
                Professional multi-track timeline with precise control over clips, transitions, and effects
              </p>
            </div>
            <div className="space-y-2">
              <Sparkles className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">AI Studio</h3>
              <p className="text-muted-foreground">
                Generate images, videos, and audio with cutting-edge AI models
              </p>
            </div>
            <div className="space-y-2">
              <Zap className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Real-time preview and fast FFmpeg rendering for professional quality exports
              </p>
            </div>
            <div className="space-y-2">
              <Download className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">Export Anywhere</h3>
              <p className="text-muted-foreground">
                Optimized presets for YouTube, TikTok, Instagram Reels, and more
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2026 FrameForge AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
