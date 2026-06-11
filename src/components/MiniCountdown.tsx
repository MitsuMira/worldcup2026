'use client'

import { useEffect, useState } from 'react'

interface Props {
  target: Date
  className?: string
}

function format(diff: number): string {
  const total = Math.floor(diff / 1000)
  if (total <= 0) return ''
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
}

export default function MiniCountdown({ target, className = '' }: Props) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    const tick = () => {
      const diff = target.getTime() - Date.now()
      setDisplay(diff > 0 ? format(diff) : '')
    }
    tick()
    // Tick every second when < 1h remaining, otherwise every minute
    const interval = target.getTime() - Date.now() < 3_600_000 ? 1000 : 60_000
    const id = setInterval(tick, interval)
    return () => clearInterval(id)
  }, [target])

  if (!display) return null
  return <span className={className}>{display}</span>
}
