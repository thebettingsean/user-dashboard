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
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
      }
    }
  })
}

const ODDS_API_KEY = process.env.ODDS_API_KEY

async function getOddsEvents(date: string): Promise<any[]> {
  const url = `https://api.the-odds-api.com/v4/historical/sports/basketball_nba/events?apiKey=${ODDS_API_KEY}&date=${date}T12:00:00Z`
  const res = await fetch(url)
  const data = await res.json()
  return data.data || []
}

async function main() {
  const { clickhouseQuery } = await import('../lib/clickhouse')
  
  // Get all games for Nov 29 from our DB
  const dbGames = await clickhouseQuery(`
    SELECT 
      g.game_id,
      ht.name as home_team,
      at.name as away_team
    FROM nba_games g
    LEFT JOIN teams ht ON g.home_team_id = ht.espn_team_id AND ht.sport = 'nba'
    LEFT JOIN teams at ON g.away_team_id = at.espn_team_id AND at.sport = 'nba'
    WHERE g.season = 2026
      AND (g.home_score > 0 OR g.away_score > 0)
      AND toDate(g.game_time) = '2025-11-29'
    ORDER BY g.game_time
  `)
  
  // Get Odds API events
  const oddsEvents = await getOddsEvents('2025-11-29')
  
  // Also check previous day
  const prevOddsEvents = await getOddsEvents('2025-11-28')
  const prevEventsOn29 = prevOddsEvents.filter(e => {
    const eventDate = new Date(e.commence_time).toISOString().split('T')[0]
    return eventDate === '2025-11-29'
  })
  
  const allOddsEvents = [...oddsEvents, ...prevEventsOn29]
  
  console.log('=== Nov 29, 2025 Comparison ===\n')
  console.log(`Our DB games: ${dbGames.data?.length || 0}`)
  console.log(`Odds API events: ${allOddsEvents.length}`)
  console.log(`\nOdds API events:`)
  allOddsEvents.forEach(e => {
    const eventDate = new Date(e.commence_time).toISOString().split('T')[0]
    console.log(`  ${e.away_team} @ ${e.home_team} (${eventDate})`)
  })
  
  console.log(`\nOur DB games:`)
  dbGames.data?.forEach(g => {
    const hasProps = false // We know these don't have props
    console.log(`  ${g.away_team} @ ${g.home_team} ${hasProps ? '(has props)' : '(NO PROPS)'}`)
  })
  
  // Try to match
  console.log(`\n=== Matching Analysis ===\n`)
  let matched = 0
  let unmatched = 0
  
  for (const dbGame of dbGames.data || []) {
    const dbHomeLast = dbGame.home_team.split(' ').pop()?.toLowerCase() || ''
    const dbAwayLast = dbGame.away_team.split(' ').pop()?.toLowerCase() || ''
    
    const match = allOddsEvents.find(e => {
      const eHome = e.home_team.toLowerCase()
      const eAway = e.away_team.toLowerCase()
      return (
        (eHome.includes(dbHomeLast) && eAway.includes(dbAwayLast)) ||
        (eHome.includes(dbAwayLast) && eAway.includes(dbHomeLast))
      )
    })
    
    if (match) {
      matched++
      console.log(`✅ ${dbGame.away_team} @ ${dbGame.home_team} → ${match.away_team} @ ${match.home_team}`)
    } else {
      unmatched++
      console.log(`❌ ${dbGame.away_team} @ ${dbGame.home_team} - NO MATCH`)
    }
  }
  
  console.log(`\nMatched: ${matched}/${dbGames.data?.length || 0}`)
  console.log(`Unmatched: ${unmatched}/${dbGames.data?.length || 0}`)
}

main().catch(console.error)


