import Link from 'next/link'
import { Logo } from '@/components/brand/logo'

const columns = [
  {
    title: 'Studio',
    links: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/ai', label: 'AI Studio' },
      { href: '/media', label: 'Media Library' },
      { href: '/exports', label: 'Exports' },
    ],
  },
  {
    title: 'Product',
    links: [
      { href: '/#features', label: 'Features' },
      { href: '/#studio', label: 'Inside the studio' },
      { href: '/#workflow', label: 'Workflow' },
      { href: '/#pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/auth/sign-in', label: 'Sign in' },
      { href: '/auth/sign-up', label: 'Create an account' },
      { href: '/settings', label: 'Settings' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="relative border-t border-border/70 bg-surface-2/40">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="focus-ring inline-flex rounded-lg">
              <Logo />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              An AI-native studio for sketching, cutting, and delivering cinematic video without
              leaving the timeline.
            </p>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              Built for stories worth finishing
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-border/60 pt-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} FrameForge AI. All rights reserved.</p>
          <p className="font-mono uppercase tracking-[0.18em]">Make the cut.</p>
        </div>
      </div>
    </footer>
  )
}
