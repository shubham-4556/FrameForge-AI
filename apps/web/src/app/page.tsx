'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Sparkles, Video, Wand2, Download, ArrowRight, Play, Film, Layers } from 'lucide-react'
import { motion } from 'motion/react'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className="h-6 w-6 text-primary" />
              <div className="absolute inset-0 h-6 w-6 bg-primary/20 blur-lg" />
            </div>
            <span className="text-lg font-semibold">FrameForge AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link href="#studio" className="text-muted-foreground hover:text-foreground transition-colors">AI Studio</Link>
            <Link href="#workflow" className="text-muted-foreground hover:text-foreground transition-colors">Workflow</Link>
            <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/auth/sign-in">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm" className="gap-2">
                Get Started
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="pt-32 pb-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[120px] rounded-full" />
          </div>
          
          <div className="container mx-auto max-w-6xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 text-sm mb-8"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">AI-Native Video Creation Studio</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[0.9]"
            >
              <span className="block">From Imagination</span>
              <span className="block mt-2">
                to{' '}
                <span style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #ec4899 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Final Cut
                </span>
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              An AI-native creative studio to generate, edit, and deliver extraordinary video — all in one workspace.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2 px-8 h-12 text-base">
                  Start Creating
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="gap-2 px-8 h-12 text-base">
                  <Play className="h-4 w-4" />
                  Explore the Studio
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="relative max-w-5xl mx-auto"
            >
              <div className="relative rounded-xl border border-border bg-card/50 backdrop-blur overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="text-xs text-muted-foreground ml-4">FrameForge AI - Untitled Project</div>
                </div>
                <div className="aspect-video bg-gradient-to-br from-background to-muted/20 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
                  <div className="text-center space-y-4">
                    <Film className="h-16 w-16 mx-auto text-primary/60" />
                    <p className="text-muted-foreground">Cinematic Timeline Editor</p>
                  </div>
                </div>
                <div className="h-32 border-t border-border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-20 text-xs text-muted-foreground">Video</div>
                    <div className="flex-1 h-8 bg-primary/20 rounded border border-primary/40 relative">
                      <div className="absolute left-0 top-0 h-full w-1/3 bg-primary/40 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 text-xs text-muted-foreground">Audio</div>
                    <div className="flex-1 h-6 bg-blue-500/20 rounded border border-blue-500/40" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Built for Creative Professionals</h2>
              <p className="text-xl text-muted-foreground">Every tool you need, crafted with precision</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Wand2, title: 'AI Generation', desc: 'Create stunning visuals, footage, and audio with intelligent AI models' },
                { icon: Layers, title: 'Precision Timeline', desc: 'Professional multi-track editing with frame-accurate control' },
                { icon: Film, title: 'Real-time Preview', desc: 'Instant feedback as you edit with smooth playback' },
                { icon: Download, title: 'Studio Exports', desc: 'Optimized presets for every platform with pristine quality' },
                { icon: Sparkles, title: 'Smart Automation', desc: 'AI-powered suggestions to accelerate your workflow' },
                { icon: Video, title: 'Cinematic Tools', desc: 'Color grading, transitions, and effects for professional results' },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-all duration-300 hover-lift"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">FrameForge AI</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 FrameForge AI. Crafted for creative professionals.</p>
        </div>
      </footer>
    </div>
  )
}
