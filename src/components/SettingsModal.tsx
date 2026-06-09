'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Settings } from 'lucide-react'
import { useT } from '@/contexts/LanguageContext'
import { useSettings } from '@/contexts/SettingsContext'
import type { Lang } from '@/lib/i18n'

const LANG_OPTIONS: { code: Lang; flag: string; label: string }[] = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'pt', flag: '🇧🇷', label: 'Português' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
]

const TIMEZONE_OPTIONS = [
  { group: '🌎 Americas', options: [
    { value: 'Pacific/Honolulu', label: 'Honolulu (HST, UTC-10)' },
    { value: 'America/Anchorage', label: 'Anchorage (AKST, UTC-9)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles / Vancouver (PT)' },
    { value: 'America/Denver', label: 'Denver (MT)' },
    { value: 'America/Chicago', label: 'Chicago / Mexico City (CT)' },
    { value: 'America/New_York', label: 'New York / Toronto (ET)' },
    { value: 'America/Halifax', label: 'Halifax (AT)' },
    { value: 'America/Sao_Paulo', label: 'São Paulo / Brasília (BRT, UTC-3)' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART, UTC-3)' },
  ]},
  { group: '🌍 Europe & Africa', options: [
    { value: 'UTC', label: 'UTC (GMT+0)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Lisbon', label: 'Lisbon (WET/WEST)' },
    { value: 'Europe/Madrid', label: 'Madrid / Paris / Berlin (CET)' },
    { value: 'Europe/Athens', label: 'Athens / Helsinki (EET)' },
    { value: 'Europe/Moscow', label: 'Moscow (MSK, UTC+3)' },
  ]},
  { group: '🌏 Asia & Pacific', options: [
    { value: 'Asia/Dubai', label: 'Dubai (GST, UTC+4)' },
    { value: 'Asia/Kolkata', label: 'Mumbai / Kolkata (IST, UTC+5:30)' },
    { value: 'Asia/Bangkok', label: 'Bangkok / Jakarta (ICT, UTC+7)' },
    { value: 'Asia/Shanghai', label: 'Beijing / Shanghai (CST, UTC+8)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST, UTC+9)' },
    { value: 'Asia/Seoul', label: 'Seoul (KST, UTC+9)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  ]},
]

interface Props {
  onClose: () => void
}

export default function SettingsModal({ onClose }: Props) {
  const { t, lang, setLang } = useT()
  const { timezone, setTimezone } = useSettings()
  const backdropRef = useRef<HTMLDivElement>(null)
  const [tzSearch, setTzSearch] = useState('')

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const filteredGroups = TIMEZONE_OPTIONS.map((g) => ({
    ...g,
    options: tzSearch
      ? g.options.filter((o) => o.label.toLowerCase().includes(tzSearch.toLowerCase()))
      : g.options,
  })).filter((g) => g.options.length > 0)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div
        ref={backdropRef}
        className="flex min-h-full items-center justify-center p-4"
        onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
      >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold">
            <Settings size={18} className="text-slate-400" />
            {t.settings.title}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* Language */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">
              {t.settings.language}
            </label>
            <div className="flex gap-2">
              {LANG_OPTIONS.map(({ code, flag, label }) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    lang === code
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <span>{flag}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">
              {t.settings.timezone}
            </label>
            {/* Show currently selected */}
            <div className="mb-2 px-3 py-2 bg-blue-600/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
              ✓ {TIMEZONE_OPTIONS.flatMap(g => g.options).find(o => o.value === timezone)?.label ?? timezone}
            </div>
            <input
              type="text"
              placeholder="Search timezone…"
              value={tzSearch}
              onChange={(e) => setTzSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 mb-2 focus:outline-none focus:border-blue-500"
            />
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-800/50">
              {filteredGroups.map((group) => (
                <div key={group.group}>
                  <div className="px-3 py-1.5 text-xs text-slate-500 font-semibold sticky top-0 bg-slate-900/90 backdrop-blur-sm">
                    {group.group}
                  </div>
                  {group.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setTimezone(opt.value); setTzSearch('') }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        timezone === opt.value
                          ? 'bg-blue-600/20 text-blue-300 font-medium'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {opt.label}
                      {timezone === opt.value && <span className="float-right text-blue-400">✓</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">{t.settings.timezoneHint}</p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {t.settings.close}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

export function SettingsButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label="Settings"
      >
        <Settings size={18} />
      </button>
      {open && <SettingsModal onClose={() => setOpen(false)} />}
    </>
  )
}
