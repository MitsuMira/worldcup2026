'use client'

import { useT } from '@/contexts/LanguageContext'
import { useSettings } from '@/contexts/SettingsContext'
import MiniCountdown from './MiniCountdown'

// UTC times for each ceremony
const CEREMONIES = [
  { utc: '2026-06-11T16:30:00Z', flag: '🇲🇽', labelKey: 'mexico' as const },
  { utc: '2026-06-12T17:30:00Z', flag: '🇨🇦', labelKey: 'canada' as const },
  { utc: '2026-06-12T23:30:00Z', flag: '🇺🇸', labelKey: 'usa' as const },
]

// Section hides after all ceremonies are done (June 13 UTC)
const HIDE_AFTER = new Date('2026-06-13T00:00:00Z')

function formatCeremonyTime(utc: string, tz: string): string {
  const d = new Date(utc)
  return d.toLocaleString('en-GB', {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function OpeningCeremony() {
  const { t } = useT()
  const { timezone } = useSettings()

  if (Date.now() >= HIDE_AFTER.getTime()) return null

  const firstUpcoming = CEREMONIES.find(c => new Date(c.utc).getTime() > Date.now())

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-8">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-bold text-white">{t.ceremony.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.ceremony.subtitle}</p>
        </div>
        {firstUpcoming && (
          <div className="text-right shrink-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{t.ceremony.countdownLabel}</div>
            <MiniCountdown
              target={new Date(firstUpcoming.utc)}
              className="text-amber-400 font-mono font-bold text-sm tabular-nums"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        {CEREMONIES.map((c) => {
          const past = Date.now() > new Date(c.utc).getTime()
          return (
            <div
              key={c.utc}
              className={`flex items-center gap-3 text-xs ${past ? 'opacity-40' : ''}`}
            >
              <span className="text-base shrink-0">{c.flag}</span>
              <span className={`flex-1 ${past ? 'text-slate-500' : 'text-slate-300'}`}>
                {t.ceremony[c.labelKey]}
              </span>
              <span className="text-slate-500 font-mono tabular-nums shrink-0">
                {formatCeremonyTime(c.utc, timezone)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
