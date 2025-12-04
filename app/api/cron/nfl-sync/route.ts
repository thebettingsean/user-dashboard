import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'
import { extractTeamStats, extractPlayerBoxScores } from '@/lib/nfl-extraction-helpers'

/**
 * NFL AUTOMATED SYNC
 * 
 * Run modes:
 * - upcoming: Fetch this week's upcoming games + opening odds
 * - closing: Fetch closing odds (run Sunday morning before games)  
 * - grade: Grade completed games (run Tuesday after MNF)
 * - boxscores: Fetch full box scores for completed games (team stats + player stats)
 * - rankings: Recalculate team rankings after new games
 * - complete: Run grade + boxscores + rankings (full post-week processing)
 */

const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'
const ODDS_API_KEY = process.env.ODDS_API_KEY || 'd8ba5d45eca27e710d7ef2680d8cb452'
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl'

const NFL_TEAMS: Record<string, number> = {
  'ARI': 22, 'ATL': 1, 'BAL': 33, 'BUF': 2, 'CAR': 29, 'CHI': 3,
  'CIN': 4, 'CLE': 5, 'DAL': 6, 'DEN': 7, 'DET': 8, 'GB': 9,
  'HOU': 34, 'IND': 11, 'JAX': 30, 'KC': 12, 'LV': 13, 'LAC': 24,
  'LAR': 14, 'MIA': 15, 'MIN': 16, 'NE': 17, 'NO': 18, 'NYG': 19,
  'NYJ': 20, 'PHI': 21, 'PIT': 23, 'SF': 25, 'SEA': 26, 'TB': 27,
  'TEN': 10, 'WAS': 28
}

const NFL_TEAM_NAMES: Record<number, string> = {
  22: 'Arizona Cardinals', 1: 'Atlanta Falcons', 33: 'Baltimore Ravens',
  2: 'Buffalo Bills', 29: 'Carolina Panthers', 3: 'Chicago Bears',
  4: 'Cincinnati Bengals', 5: 'Cleveland Browns', 6: 'Dallas Cowboys',
  7: 'Denver Broncos', 8: 'Detroit Lions', 9: 'Green Bay Packers',
  34: 'Houston Texans', 11: 'Indianapolis Colts', 30: 'Jacksonville Jaguars',
  12: 'Kansas City Chiefs', 13: 'Las Vegas Raiders', 24: 'Los Angeles Chargers',
  14: 'Los Angeles Rams', 15: 'Miami Dolphins', 16: 'Minnesota Vikings',
  17: 'New England Patriots', 18: 'New Orleans Saints', 19: 'New York Giants',
  20: 'New York Jets', 21: 'Philadelphia Eagles', 23: 'Pittsburgh Steelers',
  25: 'San Francisco 49ers', 26: 'Seattle Seahawks', 27: 'Tampa Bay Buccaneers',
  10: 'Tennessee Titans', 28: 'Washington Commanders'
}

// Get current NFL week
function getCurrentNFLWeek(): { season: number, week: number } {
  const now = new Date()
  const year = now.getFullYear()
  
  // NFL season typically starts first Thursday after Labor Day
  // For 2025 season, Week 1 starts ~Sept 4, 2025
  const seasonStart = new Date(year, 8, 4) // Sept 4
  
  if (now < seasonStart) {
    // Still in previous season's playoffs or offseason
    return { season: year - 1, week: 22 }
  }
  
  const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const currentWeek = Math.min(weeksSinceStart + 1, 18)
  
  return { season: year, week: currentWeek }
}

// Fetch upcoming games from ESPN
async function fetchUpcomingGames(season: number, week: number) {
  const url = `${ESPN_BASE_URL}/scoreboard?seasontype=2&week=${week}&dates=${season}`
  console.log(`Fetching: ${url}`)
  
  const response = await fetch(url)
  if (!response.ok) throw new Error(`ESPN API error: ${response.status}`)
  
  const data = await response.json()
  return data.events || []
}

// Fetch live odds from Odds API
async function fetchLiveOdds() {
  const url = `${ODDS_API_BASE}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
  
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Odds API error: ${response.status}`)
  
  return await response.json()
}

// Process and insert/update a game
async function upsertGame(event: any, season: number, week: number, odds: any) {
  const competition = event.competitions?.[0]
  if (!competition) return null
  
  const homeTeam = competition.competitors?.find((c: any) => c.homeAway === 'home')
  const awayTeam = competition.competitors?.find((c: any) => c.homeAway === 'away')
  
  if (!homeTeam || !awayTeam) return null
  
  const homeTeamId = NFL_TEAMS[homeTeam.team?.abbreviation]
  const awayTeamId = NFL_TEAMS[awayTeam.team?.abbreviation]
  
  if (!homeTeamId || !awayTeamId) return null
  
  const gameId = parseInt(event.id)
  const gameDate = new Date(event.date)
  const isCompleted = event.status?.type?.completed || false
  
  // Find matching odds
  const homeTeamName = NFL_TEAM_NAMES[homeTeamId]
  const awayTeamName = NFL_TEAM_NAMES[awayTeamId]
  const matchingOdds = odds?.find((o: any) => 
    o.home_team === homeTeamName && o.away_team === awayTeamName
  )
  
  // Extract odds data
  let spreadOpen = 0, totalOpen = 0, homeMLOpen = 0, awayMLOpen = 0
  if (matchingOdds?.bookmakers?.[0]) {
    const bm = matchingOdds.bookmakers.find((b: any) => 
      ['FanDuel', 'DraftKings', 'BetMGM'].includes(b.title)
    ) || matchingOdds.bookmakers[0]
    
    const spreadMarket = bm.markets?.find((m: any) => m.key === 'spreads')
    spreadOpen = spreadMarket?.outcomes?.find((o: any) => o.name === homeTeamName)?.point || 0
    
    const totalsMarket = bm.markets?.find((m: any) => m.key === 'totals')
    totalOpen = totalsMarket?.outcomes?.find((o: any) => o.name === 'Over')?.point || 0
    
    const h2hMarket = bm.markets?.find((m: any) => m.key === 'h2h')
    homeMLOpen = h2hMarket?.outcomes?.find((o: any) => o.name === homeTeamName)?.price || 0
    awayMLOpen = h2hMarket?.outcomes?.find((o: any) => o.name === awayTeamName)?.price || 0
  }
  
  // Check if game exists
  const exists = await clickhouseQuery(`
    SELECT COUNT(*) as cnt FROM nfl_games WHERE game_id = ${gameId}
  `)
  
  if ((exists.data?.[0]?.cnt || 0) > 0) {
    // Update existing game with latest odds/scores
    await clickhouseCommand(`
      ALTER TABLE nfl_games UPDATE
        home_score = ${parseInt(homeTeam.score) || 0},
        away_score = ${parseInt(awayTeam.score) || 0},
        spread_open = CASE WHEN spread_open = 0 THEN ${spreadOpen} ELSE spread_open END,
        total_open = CASE WHEN total_open = 0 THEN ${totalOpen} ELSE total_open END,
        home_ml_open = CASE WHEN home_ml_open = 0 THEN ${homeMLOpen} ELSE home_ml_open END,
        away_ml_open = CASE WHEN away_ml_open = 0 THEN ${awayMLOpen} ELSE away_ml_open END
      WHERE game_id = ${gameId}
    `)
    return { action: 'updated', gameId }
  } else {
    // Insert new game
    await clickhouseCommand(`
      INSERT INTO nfl_games (
        game_id, espn_game_id, season, week, game_date, game_time,
        home_team_id, away_team_id, home_score, away_score,
        venue, is_playoff, is_division_game, is_conference_game,
        spread_open, total_open, home_ml_open, away_ml_open,
        odds_provider_name
      ) VALUES (
        ${gameId}, '${event.id}', ${season}, ${week},
        '${gameDate.toISOString().split('T')[0]}',
        '${gameDate.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19)}',
        ${homeTeamId}, ${awayTeamId},
        ${parseInt(homeTeam.score) || 0}, ${parseInt(awayTeam.score) || 0},
        '${(competition.venue?.fullName || '').replace(/'/g, "''")}',
        0, 0, 0,
        ${spreadOpen}, ${totalOpen}, ${homeMLOpen}, ${awayMLOpen},
        '${matchingOdds?.bookmakers?.[0]?.title || 'Odds API'}'
      )
    `)
    return { action: 'inserted', gameId }
  }
}

// Grade completed games
async function gradeCompletedGames() {
  const result = await clickhouseQuery(`
    SELECT game_id, home_score, away_score, spread_close, total_close
    FROM nfl_games
    WHERE home_score > 0 OR away_score > 0
  `)
  
  let graded = 0
  for (const game of result.data || []) {
    const totalPoints = game.home_score + game.away_score
    const margin = game.home_score - game.away_score
    
    await clickhouseCommand(`
      ALTER TABLE nfl_games UPDATE
        total_points = ${totalPoints},
        home_won = ${game.home_score > game.away_score ? 1 : 0},
        margin_of_victory = ${Math.abs(margin)},
        went_over = ${game.total_close > 0 && totalPoints > game.total_close ? 1 : 0},
        went_under = ${game.total_close > 0 && totalPoints < game.total_close ? 1 : 0},
        total_push = ${game.total_close > 0 && totalPoints === game.total_close ? 1 : 0},
        home_covered = ${game.spread_close !== 0 && margin > -game.spread_close ? 1 : 0},
        spread_push = ${game.spread_close !== 0 && margin === -game.spread_close ? 1 : 0}
      WHERE game_id = ${game.game_id}
    `)
    graded++
  }
  
  return graded
}

// Fetch and insert team stats for completed games
async function fetchTeamBoxScores(season: number, week: number) {
  const url = `${ESPN_BASE_URL}/scoreboard?seasontype=2&week=${week}&dates=${season}`
  const response = await fetch(url)
  if (!response.ok) return { teamStats: 0, playerStats: 0 }
  
  const data = await response.json()
  let teamStatsInserted = 0
  let playerStatsInserted = 0
  
  for (const event of data.events || []) {
    const isCompleted = event.status?.type?.completed
    if (!isCompleted) continue
    
    const gameId = parseInt(event.id)
    const gameDate = new Date(event.date)
    
    // Check if we already have team stats for this game
    const existingTeamStats = await clickhouseQuery(`
      SELECT COUNT(*) as cnt FROM nfl_team_stats WHERE game_id = ${gameId}
    `)
    
    if ((existingTeamStats.data?.[0]?.cnt || 0) === 0) {
      // Fetch and insert team stats
      try {
        const teamStats = await extractTeamStats(event, gameId, String(season), String(week), gameDate)
        
        for (const stat of teamStats) {
          await clickhouseCommand(`
            INSERT INTO nfl_team_stats (
              team_id, game_id, season, week, game_date, opponent_id, is_home,
              points_scored, points_allowed, won,
              total_yards, passing_yards, rushing_yards, passing_attempts, completions,
              passing_tds, interceptions_thrown, rushing_attempts, rushing_tds,
              sacks_taken, turnovers, first_downs,
              third_down_attempts, third_down_conversions, third_down_pct,
              redzone_attempts, redzone_scores, redzone_pct, time_of_possession_seconds,
              def_total_yards_allowed, def_passing_yards_allowed, def_rushing_yards_allowed,
              def_passing_tds_allowed, def_rushing_tds_allowed, def_sacks_made,
              def_turnovers_forced, def_interceptions
            ) VALUES (
              ${stat.team_id}, ${stat.game_id}, ${stat.season}, ${stat.week}, '${stat.game_date}',
              ${stat.opponent_id}, ${stat.is_home}, ${stat.points_scored}, ${stat.points_allowed}, ${stat.won},
              ${stat.total_yards}, ${stat.passing_yards}, ${stat.rushing_yards}, ${stat.passing_attempts}, ${stat.completions},
              ${stat.passing_tds}, ${stat.interceptions_thrown}, ${stat.rushing_attempts}, ${stat.rushing_tds},
              ${stat.sacks_taken}, ${stat.turnovers}, ${stat.first_downs},
              ${stat.third_down_attempts}, ${stat.third_down_conversions}, ${stat.third_down_pct},
              ${stat.redzone_attempts}, ${stat.redzone_scores}, ${stat.redzone_pct}, ${stat.time_of_possession_seconds},
              ${stat.def_total_yards_allowed}, ${stat.def_passing_yards_allowed}, ${stat.def_rushing_yards_allowed},
              ${stat.def_passing_tds_allowed}, ${stat.def_rushing_tds_allowed}, ${stat.def_sacks_made},
              ${stat.def_turnovers_forced}, ${stat.def_interceptions}
            )
          `)
          teamStatsInserted++
        }
      } catch (err: any) {
        console.error(`Failed to fetch team stats for game ${gameId}:`, err.message)
      }
    }
    
    // Check if we already have player box scores for this game
    const existingPlayerStats = await clickhouseQuery(`
      SELECT COUNT(*) as cnt FROM nfl_box_scores_v2 WHERE game_id = ${gameId}
    `)
    
    if ((existingPlayerStats.data?.[0]?.cnt || 0) === 0) {
      // Fetch and insert player box scores
      try {
        const boxScores = await extractPlayerBoxScores(event, gameId, String(season), String(week), gameDate)
        
        for (const box of boxScores) {
          await clickhouseCommand(`
            INSERT INTO nfl_box_scores_v2 (
              player_id, game_id, game_date, season, week, team_id, opponent_id, is_home,
              opp_def_rank_pass_yards, opp_def_rank_rush_yards, opp_def_rank_receiving_yards,
              pass_attempts, pass_completions, pass_yards, pass_tds, interceptions, sacks, qb_rating,
              rush_attempts, rush_yards, rush_tds, rush_long, yards_per_carry,
              targets, receptions, receiving_yards, receiving_tds, receiving_long, yards_per_reception,
              fumbles, fumbles_lost
            ) VALUES (
              ${box.player_id}, ${box.game_id}, '${box.game_date}', ${box.season}, ${box.week},
              ${box.team_id}, ${box.opponent_id}, ${box.is_home},
              ${box.opp_def_rank_pass_yards || 0}, ${box.opp_def_rank_rush_yards || 0}, ${box.opp_def_rank_receiving_yards || 0},
              ${box.pass_attempts || 0}, ${box.pass_completions || 0}, ${box.pass_yards || 0}, ${box.pass_tds || 0},
              ${box.interceptions || 0}, ${box.sacks || 0}, ${box.qb_rating || 0},
              ${box.rush_attempts || 0}, ${box.rush_yards || 0}, ${box.rush_tds || 0}, ${box.rush_long || 0}, ${box.yards_per_carry || 0},
              ${box.targets || 0}, ${box.receptions || 0}, ${box.receiving_yards || 0}, ${box.receiving_tds || 0},
              ${box.receiving_long || 0}, ${box.yards_per_reception || 0},
              ${box.fumbles || 0}, ${box.fumbles_lost || 0}
            )
          `)
          playerStatsInserted++
        }
      } catch (err: any) {
        console.error(`Failed to fetch player box scores for game ${gameId}:`, err.message)
      }
    }
    
    await new Promise(r => setTimeout(r, 500)) // Rate limit between games
  }
  
  return { teamStats: teamStatsInserted, playerStats: playerStatsInserted }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'upcoming'
  const targetWeek = searchParams.get('week')
  
  try {
    const { season, week: currentWeek } = getCurrentNFLWeek()
    const week = targetWeek ? parseInt(targetWeek) : currentWeek
    
    const results: any = {
      mode,
      season,
      week,
      timestamp: new Date().toISOString()
    }
    
    if (mode === 'upcoming' || mode === 'full') {
      // Fetch upcoming games and opening odds
      const events = await fetchUpcomingGames(season, week)
      const odds = await fetchLiveOdds()
      
      results.games_found = events.length
      results.odds_events = odds.length
      results.processed = []
      
      for (const event of events) {
        const result = await upsertGame(event, season, week, odds)
        if (result) results.processed.push(result)
        await new Promise(r => setTimeout(r, 100))
      }
      
      results.inserted = results.processed.filter((p: any) => p.action === 'inserted').length
      results.updated = results.processed.filter((p: any) => p.action === 'updated').length
    }
    
    if (mode === 'grade' || mode === 'full' || mode === 'complete') {
      results.graded = await gradeCompletedGames()
    }
    
    if (mode === 'boxscores' || mode === 'complete') {
      // Fetch team stats and player box scores for completed games
      const boxResults = await fetchTeamBoxScores(season, week)
      results.team_stats_inserted = boxResults.teamStats
      results.player_stats_inserted = boxResults.playerStats
    }
    
    if (mode === 'rankings' || mode === 'complete') {
      // Trigger rankings recalculation
      // This would call the calculate-nfl-rankings endpoint
      results.rankings = 'Would recalculate (call /api/clickhouse/calculate-nfl-rankings)'
    }
    
    return NextResponse.json({
      success: true,
      results
    })
    
  } catch (error: any) {
    console.error('NFL Sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Also support GET for manual testing
export async function GET(request: Request) {
  return POST(request)
}

