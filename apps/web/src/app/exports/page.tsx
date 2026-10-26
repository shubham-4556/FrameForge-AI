'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Sparkles, LayoutDashboard, FolderOpen, Wand2, Download, 
  Settings, Film, Clock, CheckCircle
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/media', icon: FolderOpen, label: 'Media Library' },
  { href: '/ai', icon: Wand2, label: 'AI Studio' },
  { href: '/exports', icon: Download, label: 'Exports' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function ExportsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">FrameForge AI</span>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 border-r min-h-[calc(100vh-4rem)] p-4">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant={item.href === '/exports' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Exports</h1>
            <p className="text-muted-foreground">Manage your video exports and downloads</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Render Jobs</CardTitle>
              <CardDescription>Track your video rendering progress</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Download className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No exports yet</h3>
              <p className="text-muted-foreground mb-4">Create a project and export your video</p>
              <Link href="/editor/new">
                <Button>Go to Editor</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Export Presets</CardTitle>
              <CardDescription>Quick export settings for popular platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" className="h-auto flex-col items-start p-4">
                  <span className="font-semibold">YouTube</span>
                  <span className="text-xs text-muted-foreground">1920x1080 - 30fps</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col items-start p-4">
                  <span className="font-semibold">Instagram Reels</span>
                  <span className="text-xs text-muted-foreground">1080x1920 - 30fps</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col items-start p-4">
                  <span className="font-semibold">TikTok</span>
                  <span className="text-xs text-muted-foreground">1080x1920 - 30fps</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col items-start p-4">
                  <span className="font-semibold">YouTube Shorts</span>
                  <span className="text-xs text-muted-foreground">1080x1920 - 30fps</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
