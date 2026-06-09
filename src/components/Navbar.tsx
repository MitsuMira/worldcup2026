'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy, Calendar, BarChart3, Users, Star, Menu, X } from 'lucide-react'
import { useState } from 'react'

const links = [
  { href: '/', label: 'Home', icon: Trophy },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/standings', label: 'Standings', icon: BarChart3 },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/predictions', label: 'Predictions', icon: Star },
]

export default function Navbar() {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-bold text-white text-lg">
            <span className="text-2xl">⚽</span>
            <span className="hidden sm:inline text-amber-400">WC</span>
            <span className="hidden sm:inline">2026</span>
          </Link>

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

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
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
        </div>
      )}
    </nav>
  )
}
