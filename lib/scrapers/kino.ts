/**
 * Kino Cinema scraper — palacecinemas.com.au
 * React SPA; Playwright is used to intercept the JSON API response
 * that the app fetches on load, rather than parsing the rendered DOM.
 *
 * Strategy: navigate to the Kino session-times page, intercept any JSON
 * response that contains session/film data, parse it directly.
 * Falls back to DOM parsing if no suitable API response is captured.
 */

import type { Browser } from 'playwright'
import type { Film, Session } from '../types'
import { parseDate, parseTime, formatRuntime } from '../scraper-utils'

const SESSIONS_URL =
  'https://www.palacecinemas.com.au/session-times?cinemas=the-kino-melbourne'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFilmsFromApiData(data: any): Film[] {
  const films: Film[] = []

  // Palace API response shape varies — try common patterns
  const sessionGroups: unknown[] =
    data?.sessions ?? data?.data?.sessions ?? data?.movies ?? data?.data?.movies ??
    data?.films ?? data?.data?.films ?? []

  for (const item of sessionGroups as Record<string, unknown>[]) {
    const title: string =
      (item?.title ?? item?.name ?? item?.movieName ?? '') as string
    if (!title) continue

    const runtimeMinutes = formatRuntime(
      String(item?.runtime ?? item?.duration ?? item?.runTime ?? '')
    )
    const rating = (item?.rating ?? item?.classification ?? null) as string | null

    const rawSessions: unknown[] =
      (item?.sessions ?? item?.times ?? item?.screenings ?? []) as unknown[]

    const sessions: Session[] = []
    for (const s of rawSessions as Record<string, unknown>[]) {
      const dateStr = String(s?.date ?? s?.sessionDate ?? s?.showDate ?? '')
      const timeStr = String(s?.time ?? s?.sessionTime ?? s?.showTime ?? '')
      const date = parseDate(dateStr)
      const time = parseTime(timeStr)
      if (!date || !time) continue

      sessions.push({
        cinemaId: 'kino',
        date,
        time,
        ticketPrice: null,
        bookingUrl: (s?.bookingUrl ?? s?.url ?? s?.link ?? null) as string | null,
        flags: [],
      })
    }

    if (sessions.length > 0) {
      films.push({ title, runtimeMinutes, rating, sessions, isNearingEndOfRun: false })
    }
  }

  return films
}

export async function scrapeKino(browser: Browser): Promise<Film[]> {
  const page = await browser.newPage()

  // Collect all JSON API responses while the page loads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiResponses: any[] = []

  page.on('response', async (response) => {
    const url = response.url()
    const contentType = response.headers()['content-type'] ?? ''
    if (
      contentType.includes('application/json') &&
      !url.includes('analytics') &&
      !url.includes('segment') &&
      !url.includes('sentry')
    ) {
      try {
        const json = await response.json()
        apiResponses.push(json)
      } catch {
        // ignore non-JSON or already-consumed responses
      }
    }
  })

  try {
    await page.goto(SESSIONS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    // Give the SPA time to fire its API calls and render
    await page.waitForTimeout(8000)

    // Try to find session data in any captured API response
    for (const data of apiResponses) {
      const films = extractFilmsFromApiData(data)
      if (films.length > 0) {
        console.log(`  Kino: found data via API interception (${films.length} films)`)
        return films
      }
    }

    // Fallback: try extracting from the rendered DOM
    console.log('  Kino: API interception found no data, falling back to DOM parsing')
    return await extractFromDom(page)
  } finally {
    await page.close()
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractFromDom(page: any): Promise<Film[]> {
  const films: Film[] = []

  try {
    // Try to find any element that might contain film/session data
    const content = await page.content()
    const { load } = await import('cheerio')
    const $ = load(content)

    // Palace uses Chakra UI — class names are hashed. Look for data attributes or text patterns.
    // Find all links that look like booking links
    $('a[href*="session"], a[href*="ticket"], a[href*="book"]').each((_, link) => {
      const href = $(link).attr('href') ?? ''
      const timeText = $(link).text().trim()
      const time = parseTime(timeText)
      if (!time) return

      // Look for a nearby heading as the film title
      const heading = $(link).closest('section, article, [class]')
        .find('h1, h2, h3').first().text().trim()
      if (!heading) return

      const dateAttr = $(link).attr('data-date')
        ?? $(link).closest('[data-date]').attr('data-date')
      const date = parseDate(dateAttr ?? '')
      if (!date) return

      films.push({
        title: heading,
        runtimeMinutes: null,
        rating: null,
        sessions: [{ cinemaId: 'kino', date, time, ticketPrice: null, bookingUrl: href, flags: [] }],
        isNearingEndOfRun: false,
      })
    })
  } catch (err) {
    console.warn('  Kino DOM fallback failed:', err instanceof Error ? err.message : err)
  }

  return films
}
