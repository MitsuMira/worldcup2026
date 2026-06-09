'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/contexts/LanguageContext'

interface Props {
  kickoff?: Date
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function CountdownTimer({ kickoff }: Props) {
  const { t } = useT()
  const [diff, setDiff] = useState<number | null>(null)

  useEffect(() => {
    if (!kickoff) return
    const tick = () => setDiff(kickoff.getTime() - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [kickoff])

  if (!kickoff || diff === null || diff <= 0) return null

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const units = [
    { value: days, label: t.countdown.days },
    { value: hours, label: t.countdown.hours },
    { value: minutes, label: t.countdown.min },
    { value: seconds, label: t.countdown.sec },
  ]

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-6 my-4">
      {units.map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 min-w-[64px] text-center">
            <span className="text-3xl font-black tabular-nums text-amber-400">{pad(value)}</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{label}</span>
        </div>
      ))}
    </div>
  )
}
