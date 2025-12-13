import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const week = parseInt(searchParams.get('week') || '15')
  const season = parseInt(searchParams.get('season') || '2024')
  
  try {
    console.log(`Fetching Week ${week} games from ESPN...`)
    
    const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&dates=${season}`
    const response = await fetch(espnUrl)
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`)
    }
    
    const data = await response.json()
    const games = data.events || []
    
    console.log(`Found ${games.length} games for Week ${week}`)
    
    const existingGamesResult = await clickhouseQuery<{ game_id: number }>(`
      SELECT game_id FROM nfl_games WHERE season = ${season} AND week = ${week}
    `)
    const existingGameIds = new Set((existingGamesResult.data || []).map(g => g.game_id))
    
    const processedGames: any[] = []
    const skippedGames: any[] = []
    let gamesInserted = 0
    
    for (const game of games) {
      const gameId = parseInt(game.id)
      
      if (existingGameIds.has(gameId)) {
        skippedGames.push({ game_id: gameId, reason: 'already exists' })
        continue
      }
      
      const competition = game.competitions?.[0]
      if (!competition) continue
      
      const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home')
      const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away')
      
      if (!homeTeam || !awayTeam) continue
      
      const homeTeamId = parseInt(homeTeam.team.id)
      const awayTeamId = parseInt(awayTeam.team.id)
      const homeScore = parseInt(homeTeam.score) || 0
      const awayScore = parseInt(awayTeam.score) || 0
      
      const gameTime = game.date.replace('T', ' ').replace('Z', '')
      const gameDate = gameTime.substring(0, 10)
      
      const odds = competition.odds?.[0]
      let spread = 0
      let total = 0
      
      if (odds) {
        const spreadMatch = odds.details?.match(/([A-Z]{2,4})\s*([+-]?\d+\.?\d*)/)
        if (spreadMatch) {
          const spreadTeam = spreadMatch[1]
          const spreadValue = parseFloat(spreadMatch[2])
          spread = spreadTeam === homeTeam.team.abbreviation ? spreadValue : -spreadValue
        }
        total = odds.overUnder || 0
      }
      
      const homeDivision = TEAM_DIVISIONS[homeTeamId] || ''
      const awayDivision = TEAM_DIVISIONS[awayTeamId] || ''
      const isDivisionGame = homeDivision === awayDivision ? 1 : 0
      const isConferenceGame = homeDivision.startsWith('AFC') === awayDivision.startsWith('AFC') ? 1 : 0
      
      const pointDiff = homeScore - awayScore
      let homeCovered = 0
      if (homeScore > 0) {
        homeCovered = pointDiff + spread > 0 ? 1 : (pointDiff + spread < 0 ? 0 : -1)
      }
      
      const totalPoints = homeScore + awayScore
      let overHit = 0
      if (homeScore > 0 && total > 0) {
        overHit = totalPoints > total ? 1 : (totalPoints < total ? 0 : -1)
      }
      
      const insertSql = `
        INSERT INTO nfl_games (
          game_id, season, week, game_date, game_time,
          home_team_id, away_team_id, home_score, away_score,
          spread_close, total_close, home_covered, over_hit,
          is_division_game, is_conference_game, season_type
        ) VALUES (
          ${gameId}, ${season}, ${week}, '${gameDate}', '${gameTime}',
          ${homeTeamId}, ${awayTeamId}, ${homeScore}, ${awayScore},
          ${spread}, ${total}, ${homeCovered}, ${overHit},
          ${isDivisionGame}, ${isConferenceGame}, 'regular'
        )
      `
      
      await clickhouseCommand(insertSql)
      gamesInserted++
      
      processedGames.push({
        game_id: gameId,
        matchup: `${awayTeam.team.displayName} @ ${homeTeam.team.displayName}`,
        score: `${awayScore}-${homeScore}`,
        spread,
        total,
        completed: game.status?.type?.completed
      })
    }
    
    return NextResponse.json({
      success: true,
      week,
      season,
      totalGamesFound: games.length,
      gamesInserted,
      gamesSkipped: skippedGames.length,
      processedGames,
      skippedGames
    })
    
  } catch (error: any) {
    console.error('Error syncing completed games:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

