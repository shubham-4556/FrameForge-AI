'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Sparkles, LayoutDashboard, FolderOpen, Wand2, Download, 
  Settings, Image, Video, Music, Loader2
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/media', icon: FolderOpen, label: 'Media Library' },
  { href: '/ai', icon: Wand2, label: 'AI Studio' },
  { href: '/exports', icon: Download, label: 'Exports' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function AIPage() {
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
                <Button variant={item.href === '/ai' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">AI Studio</h1>
            <p className="text-muted-foreground">Generate images, videos, and audio with AI</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <Image className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Image Generation</CardTitle>
                <CardDescription>Create stunning images from text prompts</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Generate Image</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <Video className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Video Generation</CardTitle>
                <CardDescription>Generate AI videos from text or images</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Generate Video</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <Music className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Audio Generation</CardTitle>
                <CardDescription>Create music and sound effects with AI</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Generate Audio</Button>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Generations</CardTitle>
              <CardDescription>Your AI-generated content</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Wand2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No generations yet</h3>
              <p className="text-muted-foreground">Start generating with AI Studio</p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
