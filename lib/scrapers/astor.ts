/**
 * Astor Theatre scraper — astortheatre.net.au
 *
 * Uses the Astor RSS feed which is far more reliable than HTML scraping.
 * Feed URL: https://www.astortheatre.net.au/?feed=astor-rss
 *
 * Each <item> is one session. The <title> encodes date, time, and film title:
 *   "Thu, 02 Apr 2026 at 7:00pm - Once Upon a Time… In Hollywood – 35MM"
 *
 * The <link> encodes the date numerically: /sessions/2026-04-02-1900
 * Used as the booking URL (links to the session info page).
 */

import * as cheerio from 'cheerio'
import type { Film, Session } from '../types'
import { parseTime } from '../scraper-utils'
import { parse, format, isValid } from 'date-fns'

const RSS_URL = 'https://www.astortheatre.net.au/?feed=astor-rss'

// "Thu, 02 Apr 2026 at 7:00pm - Film Title Here"
const TITLE_RE = /\d{1,2}\s+\w+\s+\d{4}\s+at\s+(\d{1,2}:\d{2}(?:am|pm))\s+-\s+(.+)$/i
const DATE_RE = /(\d{1,2}\s+\w+\s+\d{4})/

function parseRssDate(raw: string): string | null {
  const match = raw.match(DATE_RE)
  if (!match) return null
  const d = parse(match[1], 'd MMM yyyy', new Date())
  return isValid(d) ? format(d, 'yyyy-MM-dd') : null
}

export async function scrapeAstor(): Promise<Film[]> {
  const res = await fetch(RSS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-films-bot/1.0)' },
  })
  if (!res.ok) throw new Error(`Astor RSS fetch failed: ${res.status}`)
  const xml = await res.text()
  const $ = cheerio.load(xml, { xmlMode: true })

  const filmMap = new Map<string, Film>()

  $('item').each((_, el) => {
    const titleRaw = $(el).find('title').first().text().trim()
    const link = $(el).find('link').first().text().trim()

    const match = titleRaw.match(TITLE_RE)
    if (!match) return

    const time = parseTime(match[1])
    const filmTitle = match[2].trim()
    const date = parseRssDate(titleRaw)
    if (!time || !date || !filmTitle) return

    const session: Session = {
      cinemaId: 'astor',
      date,
      time,
      ticketPrice: null,
      bookingUrl: link || null,
      flags: [],
    }

    const key = filmTitle.toLowerCase()
    const existing = filmMap.get(key)
    if (existing) {
      existing.sessions.push(session)
    } else {
      filmMap.set(key, {
        title: filmTitle,
        runtimeMinutes: null,
        rating: null,
        sessions: [session],
        isNearingEndOfRun: false,
      })
    }
  })

  return Array.from(filmMap.values())
}
