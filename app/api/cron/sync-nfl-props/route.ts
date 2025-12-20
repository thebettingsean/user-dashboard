/**
 * Sync NFL Player Props (Upcoming Games)
 * 
 * Fetches upcoming game props from Odds API and inserts into nfl_prop_lines
 * with CORRECT player names (not corrupted like the old lifecycle cron)
 */

import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export const maxDuration = 300

const ODDS_API_KEY = process.env.ODDS_API_KEY

const BOOKMAKER_PRIORITY: Record<string, number> = {
  'fanduel': 1, 'draftkings': 2, 'betmgm': 3, 'williamhill_us': 4,
  'betrivers': 5, 'fanatics': 6, 'bovada': 7, 'pointsbetus': 8,
  'barstool': 9, 'betonlineag': 10, 'unibet_us': 11,
}

const PROP_MARKETS = [
  'player_pass_yds', 'player_pass_tds', 'player_pass_attempts', 
  'player_pass_completions', 'player_pass_interceptions',
  'player_rush_yds', 'player_rush_tds', 'player_rush_attempts',
  'player_reception_yds', 'player_receptions', 'player_reception_tds',
  'player_pass_rush_yds', 'player_rush_reception_yds',
]

interface PropLine {
  game_id: string
  player_name: string
  prop_type: string
  line: number
  over_odds: number
  under_odds: number
  bookmaker: string
  game_time: string
  home_team: string
  away_team: string
}

async function fetchUpcomingProps(): Promise<{ props: PropLine[]; games_processed: number }> {
  if (!ODDS_API_KEY) throw new Error('ODDS_API_KEY not configured')
  
  // Get upcoming NFL events (next 7 days)
  const eventsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events?apiKey=${ODDS_API_KEY}`
  const eventsRes = await fetch(eventsUrl)
  if (!eventsRes.ok) throw new Error('Failed to fetch events')
  
  const events = await eventsRes.json()
  const now = new Date()
  
  // Filter to games in next 7 days
  const upcomingGames = events.filter((e: any) => {
    const gameTime = new Date(e.commence_time)
    const hoursUntil = (gameTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntil > 0 && hoursUntil < 168 // 0-7 days
  })
  
  console.log(`[SYNC-NFL-PROPS] Found ${upcomingGames.length} upcoming games`)
  
  const allProps: PropLine[] = []
  
  for (const event of upcomingGames.slice(0, 10)) { // Limit per run to avoid timeout
    try {
      const marketsParam = PROP_MARKETS.join(',')
      const oddsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/${event.id}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=${marketsParam}&oddsFormat=american`
      
      const oddsRes = await fetch(oddsUrl)
      if (!oddsRes.ok) {
        console.log(`[SYNC-NFL-PROPS] No odds for ${event.id}`)
        continue
      }
      
      const oddsData = await oddsRes.json()
      const props = extractPropsFromOddsData(oddsData, event)
      
      console.log(`[SYNC-NFL-PROPS] ${event.away_team} @ ${event.home_team}: ${props.length} props`)
      allProps.push(...props)
      
      await new Promise(r => setTimeout(r, 300)) // Rate limit
    } catch (e) {
      console.error(`[SYNC-NFL-PROPS] Error processing ${event.id}:`, e)
    }
  }
  
  return { props: allProps, games_processed: Math.min(upcomingGames.length, 10) }
}

function extractPropsFromOddsData(oddsData: any, event: any): PropLine[] {
  const props: PropLine[] = []
  const bestProps: Map<string, any> = new Map()
  
  for (const bookmaker of oddsData.bookmakers || []) {
    const priority = BOOKMAKER_PRIORITY[bookmaker.key] || 99
    
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
      
      // Get best line for each player
      for (const [playerName, outcomes] of playerOutcomes) {
        const overOutcome = outcomes.find(o => o.name === 'Over' && o.point !== undefined)
        const underOutcome = outcomes.find(o => o.name === 'Under' && o.point !== undefined)
        
        if (!overOutcome) continue
        
        const key = `${event.id}_${playerName}_${market.key}`
        const existing = bestProps.get(key)
        
        if (!existing || priority < existing.priority) {
          bestProps.set(key, {
            game_id: event.id,
            player_name: playerName, // ✅ CORRECT: Use player name directly!
            prop_type: market.key,
            line: overOutcome.point,
            over_odds: overOutcome.price,
            under_odds: underOutcome?.price || 0,
            bookmaker: bookmaker.key,
            game_time: event.commence_time,
            home_team: event.home_team,
            away_team: event.away_team,
            priority
          })
        }
      }
    }
  }
  
  return Array.from(bestProps.values())
}

async function upsertProps(props: PropLine[]): Promise<{ inserted: number; updated: number }> {
  if (props.length === 0) return { inserted: 0, updated: 0 }
  
  let inserted = 0
  let updated = 0
  
  // Determine season/week for each game
  const gameTimeMap = new Map(props.map(p => [p.game_id, p.game_time]))
  
  for (const prop of props) {
    const gameTime = new Date(prop.game_time)
    const year = gameTime.getFullYear()
    const month = gameTime.getMonth() + 1
    const season = month >= 9 ? year : year - 1
    
    // Check if prop already exists
    const existing = await clickhouseQuery(`
      SELECT count(*) as cnt 
      FROM nfl_prop_lines 
      WHERE game_id = '${prop.game_id}' 
        AND player_name = '${prop.player_name.replace(/'/g, "''")}'
        AND prop_type = '${prop.prop_type}'
      LIMIT 1
    `)
    
    if (existing.data[0]?.cnt > 0) {
      // Update existing
      await clickhouseCommand(`
        ALTER TABLE nfl_prop_lines UPDATE
          line = ${prop.line},
          over_odds = ${prop.over_odds},
          under_odds = ${prop.under_odds},
          bookmaker = '${prop.bookmaker}',
          snapshot_time = now()
        WHERE game_id = '${prop.game_id}'
          AND player_name = '${prop.player_name.replace(/'/g, "''")}'
          AND prop_type = '${prop.prop_type}'
      `)
      updated++
    } else {
      // Insert new
      await clickhouseCommand(`
        INSERT INTO nfl_prop_lines (
          game_id, espn_game_id, player_name, espn_player_id,
          prop_type, line, over_odds, under_odds,
          bookmaker, snapshot_time, game_time, season, week,
          home_team, away_team
        ) VALUES (
          '${prop.game_id}', 0, 
          '${prop.player_name.replace(/'/g, "''")}', 0,
          '${prop.prop_type}', ${prop.line}, ${prop.over_odds}, ${prop.under_odds},
          '${prop.bookmaker}', now(), '${prop.game_time}', ${season}, 0,
          '${prop.home_team.replace(/'/g, "''")}', '${prop.away_team.replace(/'/g, "''")}'
        )
      `)
      inserted++
    }
  }
  
  return { inserted, updated }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('[SYNC-NFL-PROPS] Starting prop sync...')
    
    const { props, games_processed } = await fetchUpcomingProps()
    const { inserted, updated } = await upsertProps(props)
    
    console.log(`[SYNC-NFL-PROPS] ✅ Complete: ${inserted} inserted, ${updated} updated`)
    
    return NextResponse.json({
      success: true,
      elapsed_ms: Date.now() - startTime,
      games_processed,
      props_inserted: inserted,
      props_updated: updated,
      total_props: props.length
    })
    
  } catch (error: any) {
    console.error('[SYNC-NFL-PROPS] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}

