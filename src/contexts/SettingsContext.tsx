'use client'

import { createContext, useContext, useState } from 'react'

interface SettingsContextValue {
  timezone: string
  setTimezone: (tz: string) => void
}

const SettingsContext = createContext<SettingsContextValue>({
  timezone: 'UTC',
  setTimezone: () => {},
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [timezone, setTimezoneState] = useState<string>(() => {
    if (typeof window === 'undefined') return 'UTC'
    return localStorage.getItem('wc2026_timezone') ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  })

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
