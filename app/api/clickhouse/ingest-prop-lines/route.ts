/**
 * Ingest Historical NFL Prop Lines from The Odds API
 * POST /api/clickhouse/ingest-prop-lines
 * 
 * Query params:
 * - season: 2023 or 2024 (default: both)
 * - week: 1-18 (default: all)
 * - game_date: YYYY-MM-DD (specific date to process)
 */

import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export const maxDuration = 300 // 5 minutes

const ODDS_API_KEY = process.env.ODDS_API_KEY

// All available NFL player prop markets
const PROP_MARKETS = [
  // Passing
  'player_pass_yds',
  'player_pass_tds',
  'player_pass_attempts',
  'player_pass_completions',
  'player_pass_interceptions',
  'player_pass_longest_completion',
  
  // Rushing
  'player_rush_yds',
  'player_rush_tds',
  'player_rush_attempts',
  'player_rush_longest',
  
  // Receiving
  'player_reception_yds',
  'player_receptions',
  'player_reception_tds',
  'player_reception_longest',
  
  // Combo stats
  'player_pass_rush_yds',
  'player_rush_reception_yds',
  'player_rush_reception_tds',
  'player_pass_rush_reception_yds',
  'player_pass_rush_reception_tds',
  
  // Touchdowns
  'player_anytime_td',
  'player_1st_td',
  'player_last_td',
  
  // Defense
  'player_sacks',
  'player_tackles_assists',
  'player_solo_tackles',
  'player_defensive_interceptions',
  
  // Kicking
  'player_field_goals',
  'player_kicking_points',
  'player_pats',
]

interface PropLine {
  game_id: string
  espn_game_id: number
  player_name: string
  espn_player_id: number
  prop_type: string
  line: number
  over_odds: number
  under_odds: number
  bookmaker: string
  snapshot_time: string
  game_time: string
  season: number
  week: number
  home_team: string
  away_team: string
}

// Get NFL week number from date
function getNFLWeek(date: Date, season: number): number {
  const seasonStart = new Date(season, 8, 5) // Sept 5
  const diff = date.getTime() - seasonStart.getTime()
  const daysDiff = diff / (1000 * 60 * 60 * 24)
  return Math.max(1, Math.min(22, Math.floor(daysDiff / 7) + 1)) // Up to 22 for playoffs
}

// Get historical events for a date
async function getHistoricalEvents(date: string): Promise<any[]> {
  const url = `https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/events?apiKey=${ODDS_API_KEY}&date=${date}`
  
  const response = await fetch(url)
  if (!response.ok) {
    console.error(`Events API error: ${response.status}`)
    return []
  }
  
  const data = await response.json()
  console.log(`[Events] Remaining requests: ${response.headers.get('x-requests-remaining')}`)
  return data.data || []
}

// Get historical prop odds for a specific event
async function getHistoricalEventOdds(
  eventId: string, 
  date: string,
  markets: string[]
): Promise<any> {
  const marketsParam = markets.join(',')
  const url = `https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/events/${eventId}/odds?apiKey=${ODDS_API_KEY}&date=${date}&regions=us&markets=${marketsParam}&oddsFormat=american`
  
  const response = await fetch(url)
  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    console.error(`Odds API error: ${response.status}`)
    return null
  }
  
  console.log(`[Odds] Remaining requests: ${response.headers.get('x-requests-remaining')}`)
  return response.json()
}

// Parse prop outcomes - ONLY get the MAIN line (not alternates)
// The main line is typically the one with odds closest to -110/-110
function parseMainLine(outcomes: any[]): { line: number, over_odds: number, under_odds: number } | null {
  const lines: Map<number, { over_odds: number, under_odds: number }> = new Map()
  
  for (const outcome of outcomes) {
    const line = outcome.point
    if (line === undefined) continue
    
    if (!lines.has(line)) {
      lines.set(line, { over_odds: 0, under_odds: 0 })
    }
    
    const entry = lines.get(line)!
    if (outcome.name === 'Over') {
      entry.over_odds = outcome.price
    } else if (outcome.name === 'Under') {
      entry.under_odds = outcome.price
    }
  }
  
  if (lines.size === 0) return null
  
  // Find the main line - the one with odds closest to -110/-110 (most balanced)
  let mainLine: number | null = null
  let bestScore = Infinity
  
  for (const [line, odds] of lines) {
    // Score = how far from -110/-110 (lower is better)
    const overDiff = Math.abs(odds.over_odds - (-110))
    const underDiff = Math.abs(odds.under_odds - (-110))
    const score = overDiff + underDiff
    
    if (score < bestScore) {
      bestScore = score
      mainLine = line
    }
  }
  
  if (mainLine === null) return null
  
  const mainOdds = lines.get(mainLine)!
  return {
    line: mainLine,
    over_odds: mainOdds.over_odds,
    under_odds: mainOdds.under_odds
  }
}

// Process a single game's prop lines
async function processGameProps(
  event: any,
  season: number
): Promise<PropLine[]> {
  const propLines: PropLine[] = []
  
  // Get snapshot about 30 mins before game (closing lines)
  const gameTime = new Date(event.commence_time)
  const closingTime = new Date(gameTime.getTime() - 30 * 60 * 1000)
  const closingDate = closingTime.toISOString().replace('.000', '')
  
  // Fetch odds in batches (API recommends smaller batches)
  const BATCH_SIZE = 8
  for (let i = 0; i < PROP_MARKETS.length; i += BATCH_SIZE) {
    const marketBatch = PROP_MARKETS.slice(i, i + BATCH_SIZE)
    
    try {
      const oddsData = await getHistoricalEventOdds(event.id, closingDate, marketBatch)
      if (!oddsData || !oddsData.data) continue
      
      const eventData = oddsData.data
      const snapshotTime = oddsData.timestamp
      
      // Process each bookmaker
      for (const bookmaker of eventData.bookmakers || []) {
        // Process each market
        for (const market of bookmaker.markets || []) {
          // Group outcomes by player
          const playerOutcomes: Map<string, any[]> = new Map()
          
          for (const outcome of market.outcomes || []) {
            const playerName = outcome.description
            if (!playerName) continue
            
            if (!playerOutcomes.has(playerName)) {
              playerOutcomes.set(playerName, [])
            }
            playerOutcomes.get(playerName)!.push(outcome)
          }
          
          // Process each player - ONLY get main line (not alternates)
          for (const [playerName, outcomes] of playerOutcomes) {
            const mainLine = parseMainLine(outcomes)
            
            if (mainLine) {
              propLines.push({
                game_id: event.id,
                espn_game_id: 0,
                player_name: playerName,
                espn_player_id: 0,
                prop_type: market.key,
                line: mainLine.line,
                over_odds: mainLine.over_odds,
                under_odds: mainLine.under_odds,
                bookmaker: bookmaker.key,
                snapshot_time: snapshotTime,
                game_time: event.commence_time,
                season: season,
                week: getNFLWeek(gameTime, season),
                home_team: event.home_team,
                away_team: event.away_team
              })
            }
          }
        }
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 300))
      
    } catch (err) {
      console.error(`Error fetching odds for ${event.id}:`, err)
    }
  }
  
  return propLines
}

// Insert prop lines into ClickHouse
async function insertPropLines(lines: PropLine[]): Promise<void> {
  if (lines.length === 0) return
  
  const values = lines.map(l => `(
    '${l.game_id}',
    ${l.espn_game_id},
    '${l.player_name.replace(/'/g, "''")}',
    ${l.espn_player_id},
    '${l.prop_type}',
    ${l.line},
    ${l.over_odds},
    ${l.under_odds},
    '${l.bookmaker}',
    parseDateTimeBestEffort('${l.snapshot_time}'),
    parseDateTimeBestEffort('${l.game_time}'),
    ${l.season},
    ${l.week},
    '${l.home_team.replace(/'/g, "''")}',
    '${l.away_team.replace(/'/g, "''")}'
  )`).join(',\n')
  
  const sql = `
    INSERT INTO nfl_prop_lines (
      game_id, espn_game_id, player_name, espn_player_id,
      prop_type, line, over_odds, under_odds,
      bookmaker, snapshot_time, game_time, season, week,
      home_team, away_team
    ) VALUES ${values}
  `
  
  await clickhouseCommand(sql)
}

export async function POST(request: NextRequest) {
  if (!ODDS_API_KEY) {
    return NextResponse.json({ error: 'ODDS_API_KEY not configured' }, { status: 500 })
  }
  
  const { searchParams } = new URL(request.url)
  const gameDate = searchParams.get('game_date')
  const season = searchParams.get('season') ? parseInt(searchParams.get('season')!) : null
  
  if (!gameDate) {
    return NextResponse.json({ 
      error: 'game_date parameter required (YYYY-MM-DD format)',
      example: '/api/clickhouse/ingest-prop-lines?game_date=2024-09-08'
    }, { status: 400 })
  }
  
  try {
    const results: any[] = []
    
    // Parse date and determine season
    const date = new Date(gameDate)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const actualSeason = season || (month >= 9 ? year : year - 1)
    
    // Format date for API
    const dateStr = `${gameDate}T12:00:00Z`
    
    console.log(`Fetching events for ${gameDate} (season ${actualSeason})...`)
    
    // Get events for this date
    const events = await getHistoricalEvents(dateStr)
    console.log(`Found ${events.length} events`)
    
    let totalLines = 0
    
    for (const event of events) {
      console.log(`Processing: ${event.away_team} @ ${event.home_team}`)
      
      const lines = await processGameProps(event, actualSeason)
      
      if (lines.length > 0) {
        await insertPropLines(lines)
        totalLines += lines.length
        
        results.push({
          game: `${event.away_team} @ ${event.home_team}`,
          game_id: event.id,
          lines_count: lines.length,
          players: [...new Set(lines.map(l => l.player_name))].length
        })
      }
      
      // Rate limit between games
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    return NextResponse.json({
      success: true,
      date: gameDate,
      season: actualSeason,
      games_processed: events.length,
      total_lines_inserted: totalLines,
      results
    })
    
  } catch (error: any) {
    console.error('Ingestion error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    usage: {
      method: 'POST',
      params: {
        game_date: 'YYYY-MM-DD (required)',
        season: 'optional, defaults to calculated from date'
      },
      example: '/api/clickhouse/ingest-prop-lines?game_date=2024-09-08',
      note: 'Historical prop data available from May 3rd, 2023 onwards'
    },
    markets: PROP_MARKETS
  })
}

