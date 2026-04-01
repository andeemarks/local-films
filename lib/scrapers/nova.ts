/**
 * Cinema Nova scraper — cinemanova.com.au
 *
 * Homepage: bare <a href="/films/slug"> or <a href="https://...cinemanova.com.au/films/slug">
 * (no class on the anchor — previous agent gave us wrong class names)
 *
 * Detail page: no class-based selectors exist for sessions.
 * Dates are plain text nodes; times are bare <a href*="ticketing.cinemanova.com.au"> links.
 * We walk all nodes in document order — when we see date-like text we set currentDate,
 * when we see a ticketing link we emit a session under that date.
 */

import * as cheerio from 'cheerio'
import type { Film, Session } from '../types'
import { parseDate, parseTime } from '../scraper-utils'

const BASE_URL = 'https://www.cinemanova.com.au'
// Only match /films/ detail pages, not nav/utility links
const FILM_HREF_RE = /\/films\/[\w-]+\/?$/

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-films-bot/1.0)' },
  })
  if (!res.ok) throw new Error(`Nova fetch failed (${url}): ${res.status}`)
  return res.text()
}

async function scrapeFilmPage(url: string): Promise<Film | null> {
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)

  // Title is in the first h3 on the page
  const title = $('h3').first().text().trim()
  if (!title) return null

  const sessions: Session[] = []
  let currentDate: string | null = null

  // Walk every element in document order.
  // - Session links: a[href*="visSelectTickets"] — may have child <p> so don't restrict to leaves
  // - Dates: leaf text nodes only (no child elements)
  $('*').each((_, el) => {
    const $el = $(el)
    const href = $el.attr('href') ?? ''

    if (href.includes('visSelectTickets')) {
      if (!currentDate) return
      // Time may be in a child <p>; take the first whitespace-delimited token
      const timeText = $el.text().trim().split(/\s+/)[0]
      const time = parseTime(timeText)
      if (!time) return
      sessions.push({
        cinemaId: 'nova',
        date: currentDate,
        time,
        ticketPrice: null,
        bookingUrl: href,
        flags: [],
      })
    } else if ($el.children('*').length === 0) {
      // Leaf node — check if text looks like a date
      const text = $el.text().trim()
      if (!text || text.length > 40) return
      const parsed = parseDate(text)
      if (parsed) currentDate = parsed
    }
  })

  if (sessions.length === 0) return null
  return { title, runtimeMinutes: null, rating: null, sessions, isNearingEndOfRun: false }
}

export async function scrapeNova(): Promise<Film[]> {
  const html = await fetchHtml(BASE_URL)
  const $ = cheerio.load(html)

  const filmUrls = new Set<string>()
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    if (FILM_HREF_RE.test(href)) {
      filmUrls.add(href.startsWith('http') ? href : `${BASE_URL}${href}`)
    }
  })

  console.log(`  Nova: found ${filmUrls.size} film pages`)

  const films: Film[] = []
  for (const url of filmUrls) {
    try {
      const film = await scrapeFilmPage(url)
      if (film) films.push(film)
    } catch (err) {
      console.warn(`  Nova: failed to scrape ${url}: ${err instanceof Error ? err.message : err}`)
    }
  }

  return films
}
