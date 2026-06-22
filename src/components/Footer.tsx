'use client'

import Link from 'next/link'
import { useT } from '@/contexts/LanguageContext'

export default function Footer() {
  const { t } = useT()

  const raw = t.footer.project
  const mitsuIdx = raw.indexOf('MitsuMira')
  const before = raw.slice(0, mitsuIdx)
  const after = raw.slice(mitsuIdx + 'MitsuMira'.length)

  return (
    <footer className="border-t border-slate-800 mt-8">
      <div className="max-w-[480px] mx-auto px-4 py-3 flex flex-col items-center gap-1.5">

        {/* Row 1 — standard MitsuMira wordmark + tagline */}
        <div className="flex items-center justify-center min-h-[44px]">
          <a
            href="https://mitsumira.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 12 }}
            className="text-slate-500 no-underline active:opacity-70"
          >
            {before}
            <span style={{ color: '#0D7B6B' }}>Mitsu</span>
            <span style={{ color: '#E05C3A' }}>Mira</span>
            {after}
          </a>
        </div>

        {/* Row 2 — data source + privacy + github */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 min-h-[44px] text-[11px] text-slate-500 opacity-75">
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
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 min-h-[44px] text-[11px] text-slate-500 opacity-75">
          <span>{t.footer.alsoBy}</span>
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
