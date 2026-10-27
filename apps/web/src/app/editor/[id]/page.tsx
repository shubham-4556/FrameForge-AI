'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Sparkles, Play, Pause, SkipBack, SkipForward, 
  Scissors, Copy, Trash2, Volume2, Save, Download,
  Layers, Type, Image, Film
} from 'lucide-react'

export default function EditorPage({ params }: { params: { id: string } }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeline] = useState({
    duration: 10000,
    tracks: [
      { id: '1', type: 'video', name: 'Video Track', clips: [] },
      { id: '2', type: 'audio', name: 'Audio Track', clips: [] },
      { id: '3', type: 'text', name: 'Text Track', clips: [] },
    ]
  })

  return (
    <div className="h-screen bg-background flex flex-col">
      <header className="border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">FrameForge AI</span>
          </Link>
          <span className="text-sm text-muted-foreground">Project: {params.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="gap-2">
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-border bg-card/30 flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-medium mb-3">Assets</h3>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" className="h-16 flex-col gap-1">
                <Film className="h-4 w-4" />
                <span className="text-xs">Video</span>
              </Button>
              <Button variant="outline" size="sm" className="h-16 flex-col gap-1">
                <Image className="h-4 w-4" />
                <span className="text-xs">Image</span>
              </Button>
              <Button variant="outline" size="sm" className="h-16 flex-col gap-1">
                <Type className="h-4 w-4" />
                <span className="text-xs">Text</span>
              </Button>
            </div>
          </div>
          <div className="flex-1 p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Properties
            </h3>
            <p className="text-sm text-muted-foreground">Select a clip to edit properties</p>
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          <div className="flex-1 bg-black/95 flex items-center justify-center p-8">
            <div className="aspect-video w-full max-w-4xl bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-lg flex items-center justify-center border border-border">
              <div className="text-center space-y-3">
                <Film className="h-16 w-16 mx-auto text-primary/60" />
                <p className="text-muted-foreground">Preview Canvas</p>
              </div>
            </div>
          </div>

          <div className="h-80 border-t border-border bg-card/30 flex flex-col">
            <div className="h-12 border-b border-border flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <SkipForward className="h-4 w-4" />
                </Button>
                <div className="text-xs text-muted-foreground ml-4">00:00 / 00:10</div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Scissors className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-x-auto">
              <div className="space-y-2 min-w-[800px]">
                {timeline.tracks.map((track) => (
                  <div key={track.id} className="flex items-center gap-2">
                    <div className="w-24 text-xs text-muted-foreground truncate">{track.name}</div>
                    <div className="flex-1 h-12 bg-muted/30 rounded border border-border relative">
                      <div className="absolute left-4 top-1 h-10 w-32 bg-primary/30 rounded border border-primary/50" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
