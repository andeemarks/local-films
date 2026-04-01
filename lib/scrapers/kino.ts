/**
 * Kino Cinema scraper — palacecinemas.com.au
 *
 * Uses the Palace Cinemas JSON API directly.
 * Cinema ID: 300 (numeric ID for The Kino Melbourne)
 *
 * The sessions endpoint requires at least one selectedDates value to return results.
 * Strategy:
 *   1. Fetch date-items (list of dates that have sessions) using the cinema slug
 *   2. For each date, paginate through sessions?page=N&selectedCinemaIds=300&selectedDates=YYYY-MM-DD
 *   3. Session dates are UTC ISO strings — convert to Melbourne local time
 */

import type { Film, Session } from '../types'
import { localToday } from '../scraper-utils'
import { addDays, format } from 'date-fns'

const API_BASE = 'https://prod-api.palace-cinemas.workers.dev'
const CINEMA_ID = '300'
const BOOKING_BASE = 'https://www.palacecinemas.com.au/movies'

const HEADERS = {
  'Origin': 'https://www.palacecinemas.com.au',
  'User-Agent': 'Mozilla/5.0 (compatible; local-films-bot/1.0)',
  'Accept': 'application/json',
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`Kino API fetch failed (${url}): ${res.status}`)
  return res.json()
}

/** Generate the date range to scrape: today + SESSION_WINDOW_DAYS days. */
function getDateRange(): string[] {
  const today = localToday()
  return Array.from({ length: 60 }, (_, i) =>
    format(addDays(new Date(today), i), 'yyyy-MM-dd')
  )
}

interface ApiSession {
  date: string
  sessionId: string
  cinemaId: string
  sessionInfo?: string[]
}

interface ApiFilm {
  slug: string
  title: string
  rating: string | null
  sessions: ApiSession[]
}

interface ApiPage {
  data: ApiFilm[]
  totalPages: number
}

async function fetchSessionsForDates(dates: string[]): Promise<ApiFilm[]> {
  const films: ApiFilm[] = []
  const selectedDates = dates.join(',')
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const url = `${API_BASE}/sessions?page=${page}&selectedCinemaIds=${CINEMA_ID}&selectedDates=${selectedDates}&modernView=true&movieOrderType=default`
    const data = await fetchJson(url) as ApiPage
    if (!data?.data) break
    films.push(...data.data)
    totalPages = data.totalPages ?? 1
    page++
  }

  return films
}

/**
 * Parse a session datetime from the Palace API.
 * The API stores Melbourne local times as ISO strings (timezone offset is ignored).
 * e.g. "2026-04-01T15:00:00.000Z" means 3:00 PM Melbourne, not UTC.
 */
function parseSessionDatetime(iso: string): { date: string; time: string } | null {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/)
  if (!m) return null
  return { date: m[1], time: `${m[2]}:${m[3]}` }
}

export async function scrapeKino(): Promise<Film[]> {
  const dates = getDateRange()
  const filmMap = new Map<string, Film>()
  const CHUNK = 7

  for (let i = 0; i < dates.length; i += CHUNK) {
    const chunk = dates.slice(i, i + CHUNK)
    let apiFilms: ApiFilm[]
    try {
      apiFilms = await fetchSessionsForDates(chunk)
    } catch (err) {
      console.warn(`  Kino: failed to fetch sessions for ${chunk[0]}…:`, err instanceof Error ? err.message : err)
      continue
    }

    for (const apiFilm of apiFilms) {
      if (!apiFilm.title) continue
      const key = apiFilm.title.toLowerCase().trim()

      for (const s of apiFilm.sessions ?? []) {
        const converted = parseSessionDatetime(s.date)
        if (!converted) continue

        const session: Session = {
          cinemaId: 'kino',
          date: converted.date,
          time: converted.time,
          ticketPrice: null,
          bookingUrl: `${BOOKING_BASE}/${apiFilm.slug}`,
          flags: s.sessionInfo?.filter(Boolean) ?? [],
        }

        const existing = filmMap.get(key)
        if (existing) {
          existing.sessions.push(session)
        } else {
          filmMap.set(key, {
            title: apiFilm.title,
            runtimeMinutes: null,
            rating: apiFilm.rating ?? null,
            sessions: [session],
            isNearingEndOfRun: false,
          })
        }
      }
    }
  }

  console.log(`  Kino: found ${filmMap.size} films`)
  return Array.from(filmMap.values())
}
