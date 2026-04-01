/**
 * Shared utilities for all scrapers.
 */

import { format, parse, isValid, addDays } from 'date-fns'

export const NEARING_END_DAYS = 3
export const SESSION_WINDOW_DAYS = 60
const TZ = 'Australia/Melbourne'

/** Returns today's date as "YYYY-MM-DD" in Melbourne local time. */
export function localToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

/**
 * Attempt to parse a fuzzy date string into an ISO "YYYY-MM-DD" string.
 * Returns null if the input cannot be parsed.
 */
export function parseDate(raw: string | undefined | null): string | null {
  if (!raw) return null
  const s = raw.trim()

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  const formats = [
    'dd MMM yyyy',      // 01 Apr 2026
    'dd MMMM yyyy',     // 01 April 2026
    'EEE dd MMM',       // Tue 01 Apr  — year assumed current/next
    'EEE d MMM',        // Tue 1 Apr
    'EEEE d MMMM',      // Tuesday 1 April
    'EEEE, do MMMM',    // Sunday, 12th April  (Cinema Nova)
    'EEEE, do MMMM yyyy', // Sunday, 12th April 2026
    'd MMMM',           // 1 April
    'd MMM',            // 1 Apr
    'MMM d',            // Apr 1
    'MM/dd/yyyy',
    'dd/MM/yyyy',
  ]

  const now = parse(localToday(), 'yyyy-MM-dd', new Date())
  for (const fmt of formats) {
    try {
      let d = parse(s, fmt, now)
      if (!isValid(d)) continue
      // If no year in format and date is in the past (>30 days), roll to next year
      if (!fmt.includes('yyyy') && d < addDays(now, -30)) {
        d = parse(s, fmt, new Date(now.getFullYear() + 1, 0, 1))
      }
      if (isValid(d)) return format(d, 'yyyy-MM-dd')
    } catch {
      // try next format
    }
  }
  return null
}

/**
 * Parse a time string (e.g. "7:30pm", "19:30", "10:10am") into "HH:mm".
 * Returns null if unparseable.
 */
export function parseTime(raw: string | undefined | null): string | null {
  if (!raw) return null
  const s = raw.trim()

  // 24-hour: "19:30" or "16:50 Event" (trailing text ignored); negative lookahead excludes am/pm
  const h24 = s.match(/^(\d{1,2}):(\d{2})(?!\s*(?:am|pm))/i)
  if (h24) {
    const h = parseInt(h24[1], 10)
    const m = parseInt(h24[2], 10)
    if (h >= 0 && h < 24 && m >= 0 && m < 60) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // 12-hour: "7:30pm", "10:10am", "7pm"
  const h12 = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i)
  if (h12) {
    let h = parseInt(h12[1], 10)
    const m = parseInt(h12[2] ?? '0', 10)
    const meridiem = h12[3].toLowerCase()
    if (meridiem === 'pm' && h < 12) h += 12
    if (meridiem === 'am' && h === 12) h = 0
    if (h >= 0 && h < 24 && m >= 0 && m < 60) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  return null
}

/**
 * Parse a runtime string (e.g. "1h 45m", "105 min", "1:45") into total minutes.
 * Returns null if unparseable.
 */
export function formatRuntime(raw: string | undefined | null): number | null {
  if (!raw) return null
  const s = raw.trim()

  // "1h 45m" or "1hr 45min"
  const hm = s.match(/(\d+)\s*h(?:r|rs|our|ours)?\s*(?:(\d+)\s*m)?/i)
  if (hm) return parseInt(hm[1], 10) * 60 + (hm[2] ? parseInt(hm[2], 10) : 0)

  // "105 min" or "105 mins"
  const mins = s.match(/(\d+)\s*min/i)
  if (mins) return parseInt(mins[1], 10)

  // "1:45"
  const colon = s.match(/^(\d+):(\d{2})$/)
  if (colon) return parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10)

  return null
}

/**
 * Given a list of sessions, determine if the film is nearing end of run.
 * A film is nearing end if its last session is within NEARING_END_DAYS days from today.
 */
export function computeNearingEndOfRun(sessions: { date: string }[]): boolean {
  if (sessions.length === 0) return false
  const today = localToday()
  const lastDate = sessions.map((s) => s.date).sort().at(-1)!
  const cutoff = format(addDays(new Date(), NEARING_END_DAYS), 'yyyy-MM-dd')
  return lastDate >= today && lastDate <= cutoff
}
