import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import { LanguageProvider } from '@/contexts/LanguageContext'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'WC 2026 Tracker',
  description: 'Live scores, standings, schedule and predictions for FIFA World Cup 2026',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  )
}
