import { type CinemaId } from '@/lib/types'

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

export const CINEMA_SHORT_NAMES: Record<CinemaId, string> = {
  kino:  'Kino',
  nova:  'Nova',
  astor: 'Astor',
  sun:   'Sun',
}

export const CINEMA_COLOURS: Record<CinemaId, string> = {
  kino:  'bg-sky-100 text-sky-700',
  nova:  'bg-violet-100 text-violet-700',
  astor: 'bg-emerald-100 text-emerald-700',
  sun:   'bg-amber-100 text-amber-700',
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

function sessionDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`)
}

function novaMondayPrice(cinemaId: CinemaId, date: string, time: string): string | null {
  if (cinemaId !== 'nova') return null
  const day = new Date(`${date}T00:00:00`).getDay() // 0=Sun, 1=Mon
  if (day !== 1) return null
  const [hStr] = time.split(':')
  return parseInt(hStr, 10) < 16 ? '$8' : '$11'
}

function kinoDiscountPrice(cinemaId: CinemaId, date: string): string | null {
  if (cinemaId !== 'kino') return null
  const day = new Date(`${date}T00:00:00`).getDay() // 1=Mon, 2=Tue
  return day === 1 || day === 2 ? '$10' : null
}

export function isStartingWithinHour(date: string, time: string): boolean {
  const diffMs = sessionDateTime(date, time).getTime() - Date.now()
  return diffMs >= 0 && diffMs <= 60 * 60 * 1000
}

export function isAlreadyStarted(date: string, time: string): boolean {
  return sessionDateTime(date, time).getTime() < Date.now()
}

export function isExpired(date: string, time: string): boolean {
  return sessionDateTime(date, time).getTime() < Date.now() - 60 * 60 * 1000
}

export function getPromoPrice(cinemaId: CinemaId, date: string, time: string): string | null {
  return novaMondayPrice(cinemaId, date, time) ?? kinoDiscountPrice(cinemaId, date)
}

function SessionBody({ session, promoPrice, displayPrice }: {
  session: SessionWithFilm
  promoPrice: string | null
  displayPrice: string | null
}) {
  const colour = CINEMA_COLOURS[session.cinemaId] ?? 'bg-zinc-100 text-zinc-700'
  return (
    <>
      <div className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${colour}`}>
          {session.filmTitle.toUpperCase()}
        </span>
        {session.filmRating && <span className="shrink-0 text-xs text-zinc-400">{session.filmRating}</span>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {displayPrice && (
          <span className={`text-sm font-medium ${promoPrice ? 'text-sky-600' : 'text-zinc-500'}`}>{displayPrice}</span>
        )}
        {session.isNearingEndOfRun && (
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-red-200">
            Last few days
          </span>
        )}
      </div>
    </>
  )
}

/** Session content without the time — for use in multi-column rows. */
export function SessionCard({ session, className = '' }: { session: SessionWithFilm; className?: string }) {
  const promoPrice = getPromoPrice(session.cinemaId, session.date, session.time)
  const displayPrice = session.ticketPrice ?? promoPrice

  const content = (
    <div className={`flex flex-col gap-0.5 py-0.5 rounded transition-colors ${promoPrice ? 'hover:bg-sky-100' : 'hover:bg-zinc-100'}`}>
      <SessionBody session={session} promoPrice={promoPrice} displayPrice={displayPrice} />
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
  const started = isAlreadyStarted(session.date, session.time)
  const startingSoon = isStartingWithinHour(session.date, session.time)
  const promoPrice = getPromoPrice(session.cinemaId, session.date, session.time)
  const displayPrice = session.ticketPrice ?? promoPrice

  const inner = (
    <div className={`flex items-start gap-2 py-0.5 px-3 transition-colors ${startingSoon ? 'bg-amber-50 hover:bg-amber-100' : promoPrice ? 'bg-sky-50 hover:bg-sky-100' : 'hover:bg-zinc-50'}`}>
      <span className="w-14 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-zinc-800">
        {formatTime(session.time)}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <SessionBody session={session} promoPrice={promoPrice} displayPrice={displayPrice} />
      </div>
    </div>
  )

  if (session.bookingUrl) {
    return (
      <a href={session.bookingUrl} target="_blank" rel="noopener noreferrer" className={`block${started ? ' opacity-40' : ''}`}>
        {inner}
      </a>
    )
  }
  return <div className={started ? 'opacity-40' : ''}>{inner}</div>
}
