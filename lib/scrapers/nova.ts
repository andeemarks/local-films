/**
 * Cinema Nova scraper — cinemanova.com.au
 *
 * Homepage: a.coming-soon-poster[href*="/films/"] → film detail URLs
 *
 * Detail page structure:
 *   #movie-content
 *     h3                          (film title, no class)
 *     div.start-times
 *       div.start-times-date      (date text, e.g. "Wednesday, 1st April")
 *       div.start-times-time
 *         a.showtime              (booking link)
 *           p                     (time text, e.g. "11:00")
 */

import * as cheerio from 'cheerio'
import type { Film, Session } from '../types'
import { parseDate, parseTime, formatRuntime } from '../scraper-utils'

const BASE_URL = 'https://www.cinemanova.com.au'

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

  const title = $('#movie-content h3').first().text().trim()
    || $('h3').first().text().trim()
  if (!title) return null

  const runtimeMinutes = formatRuntime(
    $('[class*="runtime"], [class*="duration"]').first().text()
  )
  const rating = $('[class*="rating"], [class*="classification"]').first().text().trim() || null

  const sessions: Session[] = []

  // Walk the start-times container — date divs set current date,
  // showtime links create sessions under that date
  let currentDate: string | null = null
  $('.start-times .row').children().each((_, el) => {
    const $el = $(el)
    const dateText = $el.find('div.start-times-date').first().text().trim()
    if (dateText) {
      const parsed = parseDate(dateText)
      if (parsed) currentDate = parsed
      return
    }

    if (!currentDate) return
    $el.find('a.showtime').each((_, link) => {
      const href = $(link).attr('href') ?? ''
      const timeText = $(link).find('p').first().text().trim()
      const time = parseTime(timeText)
      if (!time) return

      const flags: string[] = []
      const accessibilityText = $(link).find('small').text().trim()
      if (accessibilityText) flags.push(accessibilityText)

      sessions.push({
        cinemaId: 'nova',
        date: currentDate!,
        time,
        ticketPrice: null,
        bookingUrl: href,
        flags,
      })
    })
  })

  if (sessions.length === 0) return null
  return { title, runtimeMinutes, rating, sessions, isNearingEndOfRun: false }
}

export async function scrapeNova(): Promise<Film[]> {
  const html = await fetchHtml(BASE_URL)
  const $ = cheerio.load(html)

  const filmUrls = new Set<string>()
  $('a.coming-soon-poster[href*="/films/"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    if (href) filmUrls.add(href.startsWith('http') ? href : `${BASE_URL}${href}`)
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
