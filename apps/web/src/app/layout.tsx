import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'FrameForge AI - AI Video Editor',
  description: 'Create stunning videos with AI-powered editing tools',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased font-sans">
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
