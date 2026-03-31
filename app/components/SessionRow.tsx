import { CINEMAS, type CinemaId } from '@/lib/types'

export interface SessionWithFilm {
  cinemaId: CinemaId
  date: string
  time: string
  ticketPrice: string | null
  bookingUrl: string | null
  flags: string[]
  filmTitle: string
  filmRating: string | null
  filmRuntimeMinutes: number | null
  isNearingEndOfRun: boolean
}

interface Props {
  session: SessionWithFilm
}

const CINEMA_COLOURS: Record<string, string> = {
  kino:  'bg-violet-100 text-violet-700',
  nova:  'bg-sky-100 text-sky-700',
  astor: 'bg-amber-100 text-amber-700',
  sun:   'bg-emerald-100 text-emerald-700',
}

function formatTime(time: string): string {
  const [hStr, mStr] = time.split(':')
  let h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const meridiem = h >= 12 ? 'pm' : 'am'
  if (h > 12) h -= 12
  if (h === 0) h = 12
  return `${h}:${String(m).padStart(2, '0')}${meridiem}`
}

function formatRuntime(mins: number | null): string | null {
  if (!mins) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}

export default function SessionRow({ session }: Props) {
  const cinema = CINEMAS[session.cinemaId]
  const colour = CINEMA_COLOURS[session.cinemaId] ?? 'bg-zinc-100 text-zinc-700'

  const meta = [
    formatRuntime(session.filmRuntimeMinutes),
    session.filmRating,
  ].filter(Boolean).join(' · ')

  const inner = (
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-zinc-50 transition-colors group">
      {/* Time */}
      <span className="w-16 shrink-0 text-sm font-semibold tabular-nums text-zinc-800">
        {formatTime(session.time)}
      </span>

      {/* Cinema badge */}
      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${colour}`}>
        {cinema.name}
      </span>

      {/* Film title + meta */}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-zinc-900 truncate block">{session.filmTitle}</span>
        {meta && <span className="text-xs text-zinc-400">{meta}</span>}
      </div>

      {/* Nearing end badge */}
      {session.isNearingEndOfRun && (
        <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-red-200">
          Last few days
        </span>
      )}

      {/* Ticket price */}
      {session.ticketPrice && (
        <span className="shrink-0 text-sm text-zinc-500">{session.ticketPrice}</span>
      )}
    </div>
  )

  if (session.bookingUrl) {
    return (
      <a href={session.bookingUrl} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    )
  }

  return <div>{inner}</div>
}
