'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface SettingsContextValue {
  timezone: string
  setTimezone: (tz: string) => void
}

const SettingsContext = createContext<SettingsContextValue>({
  timezone: 'UTC',
  setTimezone: () => {},
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [timezone, setTimezoneState] = useState<string>('UTC')

  useEffect(() => {
    const stored = localStorage.getItem('wc2026_timezone')
    if (stored) {
      setTimezoneState(stored)
    } else {
      setTimezoneState(Intl.DateTimeFormat().resolvedOptions().timeZone)
    }
  }, [])

  const setTimezone = (tz: string) => {
    setTimezoneState(tz)
    localStorage.setItem('wc2026_timezone', tz)
  }

  return (
    <SettingsContext.Provider value={{ timezone, setTimezone }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
