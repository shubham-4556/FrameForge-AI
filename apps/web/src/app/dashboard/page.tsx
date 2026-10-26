'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Sparkles, Plus, Video, Clock, Image, Film, 
  LayoutDashboard, FolderOpen, Wand2, Download, Settings, User, ArrowRight
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/media', icon: FolderOpen, label: 'Media Library' },
  { href: '/ai', icon: Wand2, label: 'AI Studio' },
  { href: '/exports', icon: Download, label: 'Exports' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardPage() {
  const [projects] = useState([
    { id: '1', name: 'My First Video', updatedAt: '2026-10-24', thumbnail: null },
  ])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/10">
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary animate-glow" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              FrameForge AI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="hover-lift">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 border-r min-h-[calc(100vh-4rem)] p-4 bg-background/50 backdrop-blur">
          <nav className="space-y-2">
            {navItems.map((item, i) => (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant={item.href === '/dashboard' ? 'secondary' : 'ghost'} 
                  className={`w-full justify-start gap-2 hover-lift animate-slide-in-left`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
          <div className="mt-6 animate-fade-up" style={{ animationDelay: '250ms' }}>
            <Link href="/editor/new">
              <Button className="w-full gap-2 hover-glow">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </Link>
          </div>
        </aside>

        <main className="flex-1 p-6">
          <div className="mb-6 animate-fade-up">
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Create and manage your video projects</p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-4">
            {[
              { label: 'Total Projects', value: projects.length, icon: Film, delay: 0 },
              { label: 'Media Files', value: 0, icon: Image, delay: 100 },
              { label: 'AI Generations', value: 0, icon: Wand2, delay: 200 },
              { label: 'Exports', value: 0, icon: Download, delay: 300 },
            ].map((stat) => (
              <Card key={stat.label} className={`hover-lift animate-fade-up`} style={{ animationDelay: `${stat.delay}ms` }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  <stat.icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hover-lift animate-fade-up" style={{ animationDelay: '400ms' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Projects</CardTitle>
                  <CardDescription>Your video editing projects</CardDescription>
                </div>
                <Link href="/editor/new">
                  <Button className="gap-2 hover-glow">
                    <Plus className="h-4 w-4" />
                    New Project
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Video className="h-12 w-12 text-muted-foreground mb-4 animate-float" />
                  <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first video project to get started</p>
                  <Link href="/editor/new">
                    <Button className="gap-2 hover-glow">
                      <Plus className="h-4 w-4" />
                      Create Project
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project, i) => (
                    <Link key={project.id} href={`/editor/${project.id}`}>
                      <Card className={`hover-lift hover-glow cursor-pointer animate-scale-in`} style={{ animationDelay: `${500 + i * 100}ms` }}>
                        <div className="aspect-video bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
                          <Video className="h-8 w-8 text-primary" />
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-1 group-hover:text-primary transition-colors">{project.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Updated {project.updatedAt}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
