import { NextResponse } from 'next/server'

const CLICKHOUSE_HOST = process.env.CLICKHOUSE_HOST!
const CLICKHOUSE_KEY_ID = process.env.CLICKHOUSE_KEY_ID!
const CLICKHOUSE_KEY_SECRET = process.env.CLICKHOUSE_KEY_SECRET!
const ODDS_API_KEY = process.env.ODDS_API_KEY!

// Team name mapping from Odds API to ESPN team IDs
const TEAM_NAME_TO_ID: Record<string, number> = {
  'Arizona Cardinals': 22, 'Atlanta Falcons': 1, 'Baltimore Ravens': 33,
  'Buffalo Bills': 2, 'Carolina Panthers': 29, 'Chicago Bears': 3,
  'Cincinnati Bengals': 4, 'Cleveland Browns': 5, 'Dallas Cowboys': 6,
  'Denver Broncos': 7, 'Detroit Lions': 8, 'Green Bay Packers': 9,
  'Houston Texans': 34, 'Indianapolis Colts': 11, 'Jacksonville Jaguars': 30,
  'Kansas City Chiefs': 12, 'Las Vegas Raiders': 13, 'Los Angeles Chargers': 24,
  'Los Angeles Rams': 14, 'Miami Dolphins': 15, 'Minnesota Vikings': 16,
  'New England Patriots': 17, 'New Orleans Saints': 18, 'New York Giants': 19,
  'New York Jets': 20, 'Philadelphia Eagles': 21, 'Pittsburgh Steelers': 23,
  'San Francisco 49ers': 25, 'Seattle Seahawks': 26, 'Tampa Bay Buccaneers': 27,
  'Tennessee Titans': 10, 'Washington Commanders': 28
}

const TEAM_ABBR: Record<string, string> = {
  'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF', 'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE', 'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC', 'Las Vegas Raiders': 'LV', 'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR', 'Miami Dolphins': 'MIA', 'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE', 'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
  'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF', 'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN', 'Washington Commanders': 'WAS'
}

// Team divisions for division game detection
const TEAM_DIVISIONS: Record<number, string> = {
  2: 'AFC East', 15: 'AFC East', 17: 'AFC East', 20: 'AFC East',
  33: 'AFC North', 4: 'AFC North', 5: 'AFC North', 23: 'AFC North',
  34: 'AFC South', 11: 'AFC South', 30: 'AFC South', 10: 'AFC South',
  7: 'AFC West', 12: 'AFC West', 24: 'AFC West', 13: 'AFC West',
  6: 'NFC East', 19: 'NFC East', 21: 'NFC East', 28: 'NFC East',
  3: 'NFC North', 8: 'NFC North', 9: 'NFC North', 16: 'NFC North',
  1: 'NFC South', 29: 'NFC South', 18: 'NFC South', 27: 'NFC South',
  22: 'NFC West', 14: 'NFC West', 25: 'NFC West', 26: 'NFC West'
}

async function executeQuery(sql: string): Promise<any> {
  const response = await fetch(CLICKHOUSE_HOST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${CLICKHOUSE_KEY_ID}:${CLICKHOUSE_KEY_SECRET}`).toString('base64')}`
    },
    body: JSON.stringify({ query: sql, format: 'JSONEachRow' })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`ClickHouse error: ${text}`)
  }

  const text = await response.text()
  if (!text.trim() || text.trim() === 'OK') return []
  
  try {
    return text.trim().split('\n').map(line => JSON.parse(line))
  } catch {
    // For INSERT/UPDATE queries that return non-JSON
    return []
  }
}

async function insertRows(table: string, rows: any[]): Promise<void> {
  if (rows.length === 0) return
  
  const values = rows.map(row => JSON.stringify(row)).join('\n')
  
  const response = await fetch(CLICKHOUSE_HOST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${CLICKHOUSE_KEY_ID}:${CLICKHOUSE_KEY_SECRET}`).toString('base64')}`
    },
    body: JSON.stringify({
      query: `INSERT INTO ${table} FORMAT JSONEachRow`,
      data: values
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Insert error: ${text}`)
  }
}

// Get current team rankings from our data (including win% and position stats)
async function getTeamRankings(): Promise<Map<number, any>> {
  const rankings = await executeQuery(`
    SELECT 
      team_id,
      rank_total_yards_per_game as offense_rank,
      rank_points_per_game as points_rank,
      rank_passing_yards_per_game as pass_offense_rank,
      rank_rushing_yards_per_game as rush_offense_rank,
      rank_points_allowed_per_game as defense_rank,
      rank_passing_yards_allowed_per_game as pass_defense_rank,
      rank_rushing_yards_allowed_per_game as rush_defense_rank,
      -- Win percentage
      wins,
      losses,
      win_pct,
      -- Position-specific DEFENSE rankings (yards allowed TO position)
      rank_yards_allowed_to_wr as rank_vs_wr,
      rank_yards_allowed_to_te as rank_vs_te,
      rank_yards_allowed_to_rb as rank_vs_rb,
      -- Position-specific OFFENSE rankings (yards produced BY position)
      rank_wr_yards_produced as rank_wr_prod,
      rank_te_yards_produced as rank_te_prod,
      rank_rb_yards_produced as rank_rb_prod
    FROM nfl_team_rankings
    WHERE (season, week) = (
      SELECT season, max(week) FROM nfl_team_rankings GROUP BY season ORDER BY season DESC LIMIT 1
    )
  `)
  
  const map = new Map()
  for (const r of rankings) {
    map.set(r.team_id, r)
  }
  return map
}

// Get current team streaks and previous margins
async function getTeamMomentum(): Promise<Map<number, { streak: number, prev_margin: number }>> {
  // Get last 10 games for each team to calculate streaks
  const games = await executeQuery(`
    SELECT 
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      game_time
    FROM nfl_games
    WHERE home_score > 0 AND away_score > 0
    ORDER BY game_time DESC
    LIMIT 320
  `)
  
  const teamGames: Map<number, { won: boolean, margin: number, time: string }[]> = new Map()
  
  for (const g of games) {
    const homeWon = g.home_score > g.away_score
    const margin = g.home_score - g.away_score
    
    // Home team
    if (!teamGames.has(g.home_team_id)) teamGames.set(g.home_team_id, [])
    teamGames.get(g.home_team_id)!.push({ won: homeWon, margin, time: g.game_time })
    
    // Away team  
    if (!teamGames.has(g.away_team_id)) teamGames.set(g.away_team_id, [])
    teamGames.get(g.away_team_id)!.push({ won: !homeWon, margin: -margin, time: g.game_time })
  }
  
  const momentum = new Map()
  for (const [teamId, games] of teamGames) {
    // Sort by time descending
    games.sort((a, b) => b.time.localeCompare(a.time))
    
    // Calculate streak
    let streak = 0
    const firstResult = games[0]?.won
    for (const g of games) {
      if (g.won === firstResult) {
        streak += firstResult ? 1 : -1
      } else {
        break
      }
    }
    
    // Previous game margin
    const prevMargin = games[0]?.margin || 0
    
    momentum.set(teamId, { streak, prev_margin: prevMargin })
  }
  
  return momentum
}

// Check which games already have opening lines stored
async function getGamesWithOpeningLines(): Promise<Set<string>> {
  const results = await executeQuery(`
    SELECT DISTINCT game_id FROM nfl_line_snapshots WHERE is_opening = 1
  `)
  return new Set(results.map((r: any) => r.game_id))
}

export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const includeProps = searchParams.get('props') !== 'false'
    
    console.log('🏈 Starting upcoming games sync...')
    
    // 1. Fetch upcoming games with odds from Odds API
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?apiKey=${ODDS_API_KEY}&regions=us,us2&markets=h2h,spreads,totals&oddsFormat=american`
    
    console.log('Fetching odds from Odds API...')
    const oddsResponse = await fetch(oddsUrl)
    if (!oddsResponse.ok) {
      throw new Error(`Odds API error: ${oddsResponse.status}`)
    }
    
    const games = await oddsResponse.json()
    console.log(`Found ${games.length} upcoming games`)
    
    if (games.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No upcoming games found',
        games_synced: 0
      })
    }
    
    // 2. Get team context data
    console.log('Fetching team rankings and momentum...')
    const [rankings, momentum, existingOpenings] = await Promise.all([
      getTeamRankings(),
      getTeamMomentum(),
      getGamesWithOpeningLines()
    ])
    
    // 3. Calculate current season/week
    const now = new Date()
    const season = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
    // Approximate week calculation
    const seasonStart = new Date(season, 8, 5) // Sept 5
    const weekNum = Math.max(1, Math.ceil((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000)))
    
    const snapshotTime = new Date().toISOString().replace('T', ' ').substring(0, 19)
    
    // 4. Process each game
    const upcomingGames: any[] = []
    const lineSnapshots: any[] = []
    
    for (const game of games) {
      const homeTeamId = TEAM_NAME_TO_ID[game.home_team] || 0
      const awayTeamId = TEAM_NAME_TO_ID[game.away_team] || 0
      
      if (!homeTeamId || !awayTeamId) {
        console.warn(`Unknown team: ${game.home_team} vs ${game.away_team}`)
        continue
      }
      
      const homeRankings = rankings.get(homeTeamId) || {}
      const awayRankings = rankings.get(awayTeamId) || {}
      const homeMomentum = momentum.get(homeTeamId) || { streak: 0, prev_margin: 0 }
      const awayMomentum = momentum.get(awayTeamId) || { streak: 0, prev_margin: 0 }
      
      const homeDivision = TEAM_DIVISIONS[homeTeamId] || ''
      const awayDivision = TEAM_DIVISIONS[awayTeamId] || ''
      const isDivisionGame = homeDivision === awayDivision ? 1 : 0
      const isConferenceGame = homeDivision.startsWith('AFC') === awayDivision.startsWith('AFC') ? 1 : 0
      
      // Check if this is a new game (no opening lines yet)
      const isNewGame = !existingOpenings.has(game.id)
      
      // Prepare upcoming game record
      upcomingGames.push({
        game_id: game.id,
        game_time: game.commence_time.replace('T', ' ').replace('Z', ''),
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_team_name: game.home_team,
        away_team_name: game.away_team,
        home_team_abbr: TEAM_ABBR[game.home_team] || '',
        away_team_abbr: TEAM_ABBR[game.away_team] || '',
        is_division_game: isDivisionGame,
        is_conference_game: isConferenceGame,
        season,
        week: weekNum,
        season_type: 'regular',
        home_offense_rank: homeRankings.offense_rank || 0,
        home_defense_rank: homeRankings.defense_rank || 0,
        home_pass_offense_rank: homeRankings.pass_offense_rank || 0,
        home_rush_offense_rank: homeRankings.rush_offense_rank || 0,
        home_pass_defense_rank: homeRankings.pass_defense_rank || 0,
        home_rush_defense_rank: homeRankings.rush_defense_rank || 0,
        away_offense_rank: awayRankings.offense_rank || 0,
        away_defense_rank: awayRankings.defense_rank || 0,
        away_pass_offense_rank: awayRankings.pass_offense_rank || 0,
        away_rush_offense_rank: awayRankings.rush_offense_rank || 0,
        away_pass_defense_rank: awayRankings.pass_defense_rank || 0,
        away_rush_defense_rank: awayRankings.rush_defense_rank || 0,
        home_streak: homeMomentum.streak,
        away_streak: awayMomentum.streak,
        home_prev_margin: homeMomentum.prev_margin,
        away_prev_margin: awayMomentum.prev_margin,
        // New: Win percentage
        home_win_pct: homeRankings.win_pct || 0,
        away_win_pct: awayRankings.win_pct || 0,
        home_wins: homeRankings.wins || 0,
        home_losses: homeRankings.losses || 0,
        away_wins: awayRankings.wins || 0,
        away_losses: awayRankings.losses || 0,
        // New: Position-specific defense rankings (vs WR/TE/RB)
        home_rank_vs_wr: homeRankings.rank_vs_wr || 0,
        home_rank_vs_te: homeRankings.rank_vs_te || 0,
        home_rank_vs_rb: homeRankings.rank_vs_rb || 0,
        away_rank_vs_wr: awayRankings.rank_vs_wr || 0,
        away_rank_vs_te: awayRankings.rank_vs_te || 0,
        away_rank_vs_rb: awayRankings.rank_vs_rb || 0,
        // New: Position-specific offense rankings (WR/TE/RB production)
        home_rank_wr_prod: homeRankings.rank_wr_prod || 0,
        home_rank_te_prod: homeRankings.rank_te_prod || 0,
        home_rank_rb_prod: homeRankings.rank_rb_prod || 0,
        away_rank_wr_prod: awayRankings.rank_wr_prod || 0,
        away_rank_te_prod: awayRankings.rank_te_prod || 0,
        away_rank_rb_prod: awayRankings.rank_rb_prod || 0,
        updated_at: snapshotTime
      })
      
      // Process bookmaker odds
      for (const bookmaker of game.bookmakers || []) {
        const snapshot: any = {
          game_id: game.id,
          snapshot_time: snapshotTime,
          bookmaker: bookmaker.key,
          bookmaker_title: bookmaker.title,
          is_opening: isNewGame ? 1 : 0
        }
        
        for (const market of bookmaker.markets || []) {
          if (market.key === 'h2h') {
            // Moneylines
            for (const outcome of market.outcomes || []) {
              if (outcome.name === game.home_team) {
                snapshot.home_ml = outcome.price
              } else if (outcome.name === game.away_team) {
                snapshot.away_ml = outcome.price
              }
            }
          } else if (market.key === 'spreads') {
            // Spreads
            for (const outcome of market.outcomes || []) {
              if (outcome.name === game.home_team) {
                snapshot.home_spread = outcome.point
                snapshot.home_spread_odds = outcome.price
              } else if (outcome.name === game.away_team) {
                snapshot.away_spread = outcome.point
                snapshot.away_spread_odds = outcome.price
              }
            }
          } else if (market.key === 'totals') {
            // Totals
            for (const outcome of market.outcomes || []) {
              snapshot.total_line = outcome.point
              if (outcome.name === 'Over') {
                snapshot.over_odds = outcome.price
              } else if (outcome.name === 'Under') {
                snapshot.under_odds = outcome.price
              }
            }
          }
        }
        
        lineSnapshots.push(snapshot)
      }
    }
    
    // 5. Insert data
    console.log(`Inserting ${upcomingGames.length} games and ${lineSnapshots.length} line snapshots...`)
    
    // Clear and re-insert upcoming games (they get updated each sync)
    await executeQuery(`TRUNCATE TABLE nfl_upcoming_games`)
    
    if (upcomingGames.length > 0) {
      const gameValues = upcomingGames.map(g => `(
        '${g.game_id}', '${g.game_time}', ${g.home_team_id}, ${g.away_team_id},
        '${g.home_team_name.replace(/'/g, "''")}', '${g.away_team_name.replace(/'/g, "''")}',
        '${g.home_team_abbr}', '${g.away_team_abbr}',
        ${g.is_division_game}, ${g.is_conference_game}, ${g.season}, ${g.week}, '${g.season_type}',
        ${g.home_offense_rank}, ${g.home_defense_rank}, ${g.home_pass_offense_rank}, ${g.home_rush_offense_rank},
        ${g.home_pass_defense_rank}, ${g.home_rush_defense_rank},
        ${g.away_offense_rank}, ${g.away_defense_rank}, ${g.away_pass_offense_rank}, ${g.away_rush_offense_rank},
        ${g.away_pass_defense_rank}, ${g.away_rush_defense_rank},
        ${g.home_streak}, ${g.away_streak}, ${g.home_prev_margin}, ${g.away_prev_margin},
        ${g.home_win_pct}, ${g.away_win_pct}, ${g.home_wins}, ${g.home_losses}, ${g.away_wins}, ${g.away_losses},
        ${g.home_rank_vs_wr}, ${g.home_rank_vs_te}, ${g.home_rank_vs_rb},
        ${g.away_rank_vs_wr}, ${g.away_rank_vs_te}, ${g.away_rank_vs_rb},
        ${g.home_rank_wr_prod}, ${g.home_rank_te_prod}, ${g.home_rank_rb_prod},
        ${g.away_rank_wr_prod}, ${g.away_rank_te_prod}, ${g.away_rank_rb_prod},
        now(), now()
      )`).join(',\n')
      
      await executeQuery(`
        INSERT INTO nfl_upcoming_games (
          game_id, game_time, home_team_id, away_team_id,
          home_team_name, away_team_name, home_team_abbr, away_team_abbr,
          is_division_game, is_conference_game, season, week, season_type,
          home_offense_rank, home_defense_rank, home_pass_offense_rank, home_rush_offense_rank,
          home_pass_defense_rank, home_rush_defense_rank,
          away_offense_rank, away_defense_rank, away_pass_offense_rank, away_rush_offense_rank,
          away_pass_defense_rank, away_rush_defense_rank,
          home_streak, away_streak, home_prev_margin, away_prev_margin,
          home_win_pct, away_win_pct, home_wins, home_losses, away_wins, away_losses,
          home_rank_vs_wr, home_rank_vs_te, home_rank_vs_rb,
          away_rank_vs_wr, away_rank_vs_te, away_rank_vs_rb,
          home_rank_wr_prod, home_rank_te_prod, home_rank_rb_prod,
          away_rank_wr_prod, away_rank_te_prod, away_rank_rb_prod,
          created_at, updated_at
        ) VALUES ${gameValues}
      `)
    }
    
    // Insert line snapshots (append, don't truncate)
    if (lineSnapshots.length > 0) {
      const lineValues = lineSnapshots.map(l => `(
        '${l.game_id}', '${l.snapshot_time}', '${l.bookmaker}', '${l.bookmaker_title}',
        ${l.home_spread || 0}, ${l.home_spread_odds || 0}, ${l.away_spread || 0}, ${l.away_spread_odds || 0},
        ${l.total_line || 0}, ${l.over_odds || 0}, ${l.under_odds || 0},
        ${l.home_ml || 0}, ${l.away_ml || 0}, ${l.is_opening}
      )`).join(',\n')
      
      await executeQuery(`
        INSERT INTO nfl_line_snapshots (
          game_id, snapshot_time, bookmaker, bookmaker_title,
          home_spread, home_spread_odds, away_spread, away_spread_odds,
          total_line, over_odds, under_odds,
          home_ml, away_ml, is_opening
        ) VALUES ${lineValues}
      `)
    }
    
    // 6. Sync props if requested
    let propsSynced = 0
    if (includeProps && games.length > 0) {
      console.log('Syncing prop lines...')
      propsSynced = await syncPropLines(games.map((g: any) => g.id), snapshotTime, existingOpenings)
    }
    
    const duration = Date.now() - startTime
    
    // Get remaining API quota from response headers
    const remaining = oddsResponse.headers.get('x-requests-remaining')
    const used = oddsResponse.headers.get('x-requests-used')
    
    return NextResponse.json({
      success: true,
      games_synced: upcomingGames.length,
      line_snapshots: lineSnapshots.length,
      props_synced: propsSynced,
      new_games: upcomingGames.filter(g => existingOpenings.has(g.game_id) === false).length,
      duration_ms: duration,
      api_quota: { remaining, used }
    })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Sync prop lines for all games
async function syncPropLines(gameIds: string[], snapshotTime: string, existingOpenings: Set<string>): Promise<number> {
  const propMarkets = [
    'player_pass_yds', 'player_pass_tds', 'player_pass_attempts', 'player_pass_completions',
    'player_rush_yds', 'player_rush_attempts', 'player_rush_tds',
    'player_receptions', 'player_reception_yds', 'player_reception_tds',
    'player_pass_rush_yds', 'player_rush_reception_yds'
  ]
  
  let totalProps = 0
  
  // Process games in batches to avoid rate limiting
  for (const gameId of gameIds) {
    try {
      const url = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/${gameId}/odds?apiKey=${ODDS_API_KEY}&regions=us,us2&markets=${propMarkets.join(',')}&oddsFormat=american`
      
      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`Failed to fetch props for game ${gameId}: ${response.status}`)
        continue
      }
      
      const eventData = await response.json()
      const isNewGame = !existingOpenings.has(gameId)
      const propSnapshots: any[] = []
      
      for (const bookmaker of eventData.bookmakers || []) {
        for (const market of bookmaker.markets || []) {
          // Group outcomes by player
          const playerOutcomes: Map<string, any> = new Map()
          
          for (const outcome of market.outcomes || []) {
            const playerName = outcome.description
            if (!playerName) continue
            
            if (!playerOutcomes.has(playerName)) {
              playerOutcomes.set(playerName, { line: outcome.point })
            }
            
            if (outcome.name === 'Over') {
              playerOutcomes.get(playerName)!.over_odds = outcome.price
            } else if (outcome.name === 'Under') {
              playerOutcomes.get(playerName)!.under_odds = outcome.price
            }
          }
          
          for (const [playerName, data] of playerOutcomes) {
            propSnapshots.push({
              game_id: gameId,
              snapshot_time: snapshotTime,
              player_name: playerName,
              bookmaker: bookmaker.key,
              bookmaker_title: bookmaker.title,
              prop_type: market.key,
              line: data.line || 0,
              over_odds: data.over_odds || 0,
              under_odds: data.under_odds || 0,
              is_opening: isNewGame ? 1 : 0
            })
          }
        }
      }
      
      // Insert prop snapshots
      if (propSnapshots.length > 0) {
        const propValues = propSnapshots.map(p => `(
          '${p.game_id}', '${p.snapshot_time}', '${p.player_name.replace(/'/g, "''")}', 0,
          '', '${p.bookmaker}', '${p.bookmaker_title}', '${p.prop_type}',
          ${p.line}, ${p.over_odds}, ${p.under_odds}, ${p.is_opening}
        )`).join(',\n')
        
        await executeQuery(`
          INSERT INTO nfl_prop_line_snapshots (
            game_id, snapshot_time, player_name, player_id,
            team_name, bookmaker, bookmaker_title, prop_type,
            line, over_odds, under_odds, is_opening
          ) VALUES ${propValues}
        `)
        
        totalProps += propSnapshots.length
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`Error syncing props for game ${gameId}:`, error)
    }
  }
  
  return totalProps
}

