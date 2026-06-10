'use client'

import Link from 'next/link'
import { useT } from '@/contexts/LanguageContext'

export default function Footer() {
  const { t } = useT()
  return (
    <footer className="border-t border-slate-800 mt-8">
      <div className="max-w-[480px] mx-auto px-4 py-3 text-[12px] text-slate-500 space-y-1">

        {/* Row 1 — standard across MitsuMira apps */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 min-h-[44px]">
          <a
            href={t.footer.madeByUrl}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-slate-400 hover:text-amber-400 transition-colors"
          >
            {t.footer.madeWith}
          </a>
          <span aria-hidden>·</span>
          <span>{t.footer.tagline}</span>
        </div>

        {/* Row 2 — data source + privacy + github */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 min-h-[44px]">
          <span>{t.footer.dataVia}</span>
          <span aria-hidden>·</span>
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">
            {t.footer.privacy}
          </Link>
          <span aria-hidden>·</span>
          <a
            href="https://github.com/MitsuMira/worldcup2026"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-300 transition-colors"
          >
            {t.footer.github}
          </a>
        </div>

        {/* Row 3 — cross-promotion */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 min-h-[44px]">
          <span>Also by MitsuMira:</span>
          <a
            href="https://partygames.mitsumira.com/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-amber-400 transition-colors font-medium"
          >
            🎉 Party Games
          </a>
        </div>

      </div>
    </footer>
  )
}
