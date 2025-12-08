import { NextResponse } from 'next/server'

/**
 * WEEKLY SYNC: Post-Game Data Processing
 * 
 * This should run after NFL games complete (ideally multiple times per day):
 * 1. Identifies completed games from this week
 * 2. Ingests box scores for each completed game
 * 3. Updates team stats
 * 4. Recalculates rankings
 * 5. Cleans up upcoming tables (removes completed games/props)
 * 
 * Can be triggered manually or via cron job
 */

const CLICKHOUSE_HOST = process.env.CLICKHOUSE_HOST!
const CLICKHOUSE_KEY_ID = process.env.CLICKHOUSE_KEY_ID!
const CLICKHOUSE_KEY_SECRET = process.env.CLICKHOUSE_KEY_SECRET!

async function executeQuery(sql: string): Promise<any[]> {
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
    return []
  }
}

// Team mappings
const ESPN_TEAM_IDS: Record<string, number> = {
  'ARI': 22, 'ATL': 1, 'BAL': 33, 'BUF': 2, 'CAR': 29, 'CHI': 3,
  'CIN': 4, 'CLE': 5, 'DAL': 6, 'DEN': 7, 'DET': 8, 'GB': 9,
  'HOU': 34, 'IND': 11, 'JAX': 30, 'KC': 12, 'LV': 13, 'LAC': 24,
  'LAR': 14, 'MIA': 15, 'MIN': 16, 'NE': 17, 'NO': 18, 'NYG': 19,
  'NYJ': 20, 'PHI': 21, 'PIT': 23, 'SF': 25, 'SEA': 26, 'TB': 27,
  'TEN': 10, 'WAS': 28
}

// Get current season and week
function getCurrentSeasonWeek(): { season: number, week: number } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  
  // NFL season typically starts in September
  const season = month >= 8 ? year : year - 1
  
  // Approximate week calculation (season starts ~Sept 5)
  const seasonStart = new Date(season, 8, 5) // Sept 5
  const daysSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (24 * 60 * 60 * 1000))
  const week = Math.max(1, Math.min(18, Math.ceil(daysSinceStart / 7)))
  
  return { season, week }
}

// Fetch completed games from ESPN
async function fetchCompletedGames(season: number, week: number): Promise<any[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}&dates=${season}`
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`ESPN API error: ${response.status}`)
  }
  
  const data = await response.json()
  const completedGames: any[] = []
  
  for (const event of data.events || []) {
    const competition = event.competitions?.[0]
    if (!competition) continue
    
    // Check if game is complete (status type 3 = Final)
    const isComplete = competition.status?.type?.id === '3'
    if (!isComplete) continue
    
    const homeTeam = competition.competitors?.find((c: any) => c.homeAway === 'home')
    const awayTeam = competition.competitors?.find((c: any) => c.homeAway === 'away')
    
    if (!homeTeam || !awayTeam) continue
    
    completedGames.push({
      espn_game_id: event.id,
      game_time: event.date,
      home_team_id: parseInt(homeTeam.team.id),
      away_team_id: parseInt(awayTeam.team.id),
      home_team_abbr: homeTeam.team.abbreviation,
      away_team_abbr: awayTeam.team.abbreviation,
      home_score: parseInt(homeTeam.score || 0),
      away_score: parseInt(awayTeam.score || 0),
      season,
      week
    })
  }
  
  return completedGames
}

// Check which games are already in our database
async function getExistingGameIds(season: number, week: number): Promise<Set<string>> {
  const results = await executeQuery(`
    SELECT DISTINCT game_id
    FROM nfl_games
    WHERE season = ${season} AND week = ${week} AND home_score > 0
  `)
  return new Set(results.map(r => r.game_id))
}

// Fetch and ingest box score for a single game
async function ingestGameBoxScore(game: any): Promise<{ players: number, success: boolean }> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${game.espn_game_id}`
    
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Failed to fetch box score for game ${game.espn_game_id}`)
      return { players: 0, success: false }
    }
    
    const data = await response.json()
    const boxScores: any[] = []
    
    // Process player stats from each team
    for (const team of data.boxscore?.players || []) {
      const teamId = parseInt(team.team?.id || 0)
      const isHome = teamId === game.home_team_id
      
      for (const category of team.statistics || []) {
        for (const athlete of category.athletes || []) {
          const playerId = parseInt(athlete.athlete?.id || 0)
          const playerName = athlete.athlete?.displayName || ''
          const position = athlete.athlete?.position?.abbreviation || ''
          
          if (!playerId || !playerName) continue
          
          // Parse stats based on category
          const stats = parsePlayerStats(category.name, athlete.stats || [])
          
          boxScores.push({
            game_id: game.espn_game_id,
            season: game.season,
            week: game.week,
            game_time: game.game_time.replace('T', ' ').replace('Z', ''),
            player_id: playerId,
            player_name: playerName,
            position,
            team_id: teamId,
            is_home: isHome ? 1 : 0,
            opponent_id: isHome ? game.away_team_id : game.home_team_id,
            ...stats
          })
        }
      }
    }
    
    // Deduplicate by player_id (combine stats from multiple categories)
    const playerMap = new Map<number, any>()
    for (const box of boxScores) {
      if (playerMap.has(box.player_id)) {
        // Merge stats
        const existing = playerMap.get(box.player_id)!
        for (const [key, value] of Object.entries(box)) {
          if (typeof value === 'number' && value > 0 && key !== 'player_id' && key !== 'team_id') {
            existing[key] = Math.max(existing[key] || 0, value)
          }
        }
      } else {
        playerMap.set(box.player_id, box)
      }
    }
    
    const finalBoxScores = Array.from(playerMap.values())
    
    if (finalBoxScores.length > 0) {
      // Insert box scores
      const values = finalBoxScores.map(b => `(
        '${b.game_id}', ${b.season}, ${b.week}, '${b.game_time}',
        ${b.player_id}, '${b.player_name.replace(/'/g, "''")}', '${b.position}',
        ${b.team_id}, ${b.is_home}, ${b.opponent_id},
        ${b.pass_attempts || 0}, ${b.pass_completions || 0}, ${b.pass_yards || 0},
        ${b.pass_tds || 0}, ${b.interceptions || 0}, ${b.passer_rating || 0},
        ${b.rush_attempts || 0}, ${b.rush_yards || 0}, ${b.rush_tds || 0},
        ${b.longest_rush || 0}, ${b.targets || 0}, ${b.receptions || 0},
        ${b.receiving_yards || 0}, ${b.receiving_tds || 0}, ${b.longest_reception || 0}
      )`).join(',\n')
      
      await executeQuery(`
        INSERT INTO nfl_box_scores_v2 (
          game_id, season, week, game_time,
          player_id, player_name, position, team_id, is_home, opponent_id,
          pass_attempts, pass_completions, pass_yards, pass_tds, interceptions, passer_rating,
          rush_attempts, rush_yards, rush_tds, longest_rush,
          targets, receptions, receiving_yards, receiving_tds, longest_reception
        ) VALUES ${values}
      `)
    }
    
    // Also update the nfl_games table with scores and derived fields
    await updateGameWithScores(game)
    
    return { players: finalBoxScores.length, success: true }
  } catch (err) {
    console.error(`Error ingesting box score for game ${game.espn_game_id}:`, err)
    return { players: 0, success: false }
  }
}

// Parse player stats from ESPN format
function parsePlayerStats(category: string, stats: string[]): Record<string, number> {
  const result: Record<string, number> = {}
  
  if (category === 'passing') {
    // Format: C/ATT, YDS, AVG, TD, INT, SACKS, QBR, RTG
    const [compAtt] = stats[0]?.split('/') || ['0', '0']
    result.pass_completions = parseInt(compAtt) || 0
    result.pass_attempts = parseInt(stats[0]?.split('/')[1]) || 0
    result.pass_yards = parseInt(stats[1]) || 0
    result.pass_tds = parseInt(stats[3]) || 0
    result.interceptions = parseInt(stats[4]) || 0
    result.passer_rating = parseFloat(stats[7]) || 0
  } else if (category === 'rushing') {
    // Format: CAR, YDS, AVG, TD, LONG
    result.rush_attempts = parseInt(stats[0]) || 0
    result.rush_yards = parseInt(stats[1]) || 0
    result.rush_tds = parseInt(stats[3]) || 0
    result.longest_rush = parseInt(stats[4]) || 0
  } else if (category === 'receiving') {
    // Format: REC, YDS, AVG, TD, LONG, TGTS
    result.receptions = parseInt(stats[0]) || 0
    result.receiving_yards = parseInt(stats[1]) || 0
    result.receiving_tds = parseInt(stats[3]) || 0
    result.longest_reception = parseInt(stats[4]) || 0
    result.targets = parseInt(stats[5]) || 0
  }
  
  return result
}

// Update nfl_games table with final scores
async function updateGameWithScores(game: any): Promise<void> {
  const homeWon = game.home_score > game.away_score
  const totalPoints = game.home_score + game.away_score
  
  await executeQuery(`
    ALTER TABLE nfl_games UPDATE
      home_score = ${game.home_score},
      away_score = ${game.away_score}
    WHERE game_id = '${game.espn_game_id}'
  `)
}

// Clean up completed games from upcoming tables
async function cleanupCompletedGames(completedGameIds: string[]): Promise<void> {
  if (completedGameIds.length === 0) return
  
  const gameIdList = completedGameIds.map(id => `'${id}'`).join(',')
  
  // Remove from nfl_upcoming_games
  await executeQuery(`
    ALTER TABLE nfl_upcoming_games DELETE WHERE game_id IN (${gameIdList})
  `)
  
  // We keep prop line snapshots for historical reference, but mark them as final
  // (or we could delete them if not needed)
}

// Main sync function
export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const forceWeek = searchParams.get('week')
    const forceSeason = searchParams.get('season')
    
    const { season, week } = forceWeek && forceSeason 
      ? { season: parseInt(forceSeason), week: parseInt(forceWeek) }
      : getCurrentSeasonWeek()
    
    console.log(`[WEEKLY-SYNC] Starting sync for ${season} Week ${week}...`)
    
    // 1. Get completed games from ESPN
    const completedGames = await fetchCompletedGames(season, week)
    console.log(`[WEEKLY-SYNC] Found ${completedGames.length} completed games this week`)
    
    if (completedGames.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No completed games to process',
        season,
        week
      })
    }
    
    // 2. Check which games we already have
    const existingGameIds = await getExistingGameIds(season, week)
    const newGames = completedGames.filter(g => !existingGameIds.has(g.espn_game_id))
    
    console.log(`[WEEKLY-SYNC] ${newGames.length} new games to ingest`)
    
    // 3. Process each new game
    const results = {
      games_processed: 0,
      players_ingested: 0,
      errors: [] as string[]
    }
    
    for (const game of newGames) {
      console.log(`[WEEKLY-SYNC] Processing ${game.away_team_abbr} @ ${game.home_team_abbr}...`)
      
      const { players, success } = await ingestGameBoxScore(game)
      
      if (success) {
        results.games_processed++
        results.players_ingested += players
      } else {
        results.errors.push(`${game.away_team_abbr} @ ${game.home_team_abbr}`)
      }
      
      // Small delay between games
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // 4. Clean up upcoming tables
    const allCompletedIds = completedGames.map(g => g.espn_game_id)
    await cleanupCompletedGames(allCompletedIds)
    console.log(`[WEEKLY-SYNC] Cleaned up ${allCompletedIds.length} games from upcoming tables`)
    
    // 5. Trigger rankings recalculation if we processed any new games
    if (results.games_processed > 0) {
      console.log(`[WEEKLY-SYNC] Triggering rankings recalculation...`)
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3003'
      
      try {
        await fetch(`${baseUrl}/api/clickhouse/calculate-nfl-rankings?season=${season}&week=${week}`)
        console.log(`[WEEKLY-SYNC] Rankings updated for ${season} Week ${week}`)
      } catch (e) {
        console.error('[WEEKLY-SYNC] Rankings update failed:', e)
      }
    }
    
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      season,
      week,
      completed_games_found: completedGames.length,
      new_games_processed: results.games_processed,
      players_ingested: results.players_ingested,
      games_cleaned_from_upcoming: allCompletedIds.length,
      errors: results.errors,
      duration_ms: duration
    })
    
  } catch (error) {
    console.error('[WEEKLY-SYNC] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also support POST for cron jobs
export async function POST(request: Request) {
  return GET(request)
}

