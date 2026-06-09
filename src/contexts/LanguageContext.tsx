'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { translations, en, type Lang, type Translations } from '@/lib/i18n'

interface LanguageContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextValue>({ lang: 'en', setLang: () => {}, t: en })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const stored = localStorage.getItem('wc2026_lang') as Lang | null
    if (stored && stored in translations) {
      setLangState(stored)
      return
    }
    // Auto-detect from browser language
    const browser = navigator.language.toLowerCase()
    if (browser.startsWith('pt')) setLangState('pt')
    else if (browser.startsWith('es')) setLangState('es')
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('wc2026_lang', l)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useT() {
  return useContext(LanguageContext)
}
