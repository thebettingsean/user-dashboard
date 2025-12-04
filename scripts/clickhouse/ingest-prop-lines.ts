/**
 * Ingest Historical NFL Prop Lines from The Odds API
 * 
 * Fetches all prop lines (main + alternates) for NFL games
 * Data available from May 3rd, 2023 onwards
 * 
 * Usage: npx ts-node scripts/clickhouse/ingest-prop-lines.ts [--season 2023] [--week 1]
 */

import { clickhouseQuery } from '../../lib/clickhouse'

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

// Preferred bookmakers in order of preference
const PREFERRED_BOOKS = ['draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbet']

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
  // NFL season typically starts first Thursday after Labor Day
  // Approximate: Week 1 starts around Sept 5-11
  const seasonStart = new Date(season, 8, 5) // Sept 5
  const diff = date.getTime() - seasonStart.getTime()
  const daysDiff = diff / (1000 * 60 * 60 * 24)
  return Math.max(1, Math.min(18, Math.floor(daysDiff / 7) + 1))
}

// Get historical events for a date range
async function getHistoricalEvents(date: string): Promise<any[]> {
  const url = `https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/events?apiKey=${ODDS_API_KEY}&date=${date}`
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.status}`)
  }
  
  const data = await response.json()
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
      return null // No odds available for this event
    }
    throw new Error(`Failed to fetch odds: ${response.status}`)
  }
  
  return response.json()
}

// Parse prop outcomes into lines
function parseOutcomes(outcomes: any[], propType: string): { line: number, over_odds: number, under_odds: number }[] {
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
  
  return Array.from(lines.entries()).map(([line, odds]) => ({
    line,
    over_odds: odds.over_odds,
    under_odds: odds.under_odds
  }))
}

// Process a single game's prop lines
async function processGameProps(
  event: any,
  snapshotDate: string,
  season: number
): Promise<PropLine[]> {
  const propLines: PropLine[] = []
  
  // Get snapshot about 30 mins before game (closing lines)
  const gameTime = new Date(event.commence_time)
  const closingTime = new Date(gameTime.getTime() - 30 * 60 * 1000)
  const closingDate = closingTime.toISOString().replace('.000', '')
  
  // Fetch odds in batches (API has limits on markets per request)
  const BATCH_SIZE = 10
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
          
          // Process each player's lines
          for (const [playerName, outcomes] of playerOutcomes) {
            const lines = parseOutcomes(outcomes, market.key)
            
            for (const lineData of lines) {
              propLines.push({
                game_id: event.id,
                espn_game_id: 0, // Will match later
                player_name: playerName,
                espn_player_id: 0, // Will match later
                prop_type: market.key,
                line: lineData.line,
                over_odds: lineData.over_odds,
                under_odds: lineData.under_odds,
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
      
      // Rate limit - wait between batches
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (err) {
      console.error(`Error fetching odds for ${event.id}, markets ${marketBatch.join(',')}:`, err)
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
    '${l.snapshot_time}',
    '${l.game_time}',
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
  
  await clickhouseQuery(sql)
}

// Get games for a specific week
async function getGamesForWeek(season: number, week: number): Promise<any[]> {
  // Calculate approximate date range for the week
  const seasonStart = new Date(season, 8, 5) // Sept 5
  const weekStart = new Date(seasonStart.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000)
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  // Get events for each day of the week
  const events: any[] = []
  const seenIds = new Set<string>()
  
  for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('.')[0] + 'Z'
    
    try {
      const dayEvents = await getHistoricalEvents(dateStr)
      for (const event of dayEvents) {
        if (!seenIds.has(event.id)) {
          seenIds.add(event.id)
          events.push(event)
        }
      }
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (err) {
      console.error(`Error fetching events for ${dateStr}:`, err)
    }
  }
  
  return events
}

// Main ingestion function
async function ingestPropLines(season?: number, week?: number) {
  if (!ODDS_API_KEY) {
    throw new Error('ODDS_API_KEY environment variable not set')
  }
  
  console.log('🏈 NFL Prop Lines Ingestion')
  console.log('=' .repeat(50))
  
  // Determine seasons to process
  // Props available from May 2023, so 2023 and 2024 seasons
  const seasons = season ? [season] : [2023, 2024]
  
  for (const szn of seasons) {
    console.log(`\n📅 Processing ${szn} season...`)
    
    const weeks = week ? [week] : Array.from({ length: 18 }, (_, i) => i + 1)
    
    for (const wk of weeks) {
      console.log(`\n  Week ${wk}:`)
      
      // Get games for this week
      const games = await getGamesForWeek(szn, wk)
      console.log(`    Found ${games.length} games`)
      
      let totalLines = 0
      
      for (const game of games) {
        console.log(`    Processing: ${game.away_team} @ ${game.home_team}`)
        
        try {
          const lines = await processGameProps(game, game.commence_time, szn)
          if (lines.length > 0) {
            await insertPropLines(lines)
            totalLines += lines.length
            console.log(`      ✅ ${lines.length} prop lines`)
          } else {
            console.log(`      ⚠️ No prop lines found`)
          }
        } catch (err) {
          console.error(`      ❌ Error:`, err)
        }
        
        // Rate limit between games
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      console.log(`    Total lines for week: ${totalLines}`)
    }
  }
  
  // Final count
  const count = await clickhouseQuery('SELECT count() as cnt FROM nfl_prop_lines')
  console.log(`\n🎉 Done! Total prop lines in database: ${count[0]?.cnt || 0}`)
}

// Parse command line args
const args = process.argv.slice(2)
let season: number | undefined
let week: number | undefined

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--season' && args[i + 1]) {
    season = parseInt(args[i + 1])
  }
  if (args[i] === '--week' && args[i + 1]) {
    week = parseInt(args[i + 1])
  }
}

ingestPropLines(season, week)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })

