'use client'

import { useState } from 'react'
import type { Film, CinemaId } from '@/lib/types'
import SessionRow, { SessionCard, formatTime, type SessionWithFilm } from './SessionRow'
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

type TimeOfDay = 'morning' | 'afternoon' | 'evening'

function timeOfDay(time: string): TimeOfDay {
  const h = parseInt(time.split(':')[0], 10)
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
}

const TIME_OF_DAY_ORDER: TimeOfDay[] = ['morning', 'afternoon', 'evening']

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
              <h2 className="mb-2 text-base font-bold text-zinc-800">
                {formatDayHeading(date)}
                <span className="ml-2 text-sm font-normal text-zinc-400">
                  {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                </span>
              </h2>
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                {(() => {
                  const groups = new Map<TimeOfDay, SessionWithFilm[]>()
                  for (const s of sessions) {
                    const tod = timeOfDay(s.time)
                    const g = groups.get(tod) ?? []
                    g.push(s)
                    groups.set(tod, g)
                  }
                  return TIME_OF_DAY_ORDER.filter((tod) => groups.has(tod)).map((tod, gi) => (
                    <div key={tod} className={gi > 0 ? 'border-t-2 border-zinc-200' : ''}>
                      <div className="px-3 py-1 bg-zinc-50 border-b border-zinc-100">
                        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          {TIME_OF_DAY_LABELS[tod]}
                        </span>
                      </div>
                      <div className="divide-y divide-zinc-100">
                        {(() => {
                          const byTime = new Map<string, SessionWithFilm[]>()
                          for (const s of groups.get(tod)!) {
                            const arr = byTime.get(s.time) ?? []
                            arr.push(s)
                            byTime.set(s.time, arr)
                          }
                          return Array.from(byTime.entries())
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([time, slotSessions]) => {
                              if (slotSessions.length === 1) {
                                const s = slotSessions[0]
                                return <SessionRow key={`${s.cinemaId}-${s.date}-${time}`} session={s} />
                              }
                              return (
                                <div key={time} className="flex items-start gap-2 py-1.5 px-3 hover:bg-zinc-50 transition-colors">
                                  <span className="w-14 shrink-0 pt-1.5 text-sm font-semibold tabular-nums text-zinc-800">
                                    {formatTime(time)}
                                  </span>
                                  <div className="flex-1 flex flex-wrap gap-1">
                                    {slotSessions.map((s, i) => (
                                      <SessionCard key={`${s.cinemaId}-${time}-${i}`} session={s} className="flex-1 min-w-48" />
                                    ))}
                                  </div>
                                </div>
                              )
                            })
                        })()}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
