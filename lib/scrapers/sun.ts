/**
 * Sun Theatre scraper — suntheatre.com.au
 * WordPress/Divi server-rendered HTML; Cheerio is sufficient.
 *
 * Now Playing page: https://suntheatre.com.au/now-playing/
 * Sessions link to movietkts.com.au for booking.
 * Format flags: L (Lounge), AKP (Adults at Kids Prices), Bub (Baby), 70mm, 35mm.
 */

import * as cheerio from 'cheerio'
import type { Film, Session } from '../types'
import { parseDate, parseTime, formatRuntime } from '../scraper-utils'

const BASE_URL = 'https://suntheatre.com.au'
const NOW_PLAYING_URL = `${BASE_URL}/now-playing/`

// Booking URL pattern: https://movietkts.com.au/Sun-Theatre-Yarraville/[ID]/[DATE]/[TIME]/[ROOM]
const SESSION_FLAG_PATTERN = /\b(L|AKP|Bub|70mm|35mm|MIFF)\b/g

export async function scrapeSun(): Promise<Film[]> {
  const res = await fetch(NOW_PLAYING_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-films-bot/1.0)' },
  })
  if (!res.ok) throw new Error(`Sun Theatre fetch failed: ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  const films: Film[] = []

  // Divi page builder — films are in et_pb_column or et_pb_post blocks.
  // Each film section has a title and session links to movietkts.com.au.
  $('[class*="et_pb_post"], [class*="movie"], article').each((_, el) => {
    const titleEl = $(el).find('h2, h3, h4, .entry-title, [class*="title"]').first()
    const title = titleEl.text().trim()
    if (!title) return

    const runtimeText = $(el).find('[class*="runtime"], [class*="duration"], [class*="length"]').first().text()
    const runtimeMinutes = formatRuntime(runtimeText)
    const rating = $(el).find('[class*="rating"], [class*="classification"]').first().text().trim() || null

    const sessions: Session[] = []
    $(el).find('a[href*="movietkts.com.au"]').each((_, link) => {
      const href = $(link).attr('href') ?? ''
      const linkText = $(link).text().trim()

      // Extract date and time from the booking URL:
      // /Sun-Theatre-Yarraville/S26HOPPERS/2026-04-01/10:10am/Davis
      const urlMatch = href.match(/\/(\d{4}-\d{2}-\d{2})\/([\d:apm]+)\//i)
      const date = urlMatch ? urlMatch[1] : parseDate($(link).closest('[data-date]').attr('data-date') ?? '')
      const rawTime = urlMatch ? urlMatch[2] : linkText
      const time = parseTime(rawTime ?? '')
      if (!date || !time) return

      // Flags are inline text tokens next to the time, e.g. "7:00pm L AKP"
      const flags: string[] = []
      const flagMatches = linkText.match(SESSION_FLAG_PATTERN)
      if (flagMatches) flags.push(...flagMatches)

      sessions.push({
        cinemaId: 'sun',
        date,
        time,
        ticketPrice: null,
        bookingUrl: href,
        flags,
      })
    })

    if (sessions.length > 0) {
      films.push({ title, runtimeMinutes, rating, sessions, isNearingEndOfRun: false })
    }
  })

  return films
}
