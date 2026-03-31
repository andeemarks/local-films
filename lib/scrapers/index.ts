/**
 * Aggregates all cinema scrapers into a single ScrapeResult.
 * Merges films with the same title across cinemas into one Film entry.
 */

import { chromium } from 'playwright'
import type { Film, ScrapeResult } from '../types'
import { computeNearingEndOfRun, SESSION_WINDOW_DAYS } from '../scraper-utils'
import { format, addDays } from 'date-fns'
import { scrapeNova } from './nova'
import { scrapeAstor } from './astor'
import { scrapeSun } from './sun'
import { scrapeKino } from './kino'

export async function scrapeAll(): Promise<ScrapeResult> {
  console.log('Launching Playwright browser for Kino...')
  const browser = await chromium.launch({ headless: true })

  let allFilms: Film[] = []
  const errors: string[] = []

  const scrapers: [string, () => Promise<Film[]>][] = [
    ['Kino', () => scrapeKino(browser)],
    ['Cinema Nova', () => scrapeNova()],
    ['Astor', () => scrapeAstor()],
    ['Sun Theatre', () => scrapeSun()],
  ]

  for (const [name, scrape] of scrapers) {
    try {
      console.log(`Scraping ${name}...`)
      const films = await scrape()
      console.log(`  → ${films.length} films, ${films.flatMap((f) => f.sessions).length} sessions`)
      allFilms = allFilms.concat(films)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ ${name} failed: ${msg}`)
      errors.push(`${name}: ${msg}`)
    }
  }

  await browser.close()

  if (errors.length > 0) {
    console.warn(`Scrape completed with ${errors.length} error(s):\n  ${errors.join('\n  ')}`)
  }

  // Drop sessions outside the 2-week window
  const today = format(new Date(), 'yyyy-MM-dd')
  const cutoff = format(addDays(new Date(), SESSION_WINDOW_DAYS), 'yyyy-MM-dd')
  for (const film of allFilms) {
    film.sessions = film.sessions.filter((s) => s.date >= today && s.date <= cutoff)
  }

  // Merge films with the same title (case-insensitive) across cinemas
  const merged = mergeFilms(allFilms.filter((f) => f.sessions.length > 0))

  // Compute nearing-end-of-run for each merged film
  for (const film of merged) {
    film.isNearingEndOfRun = computeNearingEndOfRun(film.sessions)
  }

  // Sort: nearing end first, then alphabetically
  merged.sort((a, b) => {
    if (a.isNearingEndOfRun !== b.isNearingEndOfRun) return a.isNearingEndOfRun ? -1 : 1
    return a.title.localeCompare(b.title)
  })

  return {
    films: merged,
    scrapedAt: new Date().toISOString(),
  }
}

function mergeFilms(films: Film[]): Film[] {
  const map = new Map<string, Film>()

  for (const film of films) {
    const key = film.title.toLowerCase().trim()
    const existing = map.get(key)
    if (existing) {
      existing.sessions.push(...film.sessions)
      // Prefer non-null values for metadata
      if (!existing.runtimeMinutes && film.runtimeMinutes) existing.runtimeMinutes = film.runtimeMinutes
      if (!existing.rating && film.rating) existing.rating = film.rating
    } else {
      map.set(key, { ...film, sessions: [...film.sessions] })
    }
  }

  return Array.from(map.values())
}
