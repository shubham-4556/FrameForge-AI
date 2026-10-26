'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, Video, Zap, Download, ArrowRight, Play } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10 overflow-hidden">
      <header className="border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 animate-fade-in">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 group">
            <Sparkles className="h-6 w-6 text-primary animate-glow" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              FrameForge AI
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth/sign-in">
              <Button variant="ghost" className="hover-lift">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="gap-2 hover-glow">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-24 text-center relative">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          </div>
          
          <div className={`mx-auto max-w-4xl space-y-8 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Video Creation</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Create Stunning Videos with{' '}
              <span className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent animate-glow">
                AI Magic
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              FrameForge AI is a production-ready video editor that combines timeline editing, 
              AI generation, and professional rendering in one powerful platform.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2 hover-glow text-base px-8">
                  <Sparkles className="h-5 w-5" />
                  Start Creating Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="gap-2 hover-lift text-base px-8">
                  <Play className="h-5 w-5" />
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Video, title: 'Timeline Editor', desc: 'Professional multi-track timeline with precise control over clips, transitions, and effects' },
              { icon: Sparkles, title: 'AI Studio', desc: 'Generate images, videos, and audio with cutting-edge AI models' },
              { icon: Zap, title: 'Lightning Fast', desc: 'Real-time preview and fast FFmpeg rendering for professional quality exports' },
              { icon: Download, title: 'Export Anywhere', desc: 'Optimized presets for YouTube, TikTok, Instagram Reels, and more' },
            ].map((feature, i) => (
              <div 
                key={feature.title}
                className={`group p-6 rounded-xl border bg-card/50 backdrop-blur hover-lift hover-glow ${mounted ? 'animate-fade-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <feature.icon className="h-12 w-12 text-primary mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2026 FrameForge AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
