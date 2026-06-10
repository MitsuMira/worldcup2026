'use client'

import { useT } from '@/contexts/LanguageContext'
import type { Lang } from '@/lib/i18n'

const content: Record<Lang, {
  heading: string
  intro: string
  sections: { title: string; body: string }[]
  footer: string
}> = {
  en: {
    heading: 'Privacy Notice',
    intro: "WC 2026 Tracker doesn't track you. Here's what we use.",
    sections: [
      {
        title: 'Local Storage',
        body: 'Your predictions and favourite teams are saved in your browser\'s local storage so they persist across sessions. This data stays on your device and is never sent to us.',
      },
      {
        title: 'Analytics',
        body: 'We use Vercel Analytics to understand how the site is used. It is cookieless, collects no personal data, and requires no consent banner.',
      },
      {
        title: 'Data Source',
        body: 'Match data is fetched from the ESPN public API. No account or API key is required, and no personal data is involved.',
      },
    ],
    footer: 'No Cookies · No Accounts · No Ads\nWe don\'t use cookies, don\'t create user accounts, and don\'t display ads or share data with advertisers.',
  },
  pt: {
    heading: 'Aviso de Privacidade',
    intro: 'O WC 2026 Tracker não te rastreia. Veja o que usamos.',
    sections: [
      {
        title: 'Armazenamento Local',
        body: 'As suas previsões e seleções favoritas são guardadas no armazenamento local do browser para que persistam entre sessões. Estes dados ficam no seu dispositivo e nunca são enviados para nós.',
      },
      {
        title: 'Análises',
        body: 'Usamos o Vercel Analytics para entender como o site é utilizado. É sem cookies, não recolhe dados pessoais e não requer banner de consentimento.',
      },
      {
        title: 'Fonte de Dados',
        body: 'Os dados das partidas são obtidos da API pública da ESPN. Não é necessária conta nem chave de API, e nenhum dado pessoal está envolvido.',
      },
    ],
    footer: 'Sem Cookies · Sem Contas · Sem Anúncios\nNão usamos cookies, não criamos contas de utilizador e não exibimos anúncios nem partilhamos dados com anunciantes.',
  },
  es: {
    heading: 'Aviso de Privacidad',
    intro: 'WC 2026 Tracker no te rastrea. Aquí lo que usamos.',
    sections: [
      {
        title: 'Almacenamiento Local',
        body: 'Tus predicciones y selecciones favoritas se guardan en el almacenamiento local del navegador para que persistan entre sesiones. Estos datos permanecen en tu dispositivo y nunca nos son enviados.',
      },
      {
        title: 'Análisis',
        body: 'Usamos Vercel Analytics para entender cómo se utiliza el sitio. Es sin cookies, no recopila datos personales y no requiere banner de consentimiento.',
      },
      {
        title: 'Fuente de Datos',
        body: 'Los datos de los partidos se obtienen de la API pública de ESPN. No se necesita cuenta ni clave de API, y no se involucran datos personales.',
      },
    ],
    footer: 'Sin Cookies · Sin Cuentas · Sin Anuncios\nNo usamos cookies, no creamos cuentas de usuario y no mostramos anuncios ni compartimos datos con anunciantes.',
  },
}

export default function PrivacyPage() {
  const { lang } = useT()
  const c = content[lang]

  return (
    <main className="max-w-[600px] mx-auto px-4 py-10 text-slate-300">
      <h1 className="text-2xl font-bold text-white mb-1">{c.heading}</h1>
      <p className="text-slate-400 mb-8">{c.intro}</p>

      <div className="space-y-6">
        {c.sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-base font-semibold text-white mb-1">{s.title}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-slate-800 text-xs text-slate-500 whitespace-pre-line leading-relaxed">
        {c.footer}
      </div>
    </main>
  )
}
