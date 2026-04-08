'use client'

import { CINEMAS, type CinemaId } from '@/lib/types'

interface Props {
  activeCinemas: CinemaId[]
  onToggleCinema: (id: CinemaId) => void
  showNearingEnd: boolean
  onToggleNearingEnd: () => void
}

const CINEMA_ORDER: CinemaId[] = ['kino', 'nova', 'sun', 'astor']

export default function Filters({
  activeCinemas,
  onToggleCinema,
  showNearingEnd,
  onToggleNearingEnd,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
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
