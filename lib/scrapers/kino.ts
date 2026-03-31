/**
 * Kino Cinema scraper — palacecinemas.com.au/cinemas/the-kino-melbourne
 * React SPA; Playwright required to wait for session data to load.
 *
 * Palace Cinemas loads session data via internal API calls after hydration.
 * We wait for the session grid to appear, then extract film + session data from the DOM.
 */

import type { Browser } from 'playwright'
import type { Film, Session } from '../types'
import { parseDate, parseTime, formatRuntime } from '../scraper-utils'

const SESSIONS_URL = 'https://www.palacecinemas.com.au/session-times?cinemas=the-kino-melbourne'

export async function scrapeKino(browser: Browser): Promise<Film[]> {
  const page = await browser.newPage()
  try {
    await page.goto(SESSIONS_URL, { waitUntil: 'networkidle', timeout: 30000 })

    // Wait for session content to render — Palace uses skeleton loaders while fetching
    await page.waitForSelector('[class*="session"], [class*="film"], [class*="movie"]', { timeout: 20000 })

    const films: Film[] = []
    const filmEls = await page.$$('[class*="filmDetail"], [class*="film-item"], [class*="movie-item"], article')

    for (const filmEl of filmEls) {
      const title = await filmEl.$eval(
        'h2, h3, [class*="title"]',
        (el) => el.textContent?.trim() ?? '',
      ).catch(() => '')
      if (!title) continue

      const runtimeText = await filmEl.$eval(
        '[class*="runtime"], [class*="duration"]',
        (el) => el.textContent ?? '',
      ).catch(() => '')
      const ratingText = await filmEl.$eval(
        '[class*="rating"], [class*="classification"]',
        (el) => el.textContent?.trim() ?? '',
      ).catch(() => '')

      const sessions: Session[] = []
      const sessionLinks = await filmEl.$$('a[href*="session"], a[href*="book"], a[href*="ticket"]')

      for (const link of sessionLinks) {
        const href = await link.getAttribute('href') ?? ''
        const bookingUrl = href.startsWith('http') ? href : `https://www.palacecinemas.com.au${href}`
        const linkText = await link.textContent() ?? ''

        // Palace encodes date in data attributes or nearby date headers
        const dateAttr = await link.getAttribute('data-date')
          ?? await link.$eval('xpath=ancestor::*[@data-date][1]', (el) => el.getAttribute('data-date') ?? '').catch(() => '')
        const dateHeaderText = await page.evaluate((el) => {
          // Walk up the DOM to find the nearest date heading
          let node = el.parentElement
          while (node) {
            const heading = node.previousElementSibling
            if (heading && /\d{1,2}\s+\w+|\w+\s+\d{1,2}/.test(heading.textContent ?? '')) {
              return heading.textContent?.trim() ?? ''
            }
            node = node.parentElement
          }
          return ''
        }, link).catch(() => '')

        const date = parseDate(dateAttr || dateHeaderText)
        const time = parseTime(linkText)
        if (!date || !time) continue

        sessions.push({
          cinemaId: 'kino',
          date,
          time,
          ticketPrice: null,
          bookingUrl,
          flags: [],
        })
      }

      if (sessions.length > 0) {
        films.push({
          title,
          runtimeMinutes: formatRuntime(runtimeText),
          rating: ratingText || null,
          sessions,
          isNearingEndOfRun: false,
        })
      }
    }

    return films
  } finally {
    await page.close()
  }
}
