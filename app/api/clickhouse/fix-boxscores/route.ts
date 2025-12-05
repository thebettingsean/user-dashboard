import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export const maxDuration = 60

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

// Helper to parse ESPN stats
function parseAthleteStats(statsArray: string[], category: string): Record<string, number> {
  const stats: Record<string, number> = {}
  if (!statsArray || statsArray.length === 0) return stats
  
  if (category === 'passing') {
    // Format: "C/ATT, YDS, AVG, TD, INT, SACKS, QBR, RTG"
    const [compAtt, yds, , td, int, sacks, , rtg] = statsArray
    if (compAtt && compAtt.includes('/')) {
      const [comp, att] = compAtt.split('/')
      stats.pass_completions = parseInt(comp) || 0
      stats.pass_attempts = parseInt(att) || 0
    }
    stats.pass_yards = parseInt(yds) || 0
    stats.pass_tds = parseInt(td) || 0
    stats.interceptions = parseInt(int) || 0
    stats.sacks = parseInt(sacks) || 0
    stats.qb_rating = parseFloat(rtg) || 0
  } else if (category === 'rushing') {
    // Format: "CAR, YDS, AVG, TD, LONG"
    const [car, yds, avg, td, long] = statsArray
    stats.rush_attempts = parseInt(car) || 0
    stats.rush_yards = parseInt(yds) || 0
    stats.yards_per_carry = parseFloat(avg) || 0
    stats.rush_tds = parseInt(td) || 0
    stats.rush_long = parseInt(long) || 0
  } else if (category === 'receiving') {
    // Format: "REC, YDS, AVG, TD, LONG, TGTS"
    const [rec, yds, avg, td, long, tgts] = statsArray
    stats.receptions = parseInt(rec) || 0
    stats.receiving_yards = parseInt(yds) || 0
    stats.yards_per_reception = parseFloat(avg) || 0
    stats.receiving_tds = parseInt(td) || 0
    stats.receiving_long = parseInt(long) || 0
    stats.targets = parseInt(tgts) || 0
  }
  
  return stats
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('game_id')
  
  if (!gameId) {
    return NextResponse.json({ error: 'game_id required' }, { status: 400 })
  }
  
  try {
    // Get game info
    const gameInfo = await clickhouseQuery(`
      SELECT game_id, home_team_id, away_team_id, season, game_date
      FROM nfl_games WHERE game_id = ${gameId}
    `)
    
    if (!gameInfo.data[0]) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    const game = gameInfo.data[0]
    
    // Delete existing bad box scores for this game
    await clickhouseCommand(`
      ALTER TABLE nfl_box_scores_v2 DELETE WHERE game_id = ${gameId}
    `)
    
    // Wait for delete to propagate
    await new Promise(r => setTimeout(r, 2000))
    
    // Fetch fresh box scores from ESPN
    const summaryResponse = await fetch(`${ESPN_BASE}/summary?event=${gameId}`)
    if (!summaryResponse.ok) {
      return NextResponse.json({ error: 'ESPN fetch failed' }, { status: 500 })
    }
    
    const summaryData = await summaryResponse.json()
    const boxscore = summaryData.boxscore
    const header = summaryData.header
    
    const season = header?.season?.year || game.season
    const week = header?.week || 0
    const gameDate = game.game_date
    
    let inserted = 0
    const playerStats: any[] = []
    
    if (boxscore?.players) {
      for (const teamPlayers of boxscore.players) {
        const teamId = parseInt(teamPlayers.team?.id) || 0
        const isHome = teamId === game.home_team_id ? 1 : 0
        const opponentId = isHome === 1 ? game.away_team_id : game.home_team_id
        
        // Track players we've already processed to avoid duplicates
        const processedPlayers = new Set<number>()
        
        for (const category of teamPlayers.statistics || []) {
          for (const athlete of category.athletes || []) {
            const playerId = parseInt(athlete.athlete?.id) || 0
            if (playerId === 0) continue
            
            // Skip if we already processed this player (they appear in multiple categories)
            if (processedPlayers.has(playerId)) {
              // Merge stats instead
              const existing = playerStats.find(p => p.playerId === playerId)
              if (existing) {
                const newStats = parseAthleteStats(athlete.stats, category.name)
                Object.assign(existing.stats, newStats)
              }
              continue
            }
            
            processedPlayers.add(playerId)
            const stats = parseAthleteStats(athlete.stats, category.name)
            
            playerStats.push({
              playerId,
              teamId,
              opponentId,
              isHome,
              stats,
              athleteName: athlete.athlete?.displayName
            })
          }
        }
      }
    }
    
    // Now insert deduplicated stats
    for (const player of playerStats) {
      const stats = player.stats
      
      // Only insert if player has meaningful stats
      if (stats.pass_yards || stats.rush_yards || stats.receiving_yards || 
          stats.pass_tds || stats.rush_tds || stats.receiving_tds) {
        
        await clickhouseCommand(`
          INSERT INTO nfl_box_scores_v2 (
            player_id, game_id, game_date, season, week, 
            team_id, opponent_id, is_home,
            pass_attempts, pass_completions, pass_yards, pass_tds, interceptions,
            sacks, qb_rating,
            rush_attempts, rush_yards, rush_tds, rush_long, yards_per_carry,
            targets, receptions, receiving_yards, receiving_tds, receiving_long, yards_per_reception,
            created_at
          ) VALUES (
            ${player.playerId}, ${gameId}, '${gameDate}', ${season}, ${week},
            ${player.teamId}, ${player.opponentId}, ${player.isHome},
            ${stats.pass_attempts || 0}, ${stats.pass_completions || 0}, 
            ${stats.pass_yards || 0}, ${stats.pass_tds || 0}, ${stats.interceptions || 0},
            ${stats.sacks || 0}, ${stats.qb_rating || 0},
            ${stats.rush_attempts || 0}, ${stats.rush_yards || 0}, 
            ${stats.rush_tds || 0}, ${stats.rush_long || 0}, ${stats.yards_per_carry || 0},
            ${stats.targets || 0}, ${stats.receptions || 0}, 
            ${stats.receiving_yards || 0}, ${stats.receiving_tds || 0}, 
            ${stats.receiving_long || 0}, ${stats.yards_per_reception || 0},
            now()
          )
        `)
        inserted++
      }
    }
    
    return NextResponse.json({
      success: true,
      game_id: gameId,
      home_team_id: game.home_team_id,
      away_team_id: game.away_team_id,
      players_inserted: inserted,
      sample: playerStats.slice(0, 5).map(p => ({
        name: p.athleteName,
        team_id: p.teamId,
        opponent_id: p.opponentId,
        rush_yards: p.stats.rush_yards,
        receiving_yards: p.stats.receiving_yards
      }))
    })
    
  } catch (error: any) {
    console.error('[Fix BoxScores] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('game_id')
  
  if (!gameId) {
    // Show games with potential duplicate box scores
    const dupes = await clickhouseQuery(`
      SELECT game_id, player_id, count() as cnt
      FROM nfl_box_scores_v2
      WHERE game_date >= '2025-12-01'
      GROUP BY game_id, player_id
      HAVING cnt > 1
      ORDER BY cnt DESC
      LIMIT 20
    `)
    
    return NextResponse.json({
      duplicates: dupes.data
    })
  }
  
  // Show box scores for specific game
  const boxscores = await clickhouseQuery(`
    SELECT player_id, team_id, opponent_id, is_home, rush_yards, receiving_yards, pass_yards
    FROM nfl_box_scores_v2
    WHERE game_id = ${gameId}
    ORDER BY rush_yards DESC
    LIMIT 20
  `)
  
  return NextResponse.json({
    game_id: gameId,
    box_scores: boxscores.data
  })
}

