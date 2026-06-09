'use client'

import { useT } from '@/contexts/LanguageContext'

export default function Footer() {
  const { t } = useT()
  return (
    <footer className="border-t border-slate-800 mt-8 py-8 text-center text-xs text-slate-600 space-y-1">
      <p className="text-slate-400 font-medium">
        {t.footer.madeWith}{' '}
        <a
          href={t.footer.madeByUrl}
          target="_blank"
          rel="noreferrer"
          className="text-amber-400 hover:text-amber-300 font-semibold"
        >
          {t.footer.madeByName}
        </a>
      </p>
      <p>
        {t.footer.dataVia}{' '}
        <a
          href="https://github.com/rezarahiminia/worldcup2026"
          className="hover:text-slate-400 underline"
          target="_blank"
          rel="noreferrer"
        >
          github/rezarahiminia/worldcup2026
        </a>{' '}
        · ISC License
      </p>
    </footer>
  )
}
