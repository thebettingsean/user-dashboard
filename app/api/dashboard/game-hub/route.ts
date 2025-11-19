import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co'
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'

const SNAPSHOTS_SUPABASE_URL = process.env.SNAPSHOTS_SUPABASE_URL || 'https://knccqavkxvezhdfoktay.supabase.co'
const SNAPSHOTS_SUPABASE_SERVICE_KEY =
  process.env.SNAPSHOTS_SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY2NxYXZreHZlemhkZm9rdGF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1ODkwNywiZXhwIjoyMDY3OTM0OTA3fQ.JjGpZGVnZsN7P2lldSrtByx8Y9cqJjzTj3mYm8fj29M'

const snapshotsClient = createClient(SNAPSHOTS_SUPABASE_URL, SNAPSHOTS_SUPABASE_SERVICE_KEY)

const SUPPORTED_SPORTS = ['nfl', 'nba', 'nhl', 'cfb'] as const

type SupportedSport = (typeof SUPPORTED_SPORTS)[number]

type SpreadSummary = {
  label: string | null
  homeLine: number | null
  homeOdds: number | null
  awayLine: number | null
  awayOdds: number | null
}

type TotalsSummary = {
  label: string | null
  number: number | null
  overOdds: number | null
  underOdds: number | null
}

type PublicMoneySummary = {
  public_money_ml_away_bets_pct?: number | null
  public_money_ml_away_stake_pct?: number | null
  public_money_ml_home_bets_pct?: number | null
  public_money_ml_home_stake_pct?: number | null
  public_money_spread_away_bets_pct?: number | null
  public_money_spread_away_stake_pct?: number | null
  public_money_spread_home_bets_pct?: number | null
  public_money_spread_home_stake_pct?: number | null
  public_money_over_bets_pct?: number | null
  public_money_over_stake_pct?: number | null
  public_money_under_bets_pct?: number | null
  public_money_under_stake_pct?: number | null
  sharp_money_stats?: Array<Record<string, any>>
  rlm_stats?: Array<Record<string, any>>
  top_market?: {
    label: string
    bets: number | null
  }
}

type TrendSummary = {
  home_roi?: number | null
  away_roi?: number | null
}

type DashboardGameSummary = {
  id: string
  sport: string
  awayTeam: string
  homeTeam: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
  kickoff: string
  kickoffLabel: string
  spread: SpreadSummary | null
  totals: TotalsSummary | null
  moneyline: {
    home: number | null
    away: number | null
  }
  script: {
    strengthLabel: 'Edge' | 'Moderate' | 'Strong' | null
    creditsRequired: number | null
    generatedAt: string | null
  }
  picks: {
    total: number
  }
  publicMoney: PublicMoneySummary | null
  teamTrends: TrendSummary | null
  propsCount: number
  referee: Record<string, unknown> | null
}

function getEstStartOfDay(date: Date) {
  const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  estDate.setHours(0, 0, 0, 0)
  return estDate
}

function formatDateOnly(date: Date) {
  return date.toISOString().split('T')[0]
}

function getNflRange() {
  const estToday = getEstStartOfDay(new Date())
  const end = new Date(estToday)
  end.setDate(estToday.getDate() + 7)
  return {
    from: formatDateOnly(estToday),
    to: formatDateOnly(end)
  }
}

function getDateRangeForSport(sport: SupportedSport) {
  const estToday = getEstStartOfDay(new Date())
  const end = new Date(estToday)

  switch (sport) {
    case 'nba':
    default:
      break
  }

  return {
    from: formatDateOnly(estToday),
    to: formatDateOnly(end)
  }
}

function getTeamNickname(name: string) {
  if (!name) return ''
  const parts = name.trim().split(' ')
  return parts[parts.length - 1] || name
}

function formatSpreadLabel(homeTeam: string, awayTeam: string, spread?: any) {
  if (!spread) return null
  const { home_line, away_line, current } = spread
  if (typeof home_line === 'number') {
    const value = home_line > 0 ? `+${home_line}` : `${home_line}`
    return `${getTeamNickname(homeTeam)} ${value}`
  }
  if (typeof away_line === 'number') {
    const value = away_line > 0 ? `+${away_line}` : `${away_line}`
    return `${getTeamNickname(awayTeam)} ${value}`
  }
  if (typeof current === 'number') {
    const value = current > 0 ? `+${current}` : `${current}`
    return `${value}`
  }
  return null
}

function formatTotalsLabel(totals?: any) {
  if (!totals) return null
  if (typeof totals.number === 'number') {
    return `Total ${totals.number}`
  }
  return null
}

function getTopMarketLabel(pm: any) {
  if (!pm) return null
  const marketCandidates: Array<{ label: string; bets: number | null }> = []
  if (pm.public_money_ml_home_bets_pct !== undefined) {
    marketCandidates.push({ label: 'home', bets: pm.public_money_ml_home_bets_pct })
  }
  if (pm.public_money_ml_away_bets_pct !== undefined) {
    marketCandidates.push({ label: 'away', bets: pm.public_money_ml_away_bets_pct })
  }
  if (pm.public_money_over_bets_pct !== undefined) {
    marketCandidates.push({ label: 'over', bets: pm.public_money_over_bets_pct })
  }
  if (pm.public_money_under_bets_pct !== undefined) {
    marketCandidates.push({ label: 'under', bets: pm.public_money_under_bets_pct })
  }
  if (marketCandidates.length === 0) return null
  return marketCandidates.sort((a, b) => (b.bets ?? -Infinity) - (a.bets ?? -Infinity))[0]
}

function getTrendSummary(trends: any): TrendSummary | null {
  const competitors = trends?.h2h_3year?.competitors
  if (!competitors) return null
  const homeSpreadRoi = competitors.home?.team_stats?.spread?.roi ?? competitors.home?.team_stats?.moneyline?.roi ?? null
  const awaySpreadRoi = competitors.away?.team_stats?.spread?.roi ?? competitors.away?.team_stats?.moneyline?.roi ?? null
  return {
    home_roi: typeof homeSpreadRoi === 'number' ? homeSpreadRoi : null,
    away_roi: typeof awaySpreadRoi === 'number' ? awaySpreadRoi : null
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sportParam = (searchParams.get('sport') || 'nfl').toLowerCase()

    if (!SUPPORTED_SPORTS.includes(sportParam as SupportedSport)) {
      return NextResponse.json(
        { error: 'Unsupported sport. Use nfl or nba.' },
        { status: 400 }
      )
    }

    const sport = sportParam as SupportedSport
    
    // Get current time and a future cutoff (7 days for NFL/CFB, 2 days for NBA/NHL)
    const now = new Date()
    const futureDate = new Date(now)
    futureDate.setDate(now.getDate() + (['nfl', 'cfb'].includes(sport) ? 7 : 2))

    // Query appropriate table based on sport (college_game_snapshots for CFB, game_snapshots for others)
    const tableName = sport === 'cfb' ? 'college_game_snapshots' : 'game_snapshots'
    const { data: snapshotRows, error: snapshotError} = await snapshotsClient
      .from(tableName)
      .select('game_id, sport, away_team, home_team, start_time_utc, start_time_label, spread, totals, moneyline, script_meta, picks_meta, public_money, team_stats, props, referee, raw_payload')
      .eq('sport', sport.toUpperCase())
      .gte('start_time_utc', now.toISOString())
      .lte('start_time_utc', futureDate.toISOString())
      .order('start_time_utc', { ascending: true })

    if (snapshotError) {
      console.error('Failed to read game snapshots:', snapshotError)
      return NextResponse.json({ error: 'Failed to load snapshots' }, { status: 500 })
    }

    if (!snapshotRows || snapshotRows.length === 0) {
      return NextResponse.json({ sport: sport.toUpperCase(), games: [], spotlightGameId: null })
    }

    const summaries: DashboardGameSummary[] = snapshotRows.map((row) => {
      const spreadSummary: SpreadSummary | null = row.spread
        ? {
            label: formatSpreadLabel(row.home_team, row.away_team, row.spread),
            homeLine: row.spread.home ?? null,
            homeOdds: row.spread.home_odds ?? null,
            awayLine: row.spread.away ?? null,
            awayOdds: row.spread.away_odds ?? null
          }
        : null

      const totalsSummary: TotalsSummary | null = row.totals
        ? {
            label: formatTotalsLabel(row.totals),
            number: row.totals.over ?? row.totals.under ?? null, // Use over or under (they should be the same)
            overOdds: row.totals.over_odds ?? null,
            underOdds: row.totals.under_odds ?? null
          }
        : null

      const topMarket = getTopMarketLabel(row.public_money)
      const propsCount = Array.isArray(row.props)
        ? row.props.reduce((count: number, category: any) => {
            if (!category || !Array.isArray(category.players)) return count
            return count + category.players.length
          }, 0)
        : 0

      const rawPayload = row.raw_payload as any
      const awayTeamLogo = rawPayload?.away_team_logo ?? null
      const homeTeamLogo = rawPayload?.home_team_logo ?? null

      return {
        id: row.game_id,
        sport: row.sport,
        awayTeam: row.away_team,
        homeTeam: row.home_team,
        awayTeamLogo,
        homeTeamLogo,
        kickoff: row.start_time_utc,
        kickoffLabel: row.start_time_label,
        spread: spreadSummary,
        totals: totalsSummary,
        moneyline: {
          home: row.moneyline?.home ?? null,
          away: row.moneyline?.away ?? null
        },
        script: {
          strengthLabel: row.script_meta?.strength_label ?? null,
          creditsRequired: row.script_meta?.credits_required ?? null,
          generatedAt: row.script_meta?.generated_at ?? null
        },
        picks: {
          total: row.picks_meta?.pending_count ?? 0
        },
        publicMoney: row.public_money
          ? {
              public_money_ml_away_bets_pct: row.public_money.public_money_ml_away_bets_pct ?? null,
              public_money_ml_away_stake_pct: row.public_money.public_money_ml_away_stake_pct ?? null,
              public_money_ml_home_bets_pct: row.public_money.public_money_ml_home_bets_pct ?? null,
              public_money_ml_home_stake_pct: row.public_money.public_money_ml_home_stake_pct ?? null,
              public_money_spread_away_bets_pct: row.public_money.public_money_spread_away_bets_pct ?? null,
              public_money_spread_away_stake_pct: row.public_money.public_money_spread_away_stake_pct ?? null,
              public_money_spread_home_bets_pct: row.public_money.public_money_spread_home_bets_pct ?? null,
              public_money_spread_home_stake_pct: row.public_money.public_money_spread_home_stake_pct ?? null,
              public_money_over_bets_pct: row.public_money.public_money_over_bets_pct ?? null,
              public_money_over_stake_pct: row.public_money.public_money_over_stake_pct ?? null,
              public_money_under_bets_pct: row.public_money.public_money_under_bets_pct ?? null,
              public_money_under_stake_pct: row.public_money.public_money_under_stake_pct ?? null,
              sharp_money_stats: row.public_money.sharp_money_stats ?? [],
              rlm_stats: row.public_money.rlm_stats ?? [],
              top_market: topMarket ? { label: topMarket.label, bets: topMarket.bets ?? null } : undefined
            }
          : null,
        teamTrends: getTrendSummary(row.team_stats),
        teamStats: row.team_stats, // Full team stats including 3-year betting data
        referee: row.referee ?? null, // Referee stats for O/U trends
        props: row.props || [], // Player props
        propsCount
      }
    })

    const upcomingSorted = [...summaries].sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    
    // Featured game: soonest game with strong script. If tied on script strength, earliest kickoff wins.
    const spotlight = [...upcomingSorted].sort((a, b) => {
      const timeA = new Date(a.kickoff).getTime()
      const timeB = new Date(b.kickoff).getTime()
      const strengthA = a.script.creditsRequired ?? 0
      const strengthB = b.script.creditsRequired ?? 0
      
      // First priority: soonest game
      if (timeA !== timeB) {
        return timeA - timeB
      }
      
      // Tiebreaker: strongest script
      return strengthB - strengthA
    })[0]

    const response = NextResponse.json({
      sport: sport.toUpperCase(),
      games: upcomingSorted,
      spotlightGameId: spotlight?.id ?? null
    })
    
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Error aggregating dashboard game hub data:', error)
    return NextResponse.json({ error: 'Failed to load game hub data' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
