import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

// Cache for team data from ClickHouse
let teamDataCache: Map<string, { logo: string; abbreviation: string }> | null = null
let teamDataCacheTime = 0

// Fetch all team data from ClickHouse teams table (cached for 1 hour)
async function getTeamData(): Promise<Map<string, { logo: string; abbreviation: string }>> {
  const now = Date.now()
  if (teamDataCache && teamDataCache.size > 0 && (now - teamDataCacheTime) < 60 * 60 * 1000) {
    return teamDataCache
  }
  
  try {
    // Query using correct column names: name, abbreviation, city, logo_url
    const result = await clickhouseQuery<{
      name: string
      abbreviation: string
      city: string
      logo_url: string
      sport: string
    }>(`
      SELECT name, abbreviation, city, logo_url, sport 
      FROM teams 
      WHERE logo_url != ''
    `)
    
    const map = new Map<string, { logo: string; abbreviation: string }>()
    
    for (const team of result.data || []) {
      if (!team.name || !team.logo_url) continue
      
      const teamInfo = { logo: team.logo_url, abbreviation: team.abbreviation || '' }
      
      // Map by full name (e.g., "Denver Broncos")
      const fullName = team.city ? `${team.city} ${team.name}` : team.name
      map.set(fullName.toLowerCase(), teamInfo)
      
      // Map by team name only (e.g., "Broncos")
      map.set(team.name.toLowerCase(), teamInfo)
      
      // Map by city + name variations
      if (team.city) {
        map.set(`${team.city} ${team.name}`.toLowerCase(), teamInfo)
      }
    }
    
    teamDataCache = map
    teamDataCacheTime = now
    console.log(`[Team Data] Cached ${map.size} team entries from DB`)
    return map
  } catch (e) {
    console.error('[Team Data] Error fetching teams:', e)
    return teamDataCache || new Map()
  }
}

// Helper to get logo for a team name - tries multiple matching strategies
function getTeamInfo(teamName: string, teamData: Map<string, { logo: string; abbreviation: string }>): { logo: string; abbreviation: string } {
  const nameLower = teamName.toLowerCase().trim()
  
  // Try exact match
  let info = teamData.get(nameLower)
  if (info?.logo) return info
  
  // Try just the mascot (last word) - e.g., "Broncos" from "Denver Broncos"
  const words = teamName.split(' ')
  if (words.length > 1) {
    info = teamData.get(words[words.length - 1].toLowerCase())
    if (info?.logo) return info
  }
  
  // Try without common suffixes
  const cleaned = nameLower.replace(' state', '').replace(' university', '')
  info = teamData.get(cleaned)
  if (info?.logo) return info
  
  // Fallback - generate abbreviation
  return { 
    logo: '', 
    abbreviation: words[words.length - 1].substring(0, 3).toUpperCase() 
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'all'
  
  try {
    // Pre-fetch team data for logos and abbreviations
    const teamData = await getTeamData()
    console.log(`[Live Odds] Using ${teamData.size} cached teams for logo lookup`)
    
    // Query that gets both opening (first) and current (latest) snapshots per game
    // ONLY upcoming games (game_time > now())
    // Use absolute latest snapshot for current lines (to match timeline graph)
    // But get public betting from most recent snapshot that has it
    const query = `
      WITH 
      -- Get absolute latest snapshot for current lines
      latest AS (
        SELECT 
          odds_api_game_id,
          sport,
          home_team,
          away_team,
          game_time,
          spread as current_spread,
          total as current_total,
          ml_home as current_ml_home,
          ml_away as current_ml_away,
          snapshot_time as last_updated
        FROM live_odds_snapshots
        WHERE (odds_api_game_id, snapshot_time) IN (
          SELECT odds_api_game_id, max(snapshot_time)
          FROM live_odds_snapshots
          WHERE game_time > now()
          GROUP BY odds_api_game_id
        )
        AND game_time > now()
        ${sport !== 'all' ? `AND sport = '${sport}'` : ''}
      ),
      -- Get latest snapshot WITH betting data for public betting percentages
      betting AS (
        SELECT 
          odds_api_game_id,
          public_spread_home_bet_pct,
          public_spread_home_money_pct,
          public_ml_home_bet_pct,
          public_ml_home_money_pct,
          public_total_over_bet_pct,
          public_total_over_money_pct
        FROM live_odds_snapshots
        WHERE (odds_api_game_id, snapshot_time) IN (
          SELECT odds_api_game_id, max(snapshot_time)
          FROM live_odds_snapshots
          WHERE game_time > now()
          AND public_spread_home_bet_pct > 0 AND public_spread_home_bet_pct != 50
          GROUP BY odds_api_game_id
        )
        AND game_time > now()
        ${sport !== 'all' ? `AND sport = '${sport}'` : ''}
      ),
      -- Combined: latest lines + betting percentages
      combined AS (
        SELECT 
          l.*,
          COALESCE(b.public_spread_home_bet_pct, 50) as public_spread_home_bet_pct,
          COALESCE(b.public_spread_home_money_pct, 50) as public_spread_home_money_pct,
          COALESCE(b.public_ml_home_bet_pct, 50) as public_ml_home_bet_pct,
          COALESCE(b.public_ml_home_money_pct, 50) as public_ml_home_money_pct,
          COALESCE(b.public_total_over_bet_pct, 50) as public_total_over_bet_pct,
          COALESCE(b.public_total_over_money_pct, 50) as public_total_over_money_pct
        FROM latest l
        LEFT JOIN betting b ON l.odds_api_game_id = b.odds_api_game_id
      ),
      opening AS (
        SELECT 
          odds_api_game_id,
          spread as opening_spread,
          total as opening_total,
          ml_home as opening_ml_home,
          ml_away as opening_ml_away
        FROM live_odds_snapshots
        WHERE (odds_api_game_id, snapshot_time) IN (
          SELECT odds_api_game_id, min(snapshot_time)
          FROM live_odds_snapshots
          WHERE game_time > now()
          GROUP BY odds_api_game_id
        )
        AND game_time > now()
        ${sport !== 'all' ? `AND sport = '${sport}'` : ''}
      )
      SELECT 
        l.*,
        o.opening_spread,
        o.opening_total,
        o.opening_ml_home,
        o.opening_ml_away
      FROM combined l
      LEFT JOIN opening o ON l.odds_api_game_id = o.odds_api_game_id
      ORDER BY l.game_time ASC
      LIMIT 100
    `
    
    const result = await clickhouseQuery<any>(query)
    
    if (!result.data || result.data.length === 0) {
      return NextResponse.json({
        success: true,
        games: [],
        total: 0,
        source: 'clickhouse',
        message: 'No upcoming games found',
        updated_at: new Date().toISOString()
      })
    }
    
    // Process games
    const games = result.data.map((game: any) => {
      // Calculate line movements
      const spread_movement = (game.current_spread || 0) - (game.opening_spread || game.current_spread || 0)
      const total_movement = (game.current_total || 0) - (game.opening_total || game.current_total || 0)
      
      // ML movement - convert to "cents from even" to handle +/- crossing
      // +115 means 15 cents above even, -103 means 3 cents below even
      // +115 to -103 = 15 to -3 = -18 movement (not -218)
      const mlToCents = (ml: number) => {
        if (ml === 0) return 0
        return ml > 0 ? (ml - 100) : (100 + ml)
      }
      const openingMlHomeCents = mlToCents(game.opening_ml_home || game.current_ml_home || 0)
      const currentMlHomeCents = mlToCents(game.current_ml_home || 0)
      const openingMlAwayCents = mlToCents(game.opening_ml_away || game.current_ml_away || 0)
      const currentMlAwayCents = mlToCents(game.current_ml_away || 0)
      
      const ml_home_movement = currentMlHomeCents - openingMlHomeCents
      const ml_away_movement = currentMlAwayCents - openingMlAwayCents
      
      // Get percentages - use actual values, default to 50 only if truly zero/null
      const spreadBetPct = game.public_spread_home_bet_pct > 0 ? game.public_spread_home_bet_pct : 50
      const spreadMoneyPct = game.public_spread_home_money_pct > 0 ? game.public_spread_home_money_pct : 50
      const mlBetPct = game.public_ml_home_bet_pct > 0 ? game.public_ml_home_bet_pct : 50
      const mlMoneyPct = game.public_ml_home_money_pct > 0 ? game.public_ml_home_money_pct : 50
      const totalBetPct = game.public_total_over_bet_pct > 0 ? game.public_total_over_bet_pct : 50
      const totalMoneyPct = game.public_total_over_money_pct > 0 ? game.public_total_over_money_pct : 50
      
      // Calculate RLM and Sharp indicators based on spread
      const publicOnHome = spreadBetPct > 55
      const publicOnAway = spreadBetPct < 45
      const spreadDiff = Math.abs(spreadMoneyPct - spreadBetPct)
      
      let rlm = '-'
      let respected = ''
      
      // RLM: Public on one side, money on the other
      if (publicOnHome && spreadMoneyPct < 45) {
        rlm = 'RLM'
        respected = 'Sharp'
      } else if (publicOnAway && spreadMoneyPct > 55) {
        rlm = 'RLM'
        respected = 'Sharp'
      } else if (spreadDiff >= 10) {
        rlm = 'Steam'
        respected = 'Sharp'
      } else if (spreadDiff >= 5) {
        respected = 'Lean'
      }
      
      // Get logos and abbreviations from cached team data
      const homeInfo = getTeamInfo(game.home_team, teamData)
      const awayInfo = getTeamInfo(game.away_team, teamData)
      const homeLogo = homeInfo.logo
      const awayLogo = awayInfo.logo
      const homeAbbrev = homeInfo.abbreviation
      const awayAbbrev = awayInfo.abbreviation
      
      return {
        id: game.odds_api_game_id,
        sport: game.sport,
        home_team: game.home_team,
        away_team: game.away_team,
        home_abbrev: homeAbbrev,
        away_abbrev: awayAbbrev,
        home_logo: homeLogo,
        away_logo: awayLogo,
        game_time: game.game_time,
        
        // Spread
        opening_spread: game.opening_spread || game.current_spread || 0,
        current_spread: game.current_spread || 0,
        spread_movement: spread_movement,
        
        // Totals
        opening_total: game.opening_total || game.current_total || 0,
        current_total: game.current_total || 0,
        total_movement: total_movement,
        
        // Moneylines
        opening_ml_home: game.opening_ml_home || game.current_ml_home || 0,
        opening_ml_away: game.opening_ml_away || game.current_ml_away || 0,
        current_ml_home: game.current_ml_home || 0,
        current_ml_away: game.current_ml_away || 0,
        ml_home_movement: ml_home_movement,
        ml_away_movement: ml_away_movement,
        
        // Public betting - SPREAD
        public_spread_bet_pct: spreadBetPct,
        public_spread_money_pct: spreadMoneyPct,
        
        // Public betting - MONEYLINE
        public_ml_bet_pct: mlBetPct,
        public_ml_money_pct: mlMoneyPct,
        
        // Public betting - TOTALS
        public_total_bet_pct: totalBetPct,
        public_total_money_pct: totalMoneyPct,
        
        // Indicators
        rlm,
        respected,
        money_vs_bets_diff: spreadDiff,
        
        last_updated: game.last_updated
      }
    })
    
    return NextResponse.json({
      success: true,
      games,
      total: games.length,
      source: 'clickhouse',
      sports_breakdown: {
        nfl: games.filter((g: any) => g.sport === 'nfl').length,
        nba: games.filter((g: any) => g.sport === 'nba').length,
        nhl: games.filter((g: any) => g.sport === 'nhl').length,
        cfb: games.filter((g: any) => g.sport === 'cfb').length,
      },
      updated_at: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('[Live Odds API] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      games: [],
      total: 0,
      source: 'error'
    }, { status: 500 })
  }
}
