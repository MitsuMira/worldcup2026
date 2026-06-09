'use client'

import { useEffect, useState } from 'react'

const KICKOFF = new Date('2026-06-11T19:00:00') // First match: June 11, 2026

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function CountdownTimer() {
  const [diff, setDiff] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setDiff(KICKOFF.getTime() - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (diff === null) return null
  if (diff <= 0) return null // Tournament has started

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-6 my-4">
      {[
        { value: days, label: 'Days' },
        { value: hours, label: 'Hours' },
        { value: minutes, label: 'Min' },
        { value: seconds, label: 'Sec' },
      ].map(({ value, label }) => (
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
