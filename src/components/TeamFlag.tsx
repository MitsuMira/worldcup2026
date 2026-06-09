import { getFlagEmoji } from '@/lib/utils'
import type { ApiTeam } from '@/lib/types'

interface Props {
  team?: ApiTeam
  name?: string
  flagUrl?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showName?: boolean
}

const sizes = {
  sm: { img: 'w-6 h-4',  emoji: 'text-lg',  text: 'text-xs' },
  md: { img: 'w-8 h-6',  emoji: 'text-2xl', text: 'text-sm' },
  lg: { img: 'w-10 h-7', emoji: 'text-3xl', text: 'text-base' },
  xl: { img: 'w-16 h-12', emoji: 'text-5xl', text: 'text-lg' },
}

export default function TeamFlag({ team, name, flagUrl, size = 'md', showName = false }: Props) {
  const url = flagUrl ?? team?.flag
  const nameStr = name ?? team?.name_en ?? 'TBD'
  const fifa = team?.fifa_code ?? ''
  const sz = sizes[size]

  return (
    <span className="inline-flex flex-col items-center gap-1">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={nameStr}
          className={`${sz.img} object-cover rounded-sm shadow`}
          onError={(e) => {
            const parent = e.currentTarget.parentElement
            if (!parent) return
            e.currentTarget.style.display = 'none'
            const span = document.createElement('span')
            span.className = sz.emoji
            span.textContent = getFlagEmoji(fifa)
            parent.insertBefore(span, e.currentTarget)
          }}
        />
      ) : (
        <span className={sz.emoji}>{getFlagEmoji(fifa)}</span>
      )}
      {showName && <span className={`${sz.text} text-slate-300 font-medium`}>{nameStr}</span>}
    </span>
  )
}
