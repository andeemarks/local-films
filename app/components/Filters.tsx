'use client'

import { CINEMAS, type CinemaId } from '@/lib/types'

interface Props {
  activeCinemas: CinemaId[]
  onToggleCinema: (id: CinemaId) => void
  showNearingEnd: boolean
  onToggleNearingEnd: () => void
  sessionCount: number
}

const CINEMA_ORDER: CinemaId[] = ['kino', 'nova', 'astor', 'sun']

export default function Filters({
  activeCinemas,
  onToggleCinema,
  showNearingEnd,
  onToggleNearingEnd,
  sessionCount,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-zinc-500 mr-1">{sessionCount} session{sessionCount !== 1 ? 's' : ''}</span>

      {CINEMA_ORDER.map((id) => {
        const active = activeCinemas.includes(id)
        return (
          <button
            key={id}
            onClick={() => onToggleCinema(id)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              active
                ? 'bg-zinc-800 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {CINEMAS[id].name}
          </button>
        )
      })}

      <button
        onClick={onToggleNearingEnd}
        className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
          showNearingEnd
            ? 'bg-red-600 text-white'
            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
        }`}
      >
        Last few days
      </button>
    </div>
  )
}
