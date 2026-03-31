import { CINEMAS, type Film, type CinemaId } from '@/lib/types'
import SessionPill from './SessionPill'

interface Props {
  film: Film
}

/** Groups sessions by date, sorted chronologically */
function groupByDate(film: Film): [string, Film['sessions']][] {
  const map = new Map<string, Film['sessions']>()
  for (const s of film.sessions) {
    const existing = map.get(s.date) ?? []
    existing.push(s)
    map.set(s.date, existing)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sessions]) => [
      date,
      sessions.sort((a, b) => a.time.localeCompare(b.time)),
    ])
}

/** Formats "YYYY-MM-DD" → "Tue 1 Apr" */
function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatRuntime(mins: number | null): string | null {
  if (!mins) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`
}

export default function FilmCard({ film }: Props) {
  const dateGroups = groupByDate(film)
  const cinemaIds = [...new Set(film.sessions.map((s) => s.cinemaId))] as CinemaId[]

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 leading-snug">{film.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              {film.rating && (
                <span className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs font-medium">
                  {film.rating}
                </span>
              )}
              {film.runtimeMinutes && <span>{formatRuntime(film.runtimeMinutes)}</span>}
              <span className="text-zinc-400">·</span>
              <span>{cinemaIds.map((id) => CINEMAS[id].name).join(', ')}</span>
            </div>
          </div>
          {film.isNearingEndOfRun && (
            <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200">
              Last few days
            </span>
          )}
        </div>

        {/* Sessions by date */}
        <div className="mt-4 space-y-3">
          {dateGroups.map(([date, sessions]) => (
            <div key={date}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {formatDate(date)}
              </p>
              <div className="flex flex-wrap gap-2">
                {sessions.map((s, i) => (
                  <SessionPill key={`${s.cinemaId}-${s.date}-${s.time}-${i}`} session={s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}
