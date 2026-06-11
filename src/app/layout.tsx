import type { Metadata } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { FavoriteTeamsProvider } from '@/contexts/FavoriteTeamsContext'
import { SettingsProvider } from '@/contexts/SettingsContext'

export const metadata: Metadata = {
  title: 'WC 2026 Tracker',
  description: 'Live scores, standings, schedule and predictions for FIFA World Cup 2026',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WC 2026',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#020617" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <LanguageProvider>
          <SettingsProvider>
            <FavoriteTeamsProvider>
              <Navbar />
              <main className="min-h-screen">{children}</main>
              <Footer />
            </FavoriteTeamsProvider>
          </SettingsProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
