/**
 * Sun Theatre scraper — suntheatre.com.au
 *
 * The page HTML has unclosed divs that cause Cheerio to nest all
 * wpcinema_allshowing_movie containers inside each other, making
 * container-scoped find() bleed across films.
 *
 * Fix: bypass DOM nesting entirely. Both the film detail link and the
 * booking URL share the same film ID (e.g. "S25HAMNET"), so we:
 *   1. Build a filmId → { title, rating } map from h3.movietitle links
 *   2. Collect all sessions globally from span.wpcinema_session_available links
 *   3. Group sessions by filmId extracted from the booking URL
 */

import * as cheerio from 'cheerio'
import type { Film, Session } from '../types'
import { parseTime } from '../scraper-utils'

const NOW_PLAYING_URL = 'https://suntheatre.com.au/now-playing/'

// Film detail href: /wp-cinema/movie/S25HAMNET/HAMNET+TITLE/
const FILM_ID_FROM_DETAIL = /\/wp-cinema\/movie\/([^/]+)\//
// Booking URL: /Sun-Theatre-Yarraville/S25HAMNET/YYYY-MM-DD/time/Room
const FILM_ID_FROM_BOOKING = /Sun-Theatre-Yarraville\/([^/]+)\//

export async function scrapeSun(): Promise<Film[]> {
  const res = await fetch(NOW_PLAYING_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-films-bot/1.0)' },
  })
  if (!res.ok) throw new Error(`Sun Theatre fetch failed: ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)

  // Step 1: build filmId → title + rating from all movietitle anchors
  const filmMeta = new Map<string, { title: string; rating: string | null }>()

  $('h3.movietitle > a').each((_, anchor) => {
    const href = $(anchor).attr('href') ?? ''
    const idMatch = href.match(FILM_ID_FROM_DETAIL)
    if (!idMatch) return
    const filmId = idMatch[1]

    const clone = $(anchor).clone()
    clone.find('span').remove()
    const title = clone.text().trim()
    if (!title) return

    const rating = $(anchor).find('span.rating').text().replace(/[()]/g, '').trim() || null
    if (!filmMeta.has(filmId)) {
      filmMeta.set(filmId, { title, rating })
    }
  })

  // Step 2: collect all available sessions globally
  const sessionsByFilm = new Map<string, Session[]>()

  $('span.wpcinema_session_available a[href*="movietkts"]').each((_, link) => {
    const href = $(link).attr('href') ?? ''

    const filmIdMatch = href.match(FILM_ID_FROM_BOOKING)
    if (!filmIdMatch) return
    const filmId = filmIdMatch[1]

    const dateMatch = href.match(/\/(\d{4}-\d{2}-\d{2})\//)
    if (!dateMatch) return
    const date = dateMatch[1]

    // Time from link text, stripping child spans (flag icons)
    const clone = $(link).clone()
    clone.find('span').remove()
    const time = parseTime(clone.text().trim())
    if (!time) return

    const sessions = sessionsByFilm.get(filmId) ?? []
    sessions.push({ cinemaId: 'sun', date, time, ticketPrice: null, bookingUrl: href, flags: [] })
    sessionsByFilm.set(filmId, sessions)
  })

  // Step 3: join meta + sessions
  const films: Film[] = []
  for (const [filmId, sessions] of sessionsByFilm) {
    const meta = filmMeta.get(filmId)
    if (!meta) continue
    films.push({
      title: meta.title,
      runtimeMinutes: null,
      rating: meta.rating,
      sessions,
      isNearingEndOfRun: false,
    })
  }

  return films
}
