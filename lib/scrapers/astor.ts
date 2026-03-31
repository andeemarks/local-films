/**
 * Astor Theatre scraper — astortheatre.net.au
 *
 * Each div.movie_preview is ONE SESSION (not one film).
 * Structure:
 *   div.movie_preview               (one per screening)
 *     span.extrabold                (date+time text, e.g. "Thursday 7th May at 7pm")
 *     h2.uppercase
 *       a[href*="/films/"]          (film title; may be two for double features)
 *         span.rating               ([MA15+] etc)
 *     div.buttons
 *       a.movie_link.button         (href contains YYYY-MM-DD for the date)
 *
 * Double features have two <a> tags in h2.uppercase separated by hr.second_film_divider.
 * All Astor tickets are box office only — no online booking link.
 */

import * as cheerio from 'cheerio'
import type { Film, Session } from '../types'
import { parseTime, formatRuntime } from '../scraper-utils'

const BASE_URL = 'https://www.astortheatre.net.au'
const SESSIONS_URL = `${BASE_URL}/sessions`

/** Parse "Thursday 7th May at 7pm" → "19:00" */
function parseAstorTime(raw: string): string | null {
  const match = raw.match(/at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i)
  return match ? parseTime(match[1]) : null
}

/** Extract YYYY-MM-DD from a session info URL like /sessions/2026-05-07-000 */
function parseDateFromHref(href: string): string | null {
  const match = href.match(/\/sessions\/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

export async function scrapeAstor(): Promise<Film[]> {
  const res = await fetch(SESSIONS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-films-bot/1.0)' },
  })
  if (!res.ok) throw new Error(`Astor fetch failed: ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)

  // Collect sessions keyed by film title
  const filmMap = new Map<string, Film>()

  $('div.movie_preview').each((_, el) => {
    const sessionHref = $(el).find('a.movie_link').attr('href') ?? ''
    const bookingUrl = sessionHref.startsWith('http') ? sessionHref : `${BASE_URL}${sessionHref}`
    const date = parseDateFromHref(sessionHref)
    if (!date) return

    const timeRaw = $(el).find('span.extrabold').first().text().trim()
    const time = parseAstorTime(timeRaw)
    if (!time) return

    const format = $(el).find('div.technical_tags').text().trim() || null
    const flags = format ? [format] : []

    // Extract film titles from h2.uppercase links (one for single, two for double features)
    $(el).find('h2.uppercase a[href*="/films/"]').each((_, titleLink) => {
      const titleClone = $(titleLink).clone()
      titleClone.find('span').remove()
      const title = titleClone.text().trim()
      if (!title) return

      const rating = $(titleLink).find('span.rating').text().replace(/[[\]]/g, '').trim() || null

      const session: Session = {
        cinemaId: 'astor',
        date,
        time,
        ticketPrice: null,
        bookingUrl,        // session info page (no online ticket purchasing)
        flags,
      }

      const key = title.toLowerCase()
      const existing = filmMap.get(key)
      if (existing) {
        existing.sessions.push(session)
      } else {
        filmMap.set(key, {
          title,
          runtimeMinutes: formatRuntime(null),
          rating,
          sessions: [session],
          isNearingEndOfRun: false,
        })
      }
    })
  })

  return Array.from(filmMap.values())
}
