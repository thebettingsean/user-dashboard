/**
 * Fetch missing props from Odds API for games missing props
 * Fetches ALL props for dates with missing games, inserts with espn_game_id = 0
 * Then we can match them afterward
 */

import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        value = value.replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    }
  })
}

const ODDS_API_KEY = process.env.ODDS_API_KEY

const PROP_MARKETS = [
  'player_points',
  'player_rebounds',
  'player_assists',
  'player_threes',
  'player_steals',
  'player_blocks',
  'player_turnovers',
]

const BOOKMAKER_PRIORITY = [
  'fanduel', 'draftkings', 'betmgm', 'williamhill_us', 'betrivers',
  'fanatics', 'bovada', 'pointsbetus', 'barstool', 'betonlineag', 'unibet_us'
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

// Get unique dates with missing games
async function getMissingGameDates(): Promise<string[]> {
  const { clickhouseQuery } = await import('../lib/clickhouse')
  
  const result = await clickhouseQuery(`
    SELECT DISTINCT toDate(game_time) as game_date
    FROM nba_games
    WHERE season IN (2025, 2026)
      AND (home_score > 0 OR away_score > 0)
      AND NOT EXISTS (
        SELECT 1 
        FROM nba_prop_lines p 
        WHERE toString(nba_games.espn_game_id) = toString(p.espn_game_id) 
          AND p.espn_game_id > 0
      )
    ORDER BY game_date
  `)
  
  return result.data.map((row: any) => row.game_date)
}

// Get historical events for a date range (±1 day to catch timezone crossovers)
async function getHistoricalEventsForDateRange(gameDate: string): Promise<any[]> {
  const dates = [
    new Date(new Date(gameDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // -1 day
    gameDate,
    new Date(new Date(gameDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +1 day
  ]
  
  const allEvents: any[] = []
  
  for (const date of dates) {
    const url = `https://api.the-odds-api.com/v4/historical/sports/basketball_nba/events?apiKey=${ODDS_API_KEY}&date=${date}T12:00:00Z`
    
    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.log(`  ⚠️  No events for ${date} (${response.status})`)
        continue
      }
      
      const data = await response.json()
      const events = data.data || []
      
      // Filter to events within ±2 days of game date
      const gameDateTime = new Date(gameDate).getTime()
      const filtered = events.filter((event: any) => {
        const eventTime = new Date(event.commence_time).getTime()
        const diffDays = Math.abs(eventTime - gameDateTime) / (1000 * 60 * 60 * 24)
        return diffDays <= 2
      })
      
      allEvents.push(...filtered)
      await new Promise(resolve => setTimeout(resolve, 300)) // Rate limit
    } catch (err) {
      console.error(`  ❌ Error fetching ${date}:`, err)
    }
  }
  
  return allEvents
}

// Parse main line (same as worker)
function parseMainLine(outcomes: any[]): { line: number, over_odds: number, under_odds: number } | null {
  const lines: Map<number, { over_odds: number, under_odds: number }> = new Map()
  
  for (const outcome of outcomes) {
    const line = outcome.point
    if (line === undefined) continue
    
    if (!lines.has(line)) {
      lines.set(line, { over_odds: 0, under_odds: 0 })
    }
    
    const entry = lines.get(line)!
    if (outcome.name === 'Over') entry.over_odds = outcome.price
    else if (outcome.name === 'Under') entry.under_odds = outcome.price
  }
  
  if (lines.size === 0) return null
  
  let mainLine: number | null = null
  let bestScore = Infinity
  
  for (const [line, odds] of lines) {
    const score = Math.abs(odds.over_odds - (-110)) + Math.abs(odds.under_odds - (-110))
    if (score < bestScore) {
      bestScore = score
      mainLine = line
    }
  }
  
  if (mainLine === null) return null
  const mainOdds = lines.get(mainLine)!
  return { line: mainLine, over_odds: mainOdds.over_odds, under_odds: mainOdds.under_odds }
}

// Get historical prop odds for an event
async function getHistoricalEventOdds(eventId: string, date: string, markets: string[]): Promise<any> {
  const marketsParam = markets.join(',')
  const url = `https://api.the-odds-api.com/v4/historical/sports/basketball_nba/events/${eventId}/odds?apiKey=${ODDS_API_KEY}&date=${date}&regions=us&markets=${marketsParam}&oddsFormat=american`
  
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    
    return response.json()
  } catch (err) {
    return null
  }
}

// Process props for an event
async function processEventProps(event: any, season: number): Promise<PropLine[]> {
  const propLines: PropLine[] = []
  
  const gameTime = new Date(event.commence_time)
  const closingTime = new Date(gameTime.getTime() - 30 * 60 * 1000)
  const closingDate = closingTime.toISOString().replace('.000', '')
  
  const BATCH_SIZE = 8
  for (let i = 0; i < PROP_MARKETS.length; i += BATCH_SIZE) {
    const marketBatch = PROP_MARKETS.slice(i, i + BATCH_SIZE)
    
    try {
      const oddsData = await getHistoricalEventOdds(event.id, closingDate, marketBatch)
      if (!oddsData || !oddsData.data) continue
      
      const eventData = oddsData.data
      const snapshotTime = oddsData.timestamp
      
      // Filter to priority bookmakers only
      const bookmakers = (eventData.bookmakers || [])
        .filter((bm: any) => BOOKMAKER_PRIORITY.includes(bm.key?.toLowerCase()))
        .sort((a: any, b: any) => {
          const aIdx = BOOKMAKER_PRIORITY.indexOf(a.key?.toLowerCase() || '')
          const bIdx = BOOKMAKER_PRIORITY.indexOf(b.key?.toLowerCase() || '')
          return aIdx - bIdx
        })
      
      // Only use first bookmaker (highest priority)
      if (bookmakers.length === 0) continue
      const bookmaker = bookmakers[0]
      
      for (const market of bookmaker.markets || []) {
        const playerOutcomes: Map<string, any[]> = new Map()
        
        for (const outcome of market.outcomes || []) {
          const playerName = outcome.description
          if (!playerName) continue
          
          if (!playerOutcomes.has(playerName)) {
            playerOutcomes.set(playerName, [])
          }
          playerOutcomes.get(playerName)!.push(outcome)
        }
        
        for (const [playerName, outcomes] of playerOutcomes) {
          const mainLine = parseMainLine(outcomes)
          
          if (mainLine) {
            propLines.push({
              game_id: event.id,
              espn_game_id: 0, // Will match later
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
              week: 0,
              home_team: event.home_team,
              away_team: event.away_team
            })
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (err) {
      console.error(`    ❌ Error processing event ${event.id}:`, err)
    }
  }
  
  return propLines
}

// Insert prop lines
async function insertPropLines(lines: PropLine[]): Promise<void> {
  if (lines.length === 0) return
  
  const { clickhouseCommand } = await import('../lib/clickhouse')
  
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
    INSERT INTO nba_prop_lines (
      game_id, espn_game_id, player_name, espn_player_id,
      prop_type, line, over_odds, under_odds,
      bookmaker, snapshot_time, game_time, season, week,
      home_team, away_team
    ) VALUES ${values}
  `
  
  await clickhouseCommand(sql)
}

async function main() {
  if (!ODDS_API_KEY) {
    console.error('❌ ODDS_API_KEY not set')
    process.exit(1)
  }

  console.log('=== Fetching Missing Props from Odds API ===\n')

  const { clickhouseQuery } = await import('../lib/clickhouse')
  
  // Get unique dates with missing games
  console.log('📅 Getting dates with missing games...')
  const dates = await getMissingGameDates()
  console.log(`  Found ${dates.length} unique dates with missing games\n`)

  let totalEvents = 0
  let totalProps = 0
  let datesProcessed = 0

  for (const gameDate of dates) {
    datesProcessed++
    console.log(`[${datesProcessed}/${dates.length}] Processing ${gameDate}...`)
    
    // Get season for this date
    const seasonResult = await clickhouseQuery(`
      SELECT DISTINCT season
      FROM nba_games
      WHERE toDate(game_time) = '${gameDate}'
        AND season IN (2025, 2026)
      LIMIT 1
    `)
    
    const season = seasonResult.data[0]?.season || 2025
    
    // Fetch events for this date (±1 day)
    const events = await getHistoricalEventsForDateRange(gameDate)
    console.log(`  Found ${events.length} Odds API events`)
    
    if (events.length === 0) {
      console.log(`  ⚠️  No events found for ${gameDate}`)
      continue
    }

    totalEvents += events.length

    // Process props for each event
    for (const event of events) {
      const props = await processEventProps(event, season)
      
      if (props.length > 0) {
        // Check if we already have props for this event
        const existing = await clickhouseQuery(`
          SELECT count() as cnt
          FROM nba_prop_lines
          WHERE game_id = '${event.id}'
        `)
        
        if (existing.data[0]?.cnt === 0) {
          await insertPropLines(props)
          totalProps += props.length
          console.log(`    ✅ Event ${event.id}: ${props.length} props (${event.away_team} @ ${event.home_team})`)
        } else {
          console.log(`    ⏭️  Event ${event.id}: Already have ${existing.data[0]?.cnt} props, skipping`)
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 300)) // Rate limit
    }
    
    console.log()
    
    // Rate limit between dates
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\n✅ Fetch complete!')
  console.log(`  Dates processed: ${datesProcessed}`)
  console.log(`  Events found: ${totalEvents}`)
  console.log(`  Props inserted: ${totalProps}`)
  console.log('\n💡 Next step: Run match-unmatched-props.ts to match these props to ESPN games')
}

main().catch(console.error)

