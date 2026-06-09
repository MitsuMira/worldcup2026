'use client'

import { useT } from '@/contexts/LanguageContext'

export default function Footer() {
  const { t } = useT()
  return (
    <footer className="border-t border-slate-800 mt-8 py-8 text-center text-xs text-slate-600 space-y-1">
      <p className="text-slate-400 font-medium">{t.footer.madeWith}</p>
      <p>
        {t.footer.dataVia}{' '}
        <a href="https://worldcup26.ir" className="hover:text-slate-400 underline" target="_blank" rel="noreferrer">
          worldcup26.ir
        </a>{' '}
        · ISC License
      </p>
    </footer>
  )
}
