'use client'

import { useT } from '@/contexts/LanguageContext'
import type { Lang } from '@/lib/i18n'

const content: Record<Lang, {
  heading: string
  intro: string
  sections: { title: string; body: string }[]
  footer: string
  contact: string
}> = {
  en: {
    heading: 'Privacy Notice',
    intro: "WC 2026 Tracker doesn't track you. Here's what we use.",
    sections: [
      {
        title: 'Local Storage',
        body: 'Your predictions and favourite teams are saved in your browser\'s local storage so they persist across sessions. Individual predictions stay on your device unless you join or create a group.',
      },
      {
        title: 'Prediction Groups',
        body: 'If you create or join a prediction group, your display name and match predictions are sent to and stored on our servers (Vercel Redis) to power the group leaderboard. This data is shared with other members of the same group. You can leave a group at any time, which removes your data from our servers.',
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
    contact: 'Questions or requests? Contact us at',
  },
  pt: {
    heading: 'Aviso de Privacidade',
    intro: 'O WC 2026 Tracker não te rastreia. Veja o que usamos.',
    sections: [
      {
        title: 'Armazenamento Local',
        body: 'As suas previsões e seleções favoritas são guardadas no armazenamento local do browser para que persistam entre sessões. Os palpites individuais ficam no seu dispositivo, a menos que entre ou crie um grupo.',
      },
      {
        title: 'Grupos de Palpites',
        body: 'Se criar ou entrar num grupo de palpites, o seu nome e palpites são enviados e armazenados nos nossos servidores (Vercel Redis) para alimentar o ranking do grupo. Estes dados são partilhados com os outros membros do mesmo grupo. Pode sair do grupo a qualquer momento, o que remove os seus dados dos nossos servidores.',
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
    contact: 'Dúvidas ou pedidos? Contacte-nos em',
  },
  es: {
    heading: 'Aviso de Privacidad',
    intro: 'WC 2026 Tracker no te rastrea. Aquí lo que usamos.',
    sections: [
      {
        title: 'Almacenamiento Local',
        body: 'Tus predicciones y selecciones favoritas se guardan en el almacenamiento local del navegador para que persistan entre sesiones. Las predicciones individuales permanecen en tu dispositivo, salvo que te unas o crees un grupo.',
      },
      {
        title: 'Grupos de Predicciones',
        body: 'Si creas o te unes a un grupo de predicciones, tu nombre y predicciones se envían y almacenan en nuestros servidores (Vercel Redis) para alimentar la tabla del grupo. Estos datos se comparten con los demás miembros del mismo grupo. Puedes salir del grupo en cualquier momento, lo que elimina tus datos de nuestros servidores.',
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
    contact: '¿Preguntas o solicitudes? Contáctanos en',
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
      <div className="mt-4 text-xs text-slate-500">
        {c.contact}{' '}
        <a href="mailto:wc2026@mitsumira.com" className="text-slate-300 hover:text-white underline">
          wc2026@mitsumira.com
        </a>
      </div>
    </main>
  )
}
