export type CinemaId = 'kino' | 'nova' | 'astor' | 'sun'

export interface Cinema {
  id: CinemaId
  name: string
  suburb: string
  url: string
}

export const CINEMAS: Record<CinemaId, Cinema> = {
  kino: {
    id: 'kino',
    name: 'Kino',
    suburb: 'Melbourne CBD',
    url: 'https://www.palacecinemas.com.au/cinemas/the-kino-melbourne',
  },
  nova: {
    id: 'nova',
    name: 'Cinema Nova',
    suburb: 'Carlton',
    url: 'https://www.cinemanova.com.au',
  },
  astor: {
    id: 'astor',
    name: 'Astor',
    suburb: 'St Kilda',
    url: 'https://www.astortheatre.net.au',
  },
  sun: {
    id: 'sun',
    name: 'Sun Theatre',
    suburb: 'Yarraville',
    url: 'https://suntheatre.com.au',
  },
}

export interface Session {
  cinemaId: CinemaId
  /** ISO 8601 date string, e.g. "2026-04-01" */
  date: string
  /** 24-hour time string, e.g. "19:30" */
  time: string
  /** Ticket price as a display string, e.g. "$12.50" — null if unknown */
  ticketPrice: string | null
  /** Booking URL */
  bookingUrl: string | null
  /** Special format or notes, e.g. "35mm", "Lounge", "Baby" */
  flags: string[]
}

export interface Film {
  title: string
  /** Runtime in minutes — null if unknown */
  runtimeMinutes: number | null
  /** Rating classification, e.g. "M", "PG", "MA15+" */
  rating: string | null
  sessions: Session[]
  /** True if the last session across all cinemas is within NEARING_END_DAYS days */
  isNearingEndOfRun: boolean
}

export interface ScrapeResult {
  films: Film[]
  /** ISO 8601 datetime this scrape was run */
  scrapedAt: string
}
