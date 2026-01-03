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

// Team mapping (same as worker)
const NBA_TEAM_ALIASES: Record<string, string> = {
  'atlanta hawks': 'ATL', 'hawks': 'ATL',
  'boston celtics': 'BOS', 'celtics': 'BOS',
  'brooklyn nets': 'BKN', 'nets': 'BKN',
  'charlotte hornets': 'CHA', 'hornets': 'CHA',
  'chicago bulls': 'CHI', 'bulls': 'CHI',
  'cleveland cavaliers': 'CLE', 'cavaliers': 'CLE', 'cavs': 'CLE',
  'dallas mavericks': 'DAL', 'mavericks': 'DAL', 'mavs': 'DAL',
  'denver nuggets': 'DEN', 'nuggets': 'DEN',
  'detroit pistons': 'DET', 'pistons': 'DET',
  'golden state warriors': 'GSW', 'warriors': 'GSW',
  'houston rockets': 'HOU', 'rockets': 'HOU',
  'indiana pacers': 'IND', 'pacers': 'IND',
  'la clippers': 'LAC', 'los angeles clippers': 'LAC', 'clippers': 'LAC',
  'los angeles lakers': 'LAL', 'lakers': 'LAL',
  'memphis grizzlies': 'MEM', 'grizzlies': 'MEM',
  'miami heat': 'MIA', 'heat': 'MIA',
  'milwaukee bucks': 'MIL', 'bucks': 'MIL',
  'minnesota timberwolves': 'MIN', 'timberwolves': 'MIN', 'wolves': 'MIN',
  'new orleans pelicans': 'NOP', 'pelicans': 'NOP',
  'new york knicks': 'NYK', 'knicks': 'NYK',
  'oklahoma city thunder': 'OKC', 'thunder': 'OKC',
  'orlando magic': 'ORL', 'magic': 'ORL',
  'philadelphia 76ers': 'PHI', '76ers': 'PHI', 'sixers': 'PHI',
  'phoenix suns': 'PHX', 'suns': 'PHX',
  'portland trail blazers': 'POR', 'trail blazers': 'POR', 'blazers': 'POR',
  'sacramento kings': 'SAC', 'kings': 'SAC',
  'san antonio spurs': 'SAS', 'spurs': 'SAS',
  'toronto raptors': 'TOR', 'raptors': 'TOR',
  'utah jazz': 'UTA', 'jazz': 'UTA',
  'washington wizards': 'WAS', 'wizards': 'WAS',
}

function normalizeTeam(teamName: string): string {
  return teamName
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function getCanonicalTeam(teamName: string): string | null {
  const normalized = normalizeTeam(teamName)
  return NBA_TEAM_ALIASES[normalized] ?? null
}

async function main() {
  const { clickhouseQuery, clickhouseCommand } = await import('../lib/clickhouse')
  
  console.log('=== Matching Unmatched Props ===\n')
  
  // Get all unmatched events (across all seasons, not just 2026)
  const unmatched = await clickhouseQuery(`
    SELECT DISTINCT
      p.game_id as odds_event_id,
      p.home_team,
      p.away_team,
      toDate(p.game_time) as game_date,
      p.season
    FROM nba_prop_lines p
    WHERE p.espn_game_id = 0
    ORDER BY p.season, game_date
  `)
  
  console.log(`Found ${unmatched.data?.length || 0} unmatched Odds API events (all seasons)\n`)
  
  let matched = 0
  let notFound = 0
  
  for (const event of unmatched.data || []) {
    const oddsHome = getCanonicalTeam(event.home_team)
    const oddsAway = getCanonicalTeam(event.away_team)
    
    if (!oddsHome || !oddsAway) {
      console.log(`[SKIP] ${event.game_date} - ${event.away_team} @ ${event.home_team} - unmapped team names`)
      continue
    }
    
    // Find matching ESPN game (use season from event)
    const match = await clickhouseQuery(`
      SELECT 
        g.game_id,
        toString(g.game_id) as espn_game_id,
        ht.name as home_team_name,
        at.name as away_team_name
      FROM nba_games g
      LEFT JOIN teams ht ON g.home_team_id = ht.espn_team_id AND ht.sport = 'nba'
      LEFT JOIN teams at ON g.away_team_id = at.espn_team_id AND at.sport = 'nba'
      WHERE g.season = ${event.season}
        AND (g.home_score > 0 OR g.away_score > 0)
        AND toDate(g.game_time) = '${event.game_date}'
        AND (
          (lower(ht.name) LIKE '%${event.home_team.toLowerCase().split(' ').pop()}%' 
           AND lower(at.name) LIKE '%${event.away_team.toLowerCase().split(' ').pop()}%')
          OR
          (lower(ht.name) LIKE '%${event.away_team.toLowerCase().split(' ').pop()}%' 
           AND lower(at.name) LIKE '%${event.home_team.toLowerCase().split(' ').pop()}%')
        )
      LIMIT 1
    `)
    
    if (match.data && match.data.length > 0) {
      const game = match.data[0]
      const espnGameId = parseInt(game.game_id) || 0
      
      if (espnGameId > 0) {
        // Since espn_game_id is in ORDER BY, we need to DELETE and re-INSERT
        // First, get all the props for this Odds event
        const existingProps = await clickhouseQuery(`
          SELECT *
          FROM nba_prop_lines
          WHERE game_id = '${event.odds_event_id}'
            AND season = ${event.season}
            AND espn_game_id = 0
        `)
        
        if (existingProps.data && existingProps.data.length > 0) {
          // Delete old rows
          await clickhouseCommand(`
            ALTER TABLE nba_prop_lines
            DELETE WHERE game_id = '${event.odds_event_id}'
              AND season = ${event.season}
              AND espn_game_id = 0
          `)
          
          // Re-insert with correct espn_game_id
          const values = existingProps.data.map((prop: any) => `(
            '${prop.game_id}',
            ${espnGameId},
            '${prop.player_name.replace(/'/g, "''")}',
            ${prop.espn_player_id},
            '${prop.prop_type}',
            ${prop.line},
            ${prop.over_odds},
            ${prop.under_odds},
            '${prop.bookmaker}',
            parseDateTimeBestEffort('${prop.snapshot_time}'),
            parseDateTimeBestEffort('${prop.game_time}'),
            ${prop.season},
            ${prop.week},
            '${prop.home_team.replace(/'/g, "''")}',
            '${prop.away_team.replace(/'/g, "''")}'
          )`).join(',\n')
          
          await clickhouseCommand(`
            INSERT INTO nba_prop_lines (
              game_id, espn_game_id, player_name, espn_player_id,
              prop_type, line, over_odds, under_odds,
              bookmaker, snapshot_time, game_time, season, week,
              home_team, away_team
            ) VALUES ${values}
          `)
          
          matched++
          console.log(`[MATCH] ${event.game_date} - ${event.away_team} @ ${event.home_team} → ESPN game_id ${espnGameId} (${existingProps.data.length} props)`)
        }
      }
    } else {
      notFound++
      console.log(`[NOT FOUND] ${event.game_date} - ${event.away_team} @ ${event.home_team}`)
    }
  }
  
  console.log(`\n=== Summary ===`)
  console.log(`Matched: ${matched}`)
  console.log(`Not found: ${notFound}`)
  console.log(`\n✅ Updated ${matched} unmatched events with ESPN game IDs`)
}

main().catch(console.error)

