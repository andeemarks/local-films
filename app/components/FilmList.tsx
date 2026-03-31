'use client'

import { useState } from 'react'
import type { Film, CinemaId } from '@/lib/types'
import FilmCard from './FilmCard'
import Filters from './Filters'

const ALL_CINEMAS: CinemaId[] = ['kino', 'nova', 'astor', 'sun']

interface Props {
  films: Film[]
}

export default function FilmList({ films }: Props) {
  const [activeCinemas, setActiveCinemas] = useState<CinemaId[]>(ALL_CINEMAS)
  const [showNearingEnd, setShowNearingEnd] = useState(false)

  function toggleCinema(id: CinemaId) {
    setActiveCinemas((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  const filtered = films
    .filter((film) => !showNearingEnd || film.isNearingEndOfRun)
    .map((film) => ({
      ...film,
      sessions: film.sessions.filter((s) => activeCinemas.includes(s.cinemaId)),
    }))
    .filter((film) => film.sessions.length > 0)

  return (
    <div>
      <Filters
        activeCinemas={activeCinemas}
        onToggleCinema={toggleCinema}
        showNearingEnd={showNearingEnd}
        onToggleNearingEnd={() => setShowNearingEnd((v) => !v)}
        filmCount={filtered.length}
      />

      {filtered.length === 0 ? (
        <p className="mt-12 text-center text-zinc-400">No sessions match your filters.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {filtered.map((film) => (
            <FilmCard key={film.title} film={film} />
          ))}
        </div>
      )}
    </div>
  )
}
