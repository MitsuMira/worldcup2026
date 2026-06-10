'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

interface SettingsContextValue {
  timezone: string
  setTimezone: (tz: string) => void
  theme: Theme
  setTheme: (t: Theme) => void
}

const SettingsContext = createContext<SettingsContextValue>({
  timezone: 'UTC',
  setTimezone: () => {},
  theme: 'dark',
  setTheme: () => {},
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [timezone, setTimezoneState] = useState<string>(() => {
    if (typeof window === 'undefined') return 'UTC'
    return localStorage.getItem('wc2026_timezone') ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  })

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark'
    return (localStorage.getItem('wc2026_theme') as Theme) ?? 'dark'
  })

  // Apply theme class to <html> whenever it changes
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'light') {
      html.classList.add('light')
    } else {
      html.classList.remove('light')
    }
  }, [theme])

  const setTimezone = (tz: string) => {
    setTimezoneState(tz)
    localStorage.setItem('wc2026_timezone', tz)
  }

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('wc2026_theme', t)
  }

  return (
    <SettingsContext.Provider value={{ timezone, setTimezone, theme, setTheme }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
