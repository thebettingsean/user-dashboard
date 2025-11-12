import { Game } from '../api/sportsData'

export interface NormalizedGameSchedule {
  gameId: string
  sport: string
  season?: number
  week?: number
  status?: string
  startTimeUtc: string
  startTimeLabel: string
  homeTeam: string
  awayTeam: string
  venue?: string
}

/**
 * Trendline sends timestamps in 24-hour military format as EST times but labeled as UTC.
 * Example: "2025-11-16T13:00:00Z" = 1:00 PM EST (13:00 in 24-hour = 1 PM)
 * We just need to parse and format properly - the time values are already correct EST times.
 */
export function normalizeTrendlineDate(gameDate: string): { utc: string; label: string } {
  if (!gameDate) {
    return {
      utc: new Date().toISOString(),
      label: 'TBD'
    }
  }

  // Parse the date string - Trendline format: "2025-11-16T13:00:00Z"
  const match = gameDate.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
  if (!match) {
    return {
      utc: new Date().toISOString(),
      label: 'TBD'
    }
  }

  const [, year, month, day, hour, minute] = match
  const hourNum = parseInt(hour, 10)
  const minuteNum = parseInt(minute, 10)

  // Convert 24-hour to 12-hour format
  let hour12 = hourNum
  let ampm = 'AM'
  
  if (hourNum === 0) {
    hour12 = 12 // Midnight
  } else if (hourNum === 12) {
    ampm = 'PM' // Noon
  } else if (hourNum > 12) {
    hour12 = hourNum - 12
    ampm = 'PM'
  }

  const label = `${hour12}:${minute} ${ampm} ET`

  // Store as proper UTC (add 5 hours to EST to get UTC)
  const estDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`)
  const utcDate = new Date(estDate.getTime() + (5 * 60 * 60 * 1000))

  return {
    utc: utcDate.toISOString(),
    label
  }
}

export function getTeamNickname(name: string) {
  if (!name) return ''
  const parts = name.trim().split(' ')
  return parts[parts.length - 1] || name
}

export function mapScheduleFromTrendline(game: Game, sport: string): NormalizedGameSchedule {
  const { utc, label } = normalizeTrendlineDate(game.game_date)

  return {
    gameId: game.game_id,
    sport,
    season: (game as any).season ?? undefined,
    status: (game as any).game_status?.game_status ?? 'scheduled',
    startTimeUtc: utc,
    startTimeLabel: label,
    homeTeam: getTeamNickname(game.home_team),
    awayTeam: getTeamNickname(game.away_team),
    venue: (game as any).game_location ?? undefined
  }
}
