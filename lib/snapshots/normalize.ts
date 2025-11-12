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

function getTimezoneOffsetInMinutes(date: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const parts = f.formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || '0')
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return (asUtc - date.getTime()) / 60000
}

function toUtcFromTrendline(gameDate: string): string {
  if (!gameDate) return new Date().toISOString()

  // Trendline already sends proper UTC timestamps
  // Just validate and return as-is
  const date = new Date(gameDate)
  
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString()
  }
  
  return date.toISOString()
}

export function normalizeTrendlineDate(gameDate: string): { utc: string; label: string } {
  const utc = toUtcFromTrendline(gameDate)
  const kickoff = new Date(utc)

  if (Number.isNaN(kickoff.getTime())) {
    return {
      utc: new Date().toISOString(),
      label: 'TBD'
    }
  }

  const estFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  })

  return {
    utc,
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
