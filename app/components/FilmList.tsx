'use client'

import { useState } from 'react'
import type { Film, CinemaId } from '@/lib/types'
import { SessionCard, formatTime, isStartingWithinHour, isAlreadyStarted, getPromoPrice, type SessionWithFilm, CINEMA_COLOURS, CINEMA_SHORT_NAMES } from './SessionRow'
import Filters from './Filters'

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

const ALL_CINEMAS: CinemaId[] = ['kino', 'nova', 'sun', 'astor']

export default function FilmList({ films }: Props) {
  const [activeCinemas, setActiveCinemas] = useState<CinemaId[]>(ALL_CINEMAS)
  const [showNearingEnd, setShowNearingEnd] = useState(false)

  function toggleCinema(id: CinemaId) {
    setActiveCinemas((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  const orderedCinemas = ALL_CINEMAS.filter((id) => activeCinemas.includes(id))

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
      />

      {days.length === 0 ? (
        <p className="mt-12 text-center text-zinc-400">No sessions match your filters.</p>
      ) : (
        <div className="mt-1 space-y-2">
          {days.map(({ date, sessions }) => (
            <section key={date}>
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-clip">
                {/* Sticky header: date row + cinema column headings */}
                <div className="sticky top-0 z-10 border-b border-zinc-200">
                  <div className="px-3 py-1 bg-zinc-50">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {formatDayHeading(date)}
                    </span>
                  </div>
                  <div
                    className="grid px-3 py-2 bg-white border-t border-zinc-100"
                    style={{ gridTemplateColumns: `3.5rem repeat(${orderedCinemas.length}, 1fr)` }}
                  >
                    <div />
                    {orderedCinemas.map((id) => (
                      <div
                        key={id}
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold text-center ${CINEMA_COLOURS[id]}`}
                      >
                        {CINEMA_SHORT_NAMES[id]}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time-of-day sections */}
                {(() => {
                  const groups = new Map<TimeOfDay, SessionWithFilm[]>()
                  for (const s of sessions) {
                    const tod = timeOfDay(s.time)
                    const g = groups.get(tod) ?? []
                    g.push(s)
                    groups.set(tod, g)
                  }
                  return TIME_OF_DAY_ORDER.filter((tod) => groups.has(tod)).map((tod, gi) => {
                    // Build time → cinemaId → sessions map
                    const byTimeCinema = new Map<string, Map<CinemaId, SessionWithFilm[]>>()
                    for (const s of groups.get(tod)!) {
                      if (!byTimeCinema.has(s.time)) byTimeCinema.set(s.time, new Map())
                      const cinemaMap = byTimeCinema.get(s.time)!
                      if (!cinemaMap.has(s.cinemaId)) cinemaMap.set(s.cinemaId, [])
                      cinemaMap.get(s.cinemaId)!.push(s)
                    }
                    return (
                      <div key={tod} className={gi > 0 ? 'border-t-2 border-zinc-200' : ''}>
                        <div className="px-3 py-px bg-zinc-50 border-b border-zinc-100">
                          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            {TIME_OF_DAY_LABELS[tod]}
                          </span>
                        </div>
                        <div className="divide-y divide-zinc-100">
                          {Array.from(byTimeCinema.entries())
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([time, cinemaMap]) => {
                              const allSlotSessions = Array.from(cinemaMap.values()).flat()
                              const started = isAlreadyStarted(date, time)
                              const startingSoon = allSlotSessions.some((s) =>
                                isStartingWithinHour(s.date, s.time),
                              )
                              const hasPromo = allSlotSessions.some((s) =>
                                getPromoPrice(s.cinemaId, s.date, s.time),
                              )
                              const rowBg = startingSoon
                                ? 'bg-amber-50 hover:bg-amber-100'
                                : hasPromo
                                  ? 'bg-sky-50 hover:bg-sky-100'
                                  : 'hover:bg-zinc-50'
                              return (
                                <div
                                  key={time}
                                  className={`grid items-start py-1 px-3 transition-colors ${rowBg}${started ? ' opacity-40' : ''}`}
                                  style={{
                                    gridTemplateColumns: `3.5rem repeat(${orderedCinemas.length}, 1fr)`,
                                  }}
                                >
                                  <span className="pt-1 text-sm font-semibold tabular-nums text-zinc-800">
                                    {formatTime(time)}
                                  </span>
                                  {orderedCinemas.map((id) => {
                                    const cinemaSessions = cinemaMap.get(id) ?? []
                                    return (
                                      <div key={id} className="flex flex-col gap-0.5">
                                        {cinemaSessions.map((s, i) => (
                                          <SessionCard key={i} session={s} />
                                        ))}
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
