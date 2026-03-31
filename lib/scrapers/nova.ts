/**
 * Cinema Nova scraper — cinemanova.com.au
 * Server-rendered HTML; Cheerio is sufficient.
 *
 * The "Now Showing" page lists films with session times embedded in the HTML.
 * Sessions link to the ticketing subdomain ticketing.cinemanova.com.au.
 */

import * as cheerio from 'cheerio'
import type { Film, Session } from '../types'
import { parseDate, parseTime, formatRuntime } from '../scraper-utils'

const BASE_URL = 'https://www.cinemanova.com.au'
const NOW_SHOWING_URL = `${BASE_URL}/`

export async function scrapeNova(): Promise<Film[]> {
  const res = await fetch(NOW_SHOWING_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-films-bot/1.0)' },
  })
  if (!res.ok) throw new Error(`Nova fetch failed: ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  const films: Film[] = []

  // Each film is in a .now-showing-item or similar container.
  // Selectors are best-effort — may need tuning after inspecting live HTML.
  $('[class*="movie"], [class*="film"], .session-item, article').each((_, el) => {
    const titleEl = $(el).find('h2, h3, .title, [class*="title"]').first()
    const title = titleEl.text().trim()
    if (!title) return

    const runtimeText = $(el).find('[class*="runtime"], [class*="duration"]').first().text()
    const runtimeMinutes = formatRuntime(runtimeText)
    const rating = $(el).find('[class*="rating"], [class*="classification"]').first().text().trim() || null

    const sessions: Session[] = []
    $(el).find('a[href*="ticketing"], a[href*="session"], a[href*="booking"]').each((_, link) => {
      const href = $(link).attr('href') ?? ''
      const bookingUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
      const timeText = $(link).text().trim()
      const dateText = $(link).closest('[data-date], [class*="date"]').attr('data-date')
        ?? $(link).closest('[class*="day"]').find('[class*="date"], time').first().text().trim()

      const date = parseDate(dateText)
      const time = parseTime(timeText)
      if (!date || !time) return

      sessions.push({
        cinemaId: 'nova',
        date,
        time,
        ticketPrice: null,
        bookingUrl,
        flags: [],
      })
    })

    if (sessions.length > 0) {
      films.push({ title, runtimeMinutes, rating, sessions, isNearingEndOfRun: false })
    }
  })

  return films
}
