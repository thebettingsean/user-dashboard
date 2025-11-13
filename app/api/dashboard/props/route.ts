import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SNAPSHOTS_SUPABASE_URL = process.env.SNAPSHOTS_SUPABASE_URL || 'https://knccqavkxvezhdfoktay.supabase.co'
const SNAPSHOTS_SUPABASE_SERVICE_KEY =
  process.env.SNAPSHOTS_SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY2NxYXZreHZlemhkZm9rdGF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1ODkwNywiZXhwIjoyMDY3OTM0OTA3fQ.JjGpZGVnZsN7P2lldSrtByx8Y9cqJjzTj3mYm8fj29M'

const snapshotsClient = createClient(SNAPSHOTS_SUPABASE_URL, SNAPSHOTS_SUPABASE_SERVICE_KEY)

const SUPPORTED_SPORTS = ['nfl', 'nba'] as const

type SupportedSport = (typeof SUPPORTED_SPORTS)[number]

type DashboardProp = {
  gameId: string
  matchup: string
  kickoff: string
  kickoffLabel: string
  props: Array<{
    id: string
    playerName: string
    team: string | null
    betTitle: string
    line: string
    hitRate: number | null
    record: string | null
  }>
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isNaN(value) ? null : value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function formatRecord(player: any) {
  const wins = toNumber(player?.record?.hit)
  const losses = toNumber(player?.record?.miss)
  if (wins === null && losses === null) return null
  return `${wins ?? 0}-${losses ?? 0}`
}

function computeHitRate(player: any) {
  const wins = toNumber(player?.record?.hit)
  const total = toNumber(player?.record?.total)
  if (wins === null || total === null || total === 0) return null
  return (wins / total) * 100
}

function resolveTeamName(player: any): string | null {
  const candidates = [
    player?.team_name,
    player?.team,
    player?.team_display,
    player?.team_abbreviation,
    player?.team_id,
    player?.team_slug
  ]

  const found = candidates.find((value) => typeof value === 'string' && value.trim().length > 0)
  return found ? String(found).trim() : null
}

function formatPropLine(player: any, category: any): string {
  const line = player?.best_line?.opening_line ?? player?.line ?? player?.target
  const propType = (player?.prop_type ?? player?.direction ?? category?.direction ?? '').toLowerCase()
  
  if (line !== undefined && line !== null) {
    const lineNum = toNumber(line)
    if (lineNum !== null) {
      if (propType === 'over' || propType === 'o') return `O ${lineNum}`
      if (propType === 'under' || propType === 'u') return `U ${lineNum}`
      return `${lineNum}`
    }
  }
  
  return '—'
}

function isDefensiveProp(category: any, player: any): boolean {
  const title = (category?.title ?? player?.bet_name ?? '').toLowerCase()
  const keywords = ['sack', 'tackle', 'interception', 'deflection', 'defense', 'defensive']
  return keywords.some((keyword) => title.includes(keyword))
}

function isDoubleDoubleProp(category: any, player: any): boolean {
  const title = (category?.title ?? player?.bet_name ?? '').toLowerCase()
  return title.includes('double double') || title.includes('double-double')
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sportParam = (searchParams.get('sport') || 'nfl').toLowerCase()

    if (!SUPPORTED_SPORTS.includes(sportParam as SupportedSport)) {
      return NextResponse.json({ error: 'Unsupported sport' }, { status: 400 })
    }

    const sport = sportParam.toUpperCase()

    const { data, error } = await snapshotsClient
      .from('game_snapshots')
      .select('game_id, sport, away_team, home_team, start_time_utc, start_time_label, props')
      .eq('sport', sport)
      .gte('start_time_utc', new Date().toISOString())
      .order('start_time_utc', { ascending: true })

    if (error) {
      console.error('Failed to load props snapshots:', error)
      return NextResponse.json({ error: 'Failed to load props' }, { status: 500 })
    }

    const response: DashboardProp[] = (data || []).map((row) => {
      const categories = Array.isArray(row.props) ? row.props : []
      const players = categories.flatMap((category: any) => {
        if (!category || !Array.isArray(category.players)) return []
        return category.players
          .filter((player: any) => !isDefensiveProp(category, player) && !isDoubleDoubleProp(category, player))
          .map((player: any) => ({ player, category }))
      })

      const allProps = players
        .map(({ player, category }) => {
          const hitRate = computeHitRate(player)
          const wins = toNumber(player?.record?.hit)
          const losses = toNumber(player?.record?.miss)
          const total = toNumber(player?.record?.total)
          
          return {
            id: `${row.game_id}-${player.player_id ?? player.player_name}`,
            playerName: player.player_name || 'Player',
            team: resolveTeamName(player),
            betTitle: category?.title || player.bet_name || 'Prop',
            line: formatPropLine(player, category),
            hitRate,
            wins,
            losses,
            total,
            record: formatRecord(player)
          }
        })
        // Filter out props with no valid hitRate
        .filter(prop => prop.hitRate !== null && prop.hitRate > 0)
        .sort((a, b) => {
          // Primary: sort by hitRate descending
          const rateA = a.hitRate ?? -Infinity
          const rateB = b.hitRate ?? -Infinity
          if (rateB !== rateA) return rateB - rateA
          
          // Secondary: sort by total games (more data = more reliable)
          const totalA = a.total ?? 0
          const totalB = b.total ?? 0
          return totalB - totalA
        })
      
      const topThree = allProps.slice(0, 3)

      return {
        gameId: row.game_id,
        matchup: `${row.away_team} @ ${row.home_team}`,
        kickoff: row.start_time_utc,
        kickoffLabel: row.start_time_label,
        props: topThree
      }
    })

    const jsonResponse = NextResponse.json({ sport, props: response })
    
    jsonResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    jsonResponse.headers.set('Pragma', 'no-cache')
    jsonResponse.headers.set('Expires', '0')
    
    return jsonResponse
  } catch (error) {
    console.error('Unexpected error fetching props:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
