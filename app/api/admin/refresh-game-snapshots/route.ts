import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  fetchGames,
  fetchPublicMoney,
  fetchRefereeStats,
  fetchPlayerProps,
  fetchGameDetails,
  type League
} from '@/lib/api/sportsData'
import { mapScheduleFromTrendline } from '@/lib/snapshots/normalize'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co'
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'

const SNAPSHOTS_SUPABASE_URL = process.env.SNAPSHOTS_SUPABASE_URL || 'https://knccqavkxvezhdfoktay.supabase.co'
const SNAPSHOTS_SUPABASE_SERVICE_KEY =
  process.env.SNAPSHOTS_SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY2NxYXZreHZlemhkZm9rdGF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1ODkwNywiZXhwIjoyMDY3OTM0OTA3fQ.JjGpZGVnZsN7P2lldSrtByx8Y9cqJjzTj3mYm8fj29M'

const primarySupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const snapshotsClient = createClient(SNAPSHOTS_SUPABASE_URL, SNAPSHOTS_SUPABASE_SERVICE_KEY)

const SUPPORTED_SPORTS = ['nfl', 'nba'] as const

function getDateRangeForSport(sport: League) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  if (sport === 'nfl') {
    end.setDate(end.getDate() + 7)
  } else {
    end.setDate(end.getDate() + 2)
  }

  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0]
  }
}

async function loadScriptMeta(gameIds: string[], sport: League) {
  const meta = new Map<string, { strength_label: string | null; strength_value: number | null; credits_required: number | null; generated_at: string | null }>()

  if (gameIds.length === 0) return meta

  const { data, error } = await primarySupabase
    .from('game_scripts')
    .select('game_id, sport, data_strength, generated_at')
    .in('game_id', gameIds)
    .eq('sport', sport.toUpperCase())
    .order('generated_at', { ascending: false })

  if (error) {
    console.error('[snapshot-refresh] Failed to load script meta', error)
    return meta
  }

  for (const row of data || []) {
    if (meta.has(row.game_id)) continue

    const strength = row.data_strength ?? null
    let strengthLabel: string | null = null
    switch (strength) {
      case 3:
        strengthLabel = 'Strong'
        break
      case 2:
        strengthLabel = 'Above Avg'
        break
      case 1:
        strengthLabel = 'Minimal'
        break
      default:
        strengthLabel = null
    }

    meta.set(row.game_id, {
      strength_label: strengthLabel,
      strength_value: strength,
      credits_required: strength,
      generated_at: row.generated_at ?? null
    })
  }

  return meta
}

async function loadPickMeta(gameIds: string[], sport: League) {
  const meta = new Map<string, { pending_count: number }>()

  if (gameIds.length === 0) return meta

  const { data, error } = await primarySupabase
    .from('picks')
    .select('game_id')
    .in('game_id', gameIds)
    .eq('sport', sport.toUpperCase())
    .eq('result', 'pending')

  if (error) {
    console.error('[snapshot-refresh] Failed to load pick meta', error)
    return meta
  }

  for (const row of data || []) {
    meta.set(row.game_id, {
      pending_count: (meta.get(row.game_id)?.pending_count || 0) + 1
    })
  }

  return meta
}

function sanitizePublicMoney(publicMoney: any, game: any) {
  if (!publicMoney) return null

  const sanitized: any = {
    public_money_ml_away_bets_pct: publicMoney.public_money_ml_away_bets_pct,
    public_money_ml_away_stake_pct: publicMoney.public_money_ml_away_stake_pct,
    public_money_ml_home_bets_pct: publicMoney.public_money_ml_home_bets_pct,
    public_money_ml_home_stake_pct: publicMoney.public_money_ml_home_stake_pct,
    public_money_spread_away_bets_pct: publicMoney.public_money_spread_away_bets_pct,
    public_money_spread_away_stake_pct: publicMoney.public_money_spread_away_stake_pct,
    public_money_spread_home_bets_pct: publicMoney.public_money_spread_home_bets_pct,
    public_money_spread_home_stake_pct: publicMoney.public_money_spread_home_stake_pct,
    public_money_over_bets_pct: publicMoney.public_money_over_bets_pct,
    public_money_over_stake_pct: publicMoney.public_money_over_stake_pct,
    public_money_under_bets_pct: publicMoney.public_money_under_bets_pct,
    public_money_under_stake_pct: publicMoney.public_money_under_stake_pct,
    sharp_money_stats: Array.isArray(publicMoney.sharp_money_stats)
      ? publicMoney.sharp_money_stats.slice(0, 5)
      : [],
    rlm_stats: Array.isArray(publicMoney.rlm_stats)
      ? publicMoney.rlm_stats.slice(0, 5)
      : []
  }

  if (Array.isArray(publicMoney.pregame_odds) && publicMoney.pregame_odds.length > 0) {
    const recent = publicMoney.pregame_odds.slice(-3).map((entry: any) => ({
      bettingId: entry.bettingId,
      away_team_ml: entry.away_team_ml,
      home_team_ml: entry.home_team_ml,
      game_ou: entry.game_ou,
      game_over_odds: entry.game_over_odds,
      game_under_odds: entry.game_under_odds,
      home_team_point_spread: entry.home_team_point_spread,
      away_team_point_spread: entry.away_team_point_spread,
      public_money_ml_away_bets_pct: entry.public_money_ml_away_bets_pct,
      public_money_ml_home_bets_pct: entry.public_money_ml_home_bets_pct,
      public_money_spread_away_bets_pct: entry.public_money_spread_away_bets_pct,
      public_money_spread_home_bets_pct: entry.public_money_spread_home_bets_pct,
      public_money_over_bets_pct: entry.public_money_over_bets_pct,
      public_money_under_bets_pct: entry.public_money_under_bets_pct,
      updated_at: entry.updated_at
    }))
    sanitized.pregame_odds = recent
  }

  if (game?.odds) {
    sanitized.away_team_ml = game.odds.away_team_odds?.moneyline ?? null
    sanitized.home_team_ml = game.odds.home_team_odds?.moneyline ?? null
    sanitized.away_team_point_spread = game.odds.away_team_odds?.current_point_spread ?? null
    sanitized.home_team_point_spread = game.odds.home_team_odds?.current_point_spread ?? null
  }

  return sanitized
}

function sanitizeTeamStats(details: any) {
  if (!details) return null

  return {
    h2h_3year: details.h2h_3year ?? null
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sportParam = (searchParams.get('sport') || 'nfl').toLowerCase()

  if (!SUPPORTED_SPORTS.includes(sportParam as (typeof SUPPORTED_SPORTS)[number])) {
    return NextResponse.json({ error: 'Unsupported sport.' }, { status: 400 })
  }

  const sport = sportParam as League
  const { from, to } = getDateRangeForSport(sport)

  try {
    const games = await fetchGames(sport, from, to)

    if (!games || games.length === 0) {
      return NextResponse.json({ ok: true, count: 0, notice: 'No games returned from Trendline.' })
    }

    const gameIds = games.map((g) => g.game_id)

    const [scriptMeta, pickMeta] = await Promise.all([
      loadScriptMeta(gameIds, sport),
      loadPickMeta(gameIds, sport)
    ])

    const payloads = await Promise.all(
      games.map(async (game) => {
        const schedule = mapScheduleFromTrendline(game, sport.toUpperCase())

        const [publicMoneyRaw, refereeStats, playerProps, gameDetails] = await Promise.all([
          fetchPublicMoney(sport, game.game_id).catch((error) => {
            console.warn('[snapshot-refresh] public money failed', game.game_id, error)
            return null
          }),
          game.referee_id
            ? fetchRefereeStats(sport, game.game_id).catch((error) => {
                console.warn('[snapshot-refresh] referee stats failed', game.game_id, error)
                return null
              })
            : Promise.resolve(null),
          fetchPlayerProps(sport, game.game_id).catch((error) => {
            console.warn('[snapshot-refresh] player props failed', game.game_id, error)
            return []
          }),
          fetchGameDetails(sport, game.game_id).catch((error) => {
            console.warn('[snapshot-refresh] game details failed', game.game_id, error)
            return null
          })
        ])

        const publicMoney = sanitizePublicMoney(publicMoneyRaw, game)
        const teamStats = sanitizeTeamStats(gameDetails)

        console.log('[snapshot-refresh] payload summary', {
          gameId: game.game_id,
          publicMoneyPresent: !!publicMoney,
          teamStatsPresent: !!teamStats,
          propsCount: Array.isArray(playerProps) ? playerProps.length : 0
        })

        const spread = game.odds
          ? {
              current: (game.odds as any).spread ?? null,
              home_line: (game.odds.home_team_odds as any)?.current_point_spread ?? null,
              home_odds: (game.odds.home_team_odds as any)?.spread_odds ?? null,
              away_line: (game.odds.away_team_odds as any)?.current_point_spread ?? null,
              away_odds: (game.odds.away_team_odds as any)?.spread_odds ?? null
            }
          : null

        const totals = game.odds
          ? {
              number: (game.odds as any).over_under ?? null,
              over_odds: (game.odds as any).over_odds ?? null,
              under_odds: (game.odds as any).under_odds ?? null
            }
          : null

        const moneyline = game.odds
          ? {
              home: (game.odds.home_team_odds as any)?.moneyline ?? null,
              away: (game.odds.away_team_odds as any)?.moneyline ?? null
            }
          : null

        return {
          game_id: schedule.gameId,
          sport: schedule.sport,
          season: (game as any).season ?? null,
          week: (game as any).week ?? null,
          status: schedule.status,
          start_time_utc: schedule.startTimeUtc,
          start_time_label: schedule.startTimeLabel,
          home_team: schedule.homeTeam,
          away_team: schedule.awayTeam,
          venue: schedule.venue ?? null,
          spread,
          moneyline,
          totals,
          public_money: publicMoney,
          referee: refereeStats,
          team_stats: teamStats,
          props: playerProps && playerProps.length > 0 ? playerProps : null,
          script_meta: scriptMeta.get(game.game_id) ?? null,
          picks_meta: pickMeta.get(game.game_id) ?? { pending_count: 0 },
          raw_payload: game,
          updated_at: new Date().toISOString()
        }
      })
    )

    const { error } = await snapshotsClient
      .from('game_snapshots')
      .upsert(payloads, { onConflict: 'sport,game_id' })

    if (error) {
      console.error('[snapshot-refresh] Upsert failed', { error, payloadExample: payloads[0] })
      return NextResponse.json({ error: 'Failed to write snapshots' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: payloads.length })
  } catch (error) {
    console.error('[snapshot-refresh] Unexpected error', error)
    return NextResponse.json({ error: 'Unexpected error refreshing snapshots' }, { status: 500 })
  }
}
