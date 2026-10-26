'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Sparkles, LayoutDashboard, FolderOpen, Wand2, Download, 
  Settings, Upload, Image, Film, Music, Search
} from 'lucide-react'
import { Input } from '@/components/ui/input'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/media', icon: FolderOpen, label: 'Media Library' },
  { href: '/ai', icon: Wand2, label: 'AI Studio' },
  { href: '/exports', icon: Download, label: 'Exports' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function MediaPage() {
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
                <Button variant={item.href === '/media' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Media Library</h1>
              <p className="text-muted-foreground">Upload and manage your assets</p>
            </div>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Files
            </Button>
          </div>

          <div className="mb-6 flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search media..." className="pl-9" />
            </div>
            <Button variant="outline">All</Button>
            <Button variant="ghost">Images</Button>
            <Button variant="ghost">Videos</Button>
            <Button variant="ghost">Audio</Button>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No media files yet</h3>
              <p className="text-muted-foreground mb-4">Upload your first image, video, or audio file</p>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Files
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
