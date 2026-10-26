'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Sparkles, Play, Pause, SkipBack, SkipForward, 
  Scissors, Copy, Trash2, Volume2, Save, Download,
  Layers, Type, Music, Image, Film
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
      <header className="border-b h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold">FrameForge AI</span>
          </Link>
          <div className="h-6 w-px bg-border" />
          <span className="text-sm font-medium">Untitled Project</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Link href="/exports">
            <Button size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="w-80 border-r p-4 space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Media</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="flex-col h-16">
                <Image className="h-4 w-4 mb-1" />
                <span className="text-xs">Images</span>
              </Button>
              <Button variant="outline" size="sm" className="flex-col h-16">
                <Film className="h-4 w-4 mb-1" />
                <span className="text-xs">Videos</span>
              </Button>
              <Button variant="outline" size="sm" className="flex-col h-16">
                <Music className="h-4 w-4 mb-1" />
                <span className="text-xs">Audio</span>
              </Button>
              <Button variant="outline" size="sm" className="flex-col h-16">
                <Type className="h-4 w-4 mb-1" />
                <span className="text-xs">Text</span>
              </Button>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Tools</h3>
            <div className="space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                <Scissors className="h-4 w-4" />
                Split
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                <Copy className="h-4 w-4" />
                Duplicate
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-black flex items-center justify-center">
            <div className="text-center text-white">
              <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-sm opacity-50">Preview</p>
            </div>
          </div>

          <div className="h-64 border-t">
            <div className="h-12 border-b flex items-center justify-center gap-2 px-4">
              <Button variant="ghost" size="icon">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon">
                <SkipForward className="h-4 w-4" />
              </Button>
              <div className="h-6 w-px bg-border mx-2" />
              <span className="text-sm text-muted-foreground">00:00 / 00:10</span>
              <div className="flex-1" />
              <Button variant="ghost" size="icon">
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-2 overflow-auto h-[calc(100%-3rem)]">
              {timeline.tracks.map((track) => (
                <div key={track.id} className="flex items-center gap-2">
                  <div className="w-32 text-sm font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    {track.name}
                  </div>
                  <div className="flex-1 h-12 bg-muted rounded relative">
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                      Drop media here
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
