import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'WC 2026 Tracker',
  description: 'Live scores, standings, schedule and predictions for FIFA World Cup 2026',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <footer className="text-center text-xs text-slate-700 py-8">
          Data via{' '}
          <a
            href="https://worldcup26.ir"
            className="hover:text-slate-500 underline"
            target="_blank"
            rel="noreferrer"
          >
            worldcup26.ir
          </a>{' '}
          · ISC License
        </footer>
      </body>
    </html>
  )
}
