/**
 * Utility functions for generating SEO-friendly game slugs
 * 
 * Format: {away-team}-at-{home-team}-{month}-{day}
 * Example: eagles-at-packers-november-10
 */

const monthNames = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
]

/**
 * Converts a team name to a slug-friendly format
 * Removes special characters, converts to lowercase, replaces spaces with hyphens
 */
function slugifyTeamName(teamName: string): string {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
}

/**
 * Generates a SEO-friendly slug from game data
 * 
 * @param awayTeam - Away team name (e.g., "Eagles", "Lakers")
 * @param homeTeam - Home team name (e.g., "Packers", "Celtics")
 * @param kickoff - Game kickoff date/time (ISO string or Date object)
 * @returns SEO-friendly slug (e.g., "eagles-at-packers-november-10")
 */
export function generateGameSlug(
  awayTeam: string,
  homeTeam: string,
  kickoff: string | Date
): string {
  const date = typeof kickoff === 'string' ? new Date(kickoff) : kickoff
  
  const awaySlug = slugifyTeamName(awayTeam)
  const homeSlug = slugifyTeamName(homeTeam)
  const month = monthNames[date.getMonth()]
  const day = date.getDate()
  
  return `${awaySlug}-at-${homeSlug}-${month}-${day}`
}

/**
 * Parses a game slug back into its components
 * 
 * @param slug - Game slug (e.g., "eagles-at-packers-november-10")
 * @returns Object with awayTeam, homeTeam, month, day or null if invalid
 */
export function parseGameSlug(slug: string): {
  awayTeam: string
  homeTeam: string
  month: string
  day: number
} | null {
  // Pattern: {team}-at-{team}-{month}-{day}
  const parts = slug.split('-at-')
  if (parts.length !== 2) return null
  
  const awayTeam = parts[0]
  const rest = parts[1].split('-')
  
  // Need at least: team, month, day
  if (rest.length < 3) return null
  
  const day = parseInt(rest[rest.length - 1], 10)
  const month = rest[rest.length - 2]
  const homeTeam = rest.slice(0, -2).join('-')
  
  if (isNaN(day) || !monthNames.includes(month)) return null
  
  return { awayTeam, homeTeam, month, day }
}

/**
 * Generates a game URL path
 * 
 * @param sport - Sport ID (e.g., "nfl", "nba")
 * @param awayTeam - Away team name
 * @param homeTeam - Home team name
 * @param kickoff - Game kickoff date/time
 * @returns Full URL path (e.g., "/nfl/games/eagles-at-packers-november-10")
 */
export function generateGamePath(
  sport: string,
  awayTeam: string,
  homeTeam: string,
  kickoff: string | Date
): string {
  const slug = generateGameSlug(awayTeam, homeTeam, kickoff)
  return `/${sport.toLowerCase()}/games/${slug}`
}

/**
 * Generates a game section URL path
 * 
 * @param sport - Sport ID (e.g., "nfl", "nba")
 * @param awayTeam - Away team name
 * @param homeTeam - Home team name
 * @param kickoff - Game kickoff date/time
 * @param section - Section name (e.g., "picks", "ai-script", "public-betting")
 * @returns Full URL path (e.g., "/nfl/games/eagles-at-packers-november-10/picks")
 */
export function generateGameSectionPath(
  sport: string,
  awayTeam: string,
  homeTeam: string,
  kickoff: string | Date,
  section: string
): string {
  const slug = generateGameSlug(awayTeam, homeTeam, kickoff)
  return `/${sport.toLowerCase()}/games/${slug}/${section}`
}

