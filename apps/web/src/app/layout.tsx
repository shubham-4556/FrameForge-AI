import './globals.css'
import type { Metadata, Viewport } from 'next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: {
    default: 'FrameForge AI — From Imagination to Final Cut',
    template: '%s · FrameForge AI',
  },
  description:
    'An AI-native creative studio to generate, edit, and deliver extraordinary video. Storyboard with AI, cut on a frame-accurate timeline, and export for every platform.',
  applicationName: 'FrameForge AI',
  keywords: ['AI video editor', 'video production', 'storyboard', 'timeline editor', 'AI studio'],
  authors: [{ name: 'FrameForge AI' }],
  openGraph: {
    title: 'FrameForge AI — From Imagination to Final Cut',
    description:
      'Generate, edit, and deliver cinematic video in one AI-native studio.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0c10' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          <Providers>
            {children}
            <Toaster
              position="bottom-right"
              closeButton
              toastOptions={{
                classNames: {
                  toast:
                    'border border-border bg-popover text-popover-foreground shadow-panel rounded-xl',
                  description: 'text-muted-foreground',
                },
              }}
            />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
