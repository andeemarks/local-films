# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Next.js dev server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
npm run scrape     # Run all scrapers and write public/data/sessions.json
```

## Architecture

### Data flow

1. **Scraping** (`scripts/scrape.ts`) — entry point called by GitHub Actions daily (`.github/workflows/scrape.yml`). Runs all scrapers, merges results, writes `public/data/sessions.json` and commits it.
2. **Next.js app** reads `sessions.json` at request time (`app/page.tsx` via `readFileSync`) — no database, no API routes, no server-side fetching at runtime.
3. **Vercel** auto-deploys on every push, including the daily scrape commit.

### Scrapers (`lib/scrapers/`)

- `kino.ts` — Palace Cinemas (React SPA); requires a Playwright `Browser` instance passed in
- `nova.ts`, `astor.ts`, `sun.ts` — static/WordPress HTML; use Cheerio
- `index.ts` — launches one Playwright browser, runs all scrapers, merges films with the same title across cinemas, computes `isNearingEndOfRun`

All scrapers return `Film[]` with `isNearingEndOfRun: false`; the flag is set by `computeNearingEndOfRun` in the aggregator after merging.

Shared parsing helpers are in `lib/scraper-utils.ts`: `parseDate`, `parseTime`, `formatRuntime`, `computeNearingEndOfRun`.

### Types (`lib/types.ts`)

Core interfaces: `Film`, `Session`, `Cinema`, `ScrapeResult`. The `CINEMAS` const maps `CinemaId` → metadata (name, suburb, URL).

### UI (`app/components/`)

- `FilmList` — client component, owns filter state (active cinemas + nearing-end toggle)
- `FilmCard` — renders one film: metadata row + sessions grouped by date
- `SessionPill` — single session as a coloured, clickable badge linking to the booking URL
- `Filters` — cinema toggles + "Last few days" toggle

### "Nearing end of run"

A film is flagged if its last session across all cinemas falls within `NEARING_END_DAYS` (= 3) days from today. Defined in `lib/scraper-utils.ts`.

## Scraper maintenance

Cinema websites change layouts without notice. When a scraper returns 0 films:

1. Fetch the target URL in a browser and inspect the current HTML structure
2. Update the CSS selectors in the relevant scraper file
3. Run `npm run scrape` locally to verify output in `public/data/sessions.json`

The Kino scraper (`kino.ts`) is the most fragile — Palace Cinemas is a React SPA and their DOM structure may change with deployments.
