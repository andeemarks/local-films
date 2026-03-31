import { CINEMAS, type Session } from '@/lib/types'

interface Props {
  session: Session
}

const CINEMA_COLOURS: Record<string, string> = {
  kino:  'bg-violet-100 text-violet-800 hover:bg-violet-200',
  nova:  'bg-sky-100 text-sky-800 hover:bg-sky-200',
  astor: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
  sun:   'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
}

/** Formats "HH:mm" → "7:30pm" */
function formatTime(time: string): string {
  const [hStr, mStr] = time.split(':')
  let h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const meridiem = h >= 12 ? 'pm' : 'am'
  if (h > 12) h -= 12
  if (h === 0) h = 12
  return `${h}:${String(m).padStart(2, '0')}${meridiem}`
}

export default function SessionPill({ session }: Props) {
  const colour = CINEMA_COLOURS[session.cinemaId] ?? 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
  const cinema = CINEMAS[session.cinemaId]
  const label = formatTime(session.time)

  const inner = (
    <span className="flex flex-col items-start gap-0.5">
      <span className="text-xs font-medium leading-none">{cinema.name}</span>
      <span className="text-sm font-semibold leading-none">{label}</span>
      {session.flags.length > 0 && (
        <span className="text-[10px] leading-none opacity-70">{session.flags.join(' · ')}</span>
      )}
      {session.ticketPrice && (
        <span className="text-[10px] leading-none opacity-70">{session.ticketPrice}</span>
      )}
    </span>
  )

  if (session.bookingUrl) {
    return (
      <a
        href={session.bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex rounded-lg px-3 py-2 transition-colors ${colour}`}
        title={`Book at ${cinema.name}`}
      >
        {inner}
      </a>
    )
  }

  return (
    <span className={`inline-flex rounded-lg px-3 py-2 ${colour} opacity-75 cursor-default`}>
      {inner}
    </span>
  )
}
