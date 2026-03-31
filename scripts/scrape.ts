#!/usr/bin/env tsx
/**
 * Standalone scrape script — called by GitHub Actions daily cron.
 * Writes output to public/data/sessions.json.
 *
 * Usage:
 *   npx tsx scripts/scrape.ts
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { scrapeAll } from '../lib/scrapers'

async function main() {
  console.log('Starting scrape...')
  const result = await scrapeAll()
  console.log(`Scraped ${result.films.length} films total`)

  const outDir = join(process.cwd(), 'public', 'data')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'sessions.json')
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8')
  console.log(`Written to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
