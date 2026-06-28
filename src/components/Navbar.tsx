'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy, Calendar, Users, User, Star, Menu, X, Award } from 'lucide-react'
import { useState } from 'react'
import { useT } from '@/contexts/LanguageContext'
import { SettingsButton } from './SettingsModal'

export default function Navbar() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const { t } = useT()

  const links = [
    { href: '/', label: t.nav.home, icon: Trophy },
    { href: '/schedule', label: t.nav.schedule, icon: Calendar },
    { href: '/playoffs', label: t.nav.playoffs, icon: Award },
    { href: '/teams', label: t.nav.teams, icon: Users },
    { href: '/players', label: t.nav.players, icon: User },
    { href: '/predictions', label: t.nav.predictions, icon: Star },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-bold text-white text-lg shrink-0">
            <span className="text-2xl">⚽</span>
            <span className="hidden sm:inline text-amber-400">WC</span>
            <span className="hidden sm:inline">2026</span>
          </Link>

          {/* Mobile icon nav — visible only on small screens, right after the logo */}
          <div className="flex md:hidden items-center gap-0.5 ml-2 flex-1">
            {links.map(({ href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`p-2 rounded-lg transition-colors ${
                  path === href
                    ? 'text-white bg-slate-800'
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                <Icon size={18} />
              </Link>
            ))}
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  path === href
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <SettingsButton />

            {/* Mobile menu toggle — hidden now that icons are in the top bar */}
            <button
              className="hidden p-2 text-slate-400 hover:text-white"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pb-4">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium mt-1 transition-colors ${
                path === href
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
          <a
            href="https://partygames.mitsumira.com/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-3 mt-2 border-t border-slate-800 text-xs text-slate-500 hover:text-amber-400 transition-colors"
          >
            🎉 <span>{t.footer.alsoBy} <strong className="text-slate-400">Party Games</strong></span>
          </a>
        </div>
      )}
    </nav>
  )
}
