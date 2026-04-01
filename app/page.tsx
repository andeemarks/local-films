import { readFileSync } from 'fs'
import { join } from 'path'
import type { ScrapeResult } from '@/lib/types'
import FilmList from './components/FilmList'

function loadSessions(): ScrapeResult {
  const filePath = join(process.cwd(), 'public', 'data', 'sessions.json')
  const raw = readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as ScrapeResult
}

function formatScrapedAt(iso: string | null): string {
  if (!iso) return 'never'
  return new Date(iso).toLocaleString('en-AU', {
    timeZone: 'Australia/Melbourne',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function Home() {
  const { films, scrapedAt } = loadSessions()

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">
            Now Showing
          </h1>
          {scrapedAt && (
            <p className="mt-1 text-sm text-zinc-400">updated {formatScrapedAt(scrapedAt)}</p>
          )}
        </div>

        {films.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-16 text-center">
            <p className="text-zinc-500">
              No session data yet.{' '}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm">npm run scrape</code>{' '}
              to populate.
            </p>
          </div>
        ) : (
          <FilmList films={films} />
        )}
      </div>
    </main>
  )
}
