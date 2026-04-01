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

export function formatTime(time: string): string {
  const [hStr, mStr] = time.split(':')
  let h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const meridiem = h >= 12 ? 'pm' : 'am'
  if (h > 12) h -= 12
  if (h === 0) h = 12
  return `${h}:${String(m).padStart(2, '0')}${meridiem}`
}

function novaMondayPrice(cinemaId: string, date: string, time: string): string | null {
  if (cinemaId !== 'nova') return null
  const day = new Date(`${date}T00:00:00`).getDay() // 0=Sun, 1=Mon
  if (day !== 1) return null
  const [hStr] = time.split(':')
  return parseInt(hStr, 10) < 16 ? '$8' : '$11'
}

function kinoDiscountPrice(cinemaId: string, date: string): string | null {
  if (cinemaId !== 'kino') return null
  const day = new Date(`${date}T00:00:00`).getDay() // 1=Mon, 2=Tue
  return day === 1 || day === 2 ? '$10' : null
}

export function isStartingWithinHour(date: string, time: string): boolean {
  const sessionTime = new Date(`${date}T${time}`)
  const now = new Date()
  const diffMs = sessionTime.getTime() - now.getTime()
  return diffMs >= 0 && diffMs <= 60 * 60 * 1000
}

function toSentenceCase(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export function getPromoPrice(cinemaId: string, date: string, time: string): string | null {
  return novaMondayPrice(cinemaId, date, time) ?? kinoDiscountPrice(cinemaId, date)
}

/** Session content without the time — for use in multi-column rows. */
export function SessionCard({ session, className = '' }: { session: SessionWithFilm; className?: string }) {
  const cinema = CINEMAS[session.cinemaId]
  const colour = CINEMA_COLOURS[session.cinemaId] ?? 'bg-zinc-100 text-zinc-700'
  const promoPrice = getPromoPrice(session.cinemaId, session.date, session.time)
  const displayPrice = session.ticketPrice ?? promoPrice

  const content = (
    <div className={`flex flex-col gap-1 py-1.5 px-2 rounded transition-colors ${promoPrice ? 'hover:bg-sky-100' : 'hover:bg-zinc-100'}`}>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-sm font-medium text-zinc-900 truncate">{toSentenceCase(session.filmTitle)}</span>
        {session.filmRating && <span className="shrink-0 text-xs text-zinc-400">({session.filmRating})</span>}
      </div>
      <span className={`self-start rounded px-1.5 py-0.5 text-xs font-medium ${colour}`}>
        {cinema.name}
      </span>
      {displayPrice && (
        <span className={`text-sm font-medium ${promoPrice ? 'text-sky-600' : 'text-zinc-500'}`}>{displayPrice}</span>
      )}
      {session.isNearingEndOfRun && (
        <span className="self-start rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-red-200">
          Last few days
        </span>
      )}
    </div>
  )

  if (session.bookingUrl) {
    return (
      <a href={session.bookingUrl} target="_blank" rel="noopener noreferrer" className={`block ${className}`}>
        {content}
      </a>
    )
  }
  return <div className={className}>{content}</div>
}

export default function SessionRow({ session }: Props) {
  const cinema = CINEMAS[session.cinemaId]
  const colour = CINEMA_COLOURS[session.cinemaId] ?? 'bg-zinc-100 text-zinc-700'
  const startingSoon = isStartingWithinHour(session.date, session.time)
  const promoPrice = getPromoPrice(session.cinemaId, session.date, session.time)
  const displayPrice = session.ticketPrice ?? promoPrice

  const inner = (
    <div className={`flex items-start gap-2 py-2 px-3 transition-colors ${startingSoon ? 'bg-amber-50 hover:bg-amber-100' : promoPrice ? 'bg-sky-50 hover:bg-sky-100' : 'hover:bg-zinc-50'}`}>
      <span className="w-14 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-zinc-800">
        {formatTime(session.time)}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-sm font-medium text-zinc-900 truncate">{toSentenceCase(session.filmTitle)}</span>
          {session.filmRating && <span className="shrink-0 text-xs text-zinc-400">({session.filmRating})</span>}
        </div>
        <span className={`self-start rounded px-1.5 py-0.5 text-xs font-medium ${colour}`}>
          {cinema.name}
        </span>
        {displayPrice && (
          <span className={`text-sm font-medium ${promoPrice ? 'text-sky-600' : 'text-zinc-500'}`}>{displayPrice}</span>
        )}
        {session.isNearingEndOfRun && (
          <span className="self-start rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-red-200">
            Last few days
          </span>
        )}
      </div>
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
