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

function formatRuntime(mins: number | null): string | null {
  if (!mins) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
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

function isStartingWithinHour(date: string, time: string): boolean {
  const sessionTime = new Date(`${date}T${time}`)
  const now = new Date()
  const diffMs = sessionTime.getTime() - now.getTime()
  return diffMs >= 0 && diffMs <= 60 * 60 * 1000
}

function toSentenceCase(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function getPromoPrice(cinemaId: string, date: string, time: string): string | null {
  return novaMondayPrice(cinemaId, date, time) ?? kinoDiscountPrice(cinemaId, date)
}

/** Session content without the time — for use in multi-column rows. */
export function SessionCard({ session, className = '' }: { session: SessionWithFilm; className?: string }) {
  const cinema = CINEMAS[session.cinemaId]
  const colour = CINEMA_COLOURS[session.cinemaId] ?? 'bg-zinc-100 text-zinc-700'
  const promoPrice = getPromoPrice(session.cinemaId, session.date, session.time)
  const displayPrice = session.ticketPrice ?? promoPrice

  const meta = [
    formatRuntime(session.filmRuntimeMinutes),
    session.filmRating,
  ].filter(Boolean).join(' · ')

  const content = (
    <div className={`flex items-center gap-2 py-1 px-2 rounded transition-colors ${promoPrice ? 'hover:bg-sky-100' : 'hover:bg-zinc-100'}`}>
      <span className={`w-24 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-center ${colour}`}>
        {cinema.name}
      </span>
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className="text-sm font-medium text-zinc-900 truncate">{toSentenceCase(session.filmTitle)}</span>
        {meta && <span className="shrink-0 text-xs text-zinc-400">{meta}</span>}
      </div>
      {session.isNearingEndOfRun && (
        <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-red-200">
          Last few days
        </span>
      )}
      {displayPrice && (
        <span className={`shrink-0 text-sm font-medium ${promoPrice ? 'text-sky-600' : 'text-zinc-500'}`}>{displayPrice}</span>
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

  const meta = [
    formatRuntime(session.filmRuntimeMinutes),
    session.filmRating,
  ].filter(Boolean).join(' · ')

  const inner = (
    <div className={`flex items-center gap-2 py-1.5 px-3 transition-colors ${startingSoon ? 'bg-amber-50 hover:bg-amber-100' : promoPrice ? 'bg-sky-50 hover:bg-sky-100' : 'hover:bg-zinc-50'}`}>
      <span className="w-14 shrink-0 text-sm font-semibold tabular-nums text-zinc-800">
        {formatTime(session.time)}
      </span>
      <span className={`w-24 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-center ${colour}`}>
        {cinema.name}
      </span>
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className="text-sm font-medium text-zinc-900 truncate">{toSentenceCase(session.filmTitle)}</span>
        {meta && <span className="shrink-0 text-xs text-zinc-400">{meta}</span>}
      </div>
      {session.isNearingEndOfRun && (
        <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-red-200">
          Last few days
        </span>
      )}
      {displayPrice && (
        <span className={`shrink-0 text-sm font-medium ${promoPrice ? 'text-sky-600' : 'text-zinc-500'}`}>{displayPrice}</span>
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
