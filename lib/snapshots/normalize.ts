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

export function normalizeTrendlineDate(gameDate: string): { utc: string; label: string } {
  if (!gameDate) {
    return {
      utc: new Date().toISOString(),
      label: 'TBD'
    }
  }

  // Trendline sends UTC timestamps - parse and keep as UTC
  const kickoff = new Date(gameDate)

  if (Number.isNaN(kickoff.getTime())) {
    return {
      utc: new Date().toISOString(),
      label: 'TBD'
    }
  }

  // Format the label in EST timezone
  const estFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  })

  return {
    utc: kickoff.toISOString(),
    label: `${estFormatter.format(kickoff)} ET`
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
