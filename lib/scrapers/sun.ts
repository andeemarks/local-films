/**
 * Sun Theatre scraper — suntheatre.com.au
 *
 * Structure:
 *   div.wpcinema_allshowing_movie
 *     h3.movietitle > a          (title text + span.rating inside)
 *     div.wpc-session-wrap       (one per date group)
 *       div.wpc-movie-label      (date text, e.g. "Fri 3rd Apr:")
 *       div.wpc-session-times
 *         span.wpcinema_session_available > a[href*="movietkts"]
 */

import * as cheerio from 'cheerio'
import type { Film, Session } from '../types'
import { parseTime, formatRuntime } from '../scraper-utils'

const NOW_PLAYING_URL = 'https://suntheatre.com.au/now-playing/'
const SESSION_FLAG_PATTERN = /\b(L|AKP|Bub|70mm|35mm|MIFF)\b/g

export async function scrapeSun(): Promise<Film[]> {
  const res = await fetch(NOW_PLAYING_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-films-bot/1.0)' },
  })
  if (!res.ok) throw new Error(`Sun Theatre fetch failed: ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  const films: Film[] = []

  $('div.wpcinema_allshowing_movie').each((_, container) => {
    const titleAnchor = $(container).find('h3.movietitle > a').first()

    // Title text is the direct text node; rating is in a child span — clone and remove span
    const titleClone = titleAnchor.clone()
    titleClone.find('span').remove()
    const title = titleClone.text().trim()
    if (!title) return

    const rating = titleAnchor.find('span.rating').text().replace(/[()]/g, '').trim() || null
    const runtimeMinutes = formatRuntime(
      $(container).find('[class*="runtime"], [class*="duration"]').first().text()
    )

    const sessions: Session[] = []

    $(container).find('div.wpc-session-wrap').each((_, wrap) => {
      // Date is in the URL for available sessions — extract from movietkts URL
      $(wrap).find('span.wpcinema_session_available a[href*="movietkts"]').each((_, link) => {
        const href = $(link).attr('href') ?? ''

        // Date embedded in URL: /YYYY-MM-DD/
        const dateMatch = href.match(/\/(\d{4}-\d{2}-\d{2})\//)
        if (!dateMatch) return
        const date = dateMatch[1]

        // Time is link text; strip flag spans first
        const linkClone = $(link).clone()
        linkClone.find('span').remove()
        const rawTime = linkClone.text().trim()
        const time = parseTime(rawTime)
        if (!time) return

        const flags: string[] = []
        // Flags are in span children of the link (e.g. <span class="cat-gold-icon">L</span>)
        $(link).find('span').each((_, span) => {
          const flag = $(span).text().trim()
          if (flag) flags.push(flag)
        })
        // Also catch inline flag tokens in the text
        const textFlags = rawTime.match(SESSION_FLAG_PATTERN)
        if (textFlags) flags.push(...textFlags.filter((f) => !flags.includes(f)))

        sessions.push({
          cinemaId: 'sun',
          date,
          time,
          ticketPrice: null,
          bookingUrl: href,
          flags,
        })
      })
    })

    if (sessions.length > 0) {
      films.push({ title, runtimeMinutes, rating, sessions, isNearingEndOfRun: false })
    }
  })

  return films
}
