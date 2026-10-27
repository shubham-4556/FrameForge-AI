'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { 
  Sparkles, Plus, Video, Clock, FolderOpen, Wand2, Download, 
  Settings, LayoutDashboard, Search, MoreHorizontal, Film
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', active: true },
  { href: '/editor/new', icon: Film, label: 'Video Editor' },
  { href: '/media', icon: FolderOpen, label: 'Media Library' },
  { href: '/ai', icon: Wand2, label: 'AI Studio' },
  { href: '/exports', icon: Download, label: 'Exports' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardPage() {
  const projects = [
    { id: '1', name: 'Product Demo Reel', updatedAt: '2 hours ago', duration: '0:45' },
    { id: '2', name: 'Social Media Ad', updatedAt: '1 day ago', duration: '0:30' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">FrameForge AI</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                placeholder="Search projects..." 
                className="h-9 w-64 rounded-md border border-input bg-background px-9 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 border-r border-border min-h-[calc(100vh-3.5rem)] bg-background">
          <div className="p-4">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button 
                    variant={item.active ? 'secondary' : 'ghost'} 
                    className="w-full justify-start gap-2 h-9"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
            <div className="mt-6 pt-6 border-t border-border">
              <Link href="/editor/new">
                <Button className="w-full gap-2 h-9">
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              </Link>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-6 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-1">Welcome back</h1>
            <p className="text-muted-foreground">Continue creating or start something new</p>
          </div>

          <div className="grid gap-4 md:grid-cols-4 mb-8">
            {[
              { label: 'Projects', value: projects.length, icon: Film },
              { label: 'Media Assets', value: 0, icon: FolderOpen },
              { label: 'AI Generations', value: 0, icon: Wand2 },
              { label: 'Exports', value: 0, icon: Download },
            ].map((stat) => (
              <Card key={stat.label} className="border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Projects</h2>
            <Link href="/editor/new">
              <Button size="sm" className="gap-2">
                <Plus className="h-3 w-3" />
                New Project
              </Button>
            </Link>
          </div>

          {projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link key={project.id} href={`/editor/${project.id}`}>
                  <Card className="group border-border hover:border-primary/50 transition-all duration-200 overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-purple-500/10 relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="h-8 w-8 text-primary/60" />
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="secondary" className="h-7 w-7">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{project.name}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{project.updatedAt}</span>
                            <span>•</span>
                            <span>{project.duration}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Film className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No projects yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create your first video to get started</p>
                <Link href="/editor/new">
                  <Button size="sm" className="gap-2">
                    <Plus className="h-3 w-3" />
                    New Project
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
