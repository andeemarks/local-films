'use client'

import { useState } from 'react'
import type { Film, CinemaId } from '@/lib/types'
import SessionRow, { type SessionWithFilm } from './SessionRow'
import Filters from './Filters'

const ALL_CINEMAS: CinemaId[] = ['kino', 'nova', 'astor', 'sun']

interface Props {
  films: Film[]
}

function formatDayHeading(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

export default function FilmList({ films }: Props) {
  const [activeCinemas, setActiveCinemas] = useState<CinemaId[]>(ALL_CINEMAS)
  const [showNearingEnd, setShowNearingEnd] = useState(false)

  function toggleCinema(id: CinemaId) {
    setActiveCinemas((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  // Flatten all sessions into SessionWithFilm[]
  const allSessions: SessionWithFilm[] = films.flatMap((film) =>
    film.sessions.map((s) => ({
      ...s,
      filmTitle: film.title,
      filmRating: film.rating,
      filmRuntimeMinutes: film.runtimeMinutes,
      isNearingEndOfRun: film.isNearingEndOfRun,
    })),
  )

  const filtered = allSessions
    .filter((s) => activeCinemas.includes(s.cinemaId))
    .filter((s) => !showNearingEnd || s.isNearingEndOfRun)

  // Group by date, sorted chronologically
  const byDate = new Map<string, SessionWithFilm[]>()
  for (const s of filtered) {
    const group = byDate.get(s.date) ?? []
    group.push(s)
    byDate.set(s.date, group)
  }
  const days = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sessions]) => ({
      date,
      sessions: sessions.sort((a, b) =>
        a.time.localeCompare(b.time) || a.filmTitle.localeCompare(b.filmTitle),
      ),
    }))

  return (
    <div>
      <Filters
        activeCinemas={activeCinemas}
        onToggleCinema={toggleCinema}
        showNearingEnd={showNearingEnd}
        onToggleNearingEnd={() => setShowNearingEnd((v) => !v)}
        sessionCount={filtered.length}
      />

      {days.length === 0 ? (
        <p className="mt-12 text-center text-zinc-400">No sessions match your filters.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {days.map(({ date, sessions }) => (
            <section key={date}>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {formatDayHeading(date)}
                <span className="ml-2 font-normal normal-case text-zinc-300">
                  {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                </span>
              </h2>
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm divide-y divide-zinc-100">
                {sessions.map((s, i) => (
                  <SessionRow key={`${s.cinemaId}-${s.date}-${s.time}-${i}`} session={s} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
