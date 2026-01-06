import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY

export async function GET() {
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'No SportsDataIO API key' }, { status: 500 })
  }

  try {
    console.log('[DEBUG] Starting NFL playoff game population')
    
    // Fetch playoff games from SportsDataIO for season 2025POST
    const playoffGamesUrl = `https://api.sportsdata.io/v3/nfl/scores/json/Schedules/2025POST?key=${SPORTSDATA_API_KEY}`
    console.log('[DEBUG] Fetching from:', playoffGamesUrl.replace(SPORTSDATA_API_KEY, 'REDACTED'))
    
    const playoffResp = await fetch(playoffGamesUrl)
    
    if (!playoffResp.ok) {
      const errorText = await playoffResp.text()
      return NextResponse.json({ 
        error: `SportsDataIO API error: ${playoffResp.status}`,
        details: errorText
      }, { status: 500 })
    }
    
    const playoffGames = await playoffResp.json()
    console.log(`[DEBUG] Found ${playoffGames.length} playoff games from SportsDataIO`)
    
    if (playoffGames.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No playoff games returned from API',
        gamesFound: 0
      })
    }
    
    // Insert any playoff games that don't exist in nfl_games yet
    let playoffGamesInserted = 0
    let playoffGamesSkipped = 0
    const errors: string[] = []
    const inserted: any[] = []
    
    for (const game of playoffGames) {
      try {
        // Check if game exists
        const exists = await clickhouseQuery<{cnt: number}>(`
          SELECT COUNT(*) as cnt FROM nfl_games WHERE game_id = ${game.ScoreID}
        `)
        
        if ((exists.data?.[0]?.cnt || 0) > 0) {
          console.log(`[DEBUG] Game ${game.ScoreID} already exists (${game.AwayTeam}@${game.HomeTeam})`)
          playoffGamesSkipped++
          continue
        }
        
        // Get team IDs
        const homeTeamId = await clickhouseQuery<{team_id: number}>(`
          SELECT team_id FROM teams WHERE abbreviation = '${game.HomeTeam}' AND sport = 'nfl' LIMIT 1
        `)
        const awayTeamId = await clickhouseQuery<{team_id: number}>(`
          SELECT team_id FROM teams WHERE abbreviation = '${game.AwayTeam}' AND sport = 'nfl' LIMIT 1
        `)
        
        if (!homeTeamId.data?.[0] || !awayTeamId.data?.[0]) {
          errors.push(`Could not find team IDs for ${game.AwayTeam}@${game.HomeTeam}`)
          continue
        }
        
        const gameTime = new Date(game.DateTime).toISOString().replace('T', ' ').replace('Z', '').slice(0, 19)
        const gameDate = game.Day.split('T')[0]
        
        await clickhouseCommand(`
          INSERT INTO nfl_games (
            game_id, sportsdata_io_score_id, season, week, game_date, game_time,
            home_team_id, away_team_id, home_score, away_score,
            is_playoff, venue, is_neutral_site
          ) VALUES (
            ${game.ScoreID}, ${game.ScoreID}, ${game.Season}, ${game.Week},
            '${gameDate}', '${gameTime}',
            ${homeTeamId.data[0].team_id}, ${awayTeamId.data[0].team_id},
            0, 0,
            1, '${(game.StadiumDetails?.Name || '').replace(/'/g, "''")}',
            0
          )
        `)
        
        playoffGamesInserted++
        inserted.push({
          scoreId: game.ScoreID,
          matchup: `${game.AwayTeam}@${game.HomeTeam}`,
          week: game.Week,
          date: gameDate
        })
        
        console.log(`[DEBUG] Inserted playoff game ${game.ScoreID}: ${game.AwayTeam}@${game.HomeTeam}`)
        
      } catch (gameError: any) {
        console.error(`[DEBUG] Error inserting playoff game ${game.ScoreID}:`, gameError.message)
        errors.push(`Game ${game.ScoreID}: ${gameError.message}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      totalGamesFromAPI: playoffGames.length,
      gamesInserted: playoffGamesInserted,
      gamesSkipped: playoffGamesSkipped,
      errors: errors.length > 0 ? errors : undefined,
      insertedGames: inserted
    })
    
  } catch (error: any) {
    console.error('[DEBUG] Fatal error:', error)
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

