/**
 * Astor Theatre scraper — astortheatre.net.au
 * WordPress server-rendered HTML; Cheerio is sufficient.
 *
 * The sessions page lists films with dates/times embedded in HTML.
 * Tickets link to buy.palacecinemas.com.au; some sessions are box-office only.
 */

import * as cheerio from 'cheerio'
import type { Film, Session } from '../types'
import { parseDate, parseTime, formatRuntime } from '../scraper-utils'

const BASE_URL = 'https://www.astortheatre.net.au'
const SESSIONS_URL = `${BASE_URL}/sessions`

export async function scrapeAstor(): Promise<Film[]> {
  const res = await fetch(SESSIONS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-films-bot/1.0)' },
  })
  if (!res.ok) throw new Error(`Astor fetch failed: ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  const films: Film[] = []

  // Astor is WordPress — films appear as posts or custom post type entries.
  // Each film block contains the title, date/time, and a booking link.
  $('article, .event, .session, [class*="movie"], [class*="film"]').each((_, el) => {
    const titleEl = $(el).find('h1, h2, h3, .entry-title, [class*="title"]').first()
    const title = titleEl.text().trim()
    if (!title) return

    const runtimeText = $(el).find('[class*="runtime"], [class*="duration"]').first().text()
    const runtimeMinutes = formatRuntime(runtimeText)
    const rating = $(el).find('[class*="rating"], [class*="classification"]').first().text().trim() || null

    const sessions: Session[] = []
    // Session rows may contain date + time + booking link
    $(el).find('a[href*="palacecinemas"], a[href*="session"], a[href*="book"]').each((_, link) => {
      const href = $(link).attr('href') ?? ''
      const bookingUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
      const row = $(link).closest('tr, li, [class*="session"], [class*="time"]')
      const timeText = row.find('time, [class*="time"]').first().text().trim() || $(link).text().trim()
      const dateText = row.find('[class*="date"], time[datetime]').attr('datetime')
        ?? row.find('[class*="date"]').first().text().trim()

      const date = parseDate(dateText)
      const time = parseTime(timeText)
      if (!date || !time) return

      const isBoxOfficeOnly = row.text().toLowerCase().includes('no online')
      sessions.push({
        cinemaId: 'astor',
        date,
        time,
        ticketPrice: null,
        bookingUrl: isBoxOfficeOnly ? null : bookingUrl,
        flags: isBoxOfficeOnly ? ['Box office only'] : [],
      })
    })

    if (sessions.length > 0) {
      films.push({ title, runtimeMinutes, rating, sessions, isNearingEndOfRun: false })
    }
  })

  return films
}
