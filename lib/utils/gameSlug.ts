/**
 * Utility functions for generating SEO-friendly game slugs
 * Format: {away-team}-at-{home-team}-{month}-{day}
 * Example: jets-at-patriots-november-13
 */

/**
 * Converts a team name to a slug-friendly format
 */
function slugifyTeamName(teamName: string): string {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Generates a SEO-friendly slug from game data
 */
export function generateGameSlug(
  awayTeam: string,
  homeTeam: string,
  kickoff: string
): string {
  const awaySlug = slugifyTeamName(awayTeam)
  const homeSlug = slugifyTeamName(homeTeam)
  
  const date = new Date(kickoff)
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ]
  
  const month = months[date.getMonth()]
  const day = date.getDate()
  
  return `${awaySlug}-at-${homeSlug}-${month}-${day}`
}

/**
 * Generates full game path
 */
export function generateGamePath(
  sport: string,
  awayTeam: string,
  homeTeam: string,
  kickoff: string,
  tab?: string
): string {
  const slug = generateGameSlug(awayTeam, homeTeam, kickoff)
  const basePath = `/new/${sport.toLowerCase()}/games/${slug}`
  
  if (tab) {
    return `${basePath}/${tab}`
  }
  
  return basePath
}

