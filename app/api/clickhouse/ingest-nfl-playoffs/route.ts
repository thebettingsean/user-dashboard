import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

/**
 * Ingest NFL playoff games for 2022, 2023, 2024 seasons
 * Playoff weeks: 19 (Wild Card), 20 (Divisional), 21 (Conference), 22 (Super Bowl)
 */

const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

const NFL_TEAMS: Record<string, number> = {
  'ARI': 22, 'ATL': 1, 'BAL': 33, 'BUF': 2, 'CAR': 29, 'CHI': 3,
  'CIN': 4, 'CLE': 5, 'DAL': 6, 'DEN': 7, 'DET': 8, 'GB': 9,
  'HOU': 34, 'IND': 11, 'JAX': 30, 'KC': 12, 'LV': 13, 'LAC': 24,
  'LAR': 14, 'MIA': 15, 'MIN': 16, 'NE': 17, 'NO': 18, 'NYG': 19,
  'NYJ': 20, 'PHI': 21, 'PIT': 23, 'SF': 25, 'SEA': 26, 'TB': 27,
  'TEN': 10, 'WAS': 28
}

interface GameInsert {
  game_id: number
  espn_game_id: string
  season: number
  week: number
  game_date: string
  game_time: string
  home_team_id: number
  away_team_id: number
  home_score: number
  away_score: number
  is_playoff: number
  venue: string
}

async function fetchPlayoffWeek(season: number, week: number): Promise<GameInsert[]> {
  const games: GameInsert[] = []
  
  try {
    // ESPN uses seasontype=3 for postseason
    const url = `${ESPN_BASE_URL}/scoreboard?seasontype=3&week=${week - 18}&dates=${season}`
    console.log(`Fetching: ${url}`)
    
    const response = await fetch(url)
    if (!response.ok) {
      console.log(`No games found for ${season} playoff week ${week}`)
      return games
    }
    
    const data = await response.json()
    
    for (const event of data.events || []) {
      const competition = event.competitions?.[0]
      if (!competition) continue
      
      const homeTeam = competition.competitors?.find((c: any) => c.homeAway === 'home')
      const awayTeam = competition.competitors?.find((c: any) => c.homeAway === 'away')
      
      if (!homeTeam || !awayTeam) continue
      
      const homeAbbr = homeTeam.team?.abbreviation
      const awayAbbr = awayTeam.team?.abbreviation
      
      const homeTeamId = NFL_TEAMS[homeAbbr]
      const awayTeamId = NFL_TEAMS[awayAbbr]
      
      if (!homeTeamId || !awayTeamId) {
        console.log(`Unknown team: ${homeAbbr} or ${awayAbbr}`)
        continue
      }
      
      const gameDate = new Date(event.date)
      
      games.push({
        game_id: parseInt(event.id),
        espn_game_id: event.id,
        season,
        week,
        game_date: gameDate.toISOString().split('T')[0],
        game_time: gameDate.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19),
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_score: parseInt(homeTeam.score) || 0,
        away_score: parseInt(awayTeam.score) || 0,
        is_playoff: 1,
        venue: competition.venue?.fullName || ''
      })
    }
    
  } catch (error: any) {
    console.error(`Error fetching ${season} week ${week}:`, error.message)
  }
  
  return games
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const targetSeason = searchParams.get('season')
  
  try {
    const seasons = targetSeason ? [parseInt(targetSeason)] : [2022, 2023, 2024]
    const playoffWeeks = [19, 20, 21, 22] // Wild Card, Divisional, Conference, Super Bowl
    
    const results: any = {
      total_inserted: 0,
      by_season: {}
    }
    
    for (const season of seasons) {
      results.by_season[season] = { weeks: {}, total: 0 }
      
      for (const week of playoffWeeks) {
        const games = await fetchPlayoffWeek(season, week)
        
        if (games.length > 0) {
          // Insert games
          for (const game of games) {
            // Check if game already exists
            const exists = await clickhouseQuery(`
              SELECT COUNT(*) as cnt FROM nfl_games WHERE game_id = ${game.game_id}
            `)
            
            if ((exists.data?.[0]?.cnt || 0) > 0) {
              console.log(`Game ${game.game_id} already exists, skipping`)
              continue
            }
            
            await clickhouseCommand(`
              INSERT INTO nfl_games (
                game_id, espn_game_id, season, week, game_date, game_time,
                home_team_id, away_team_id, home_score, away_score,
                is_playoff, venue, is_neutral_site
              ) VALUES (
                ${game.game_id}, '${game.espn_game_id}', ${game.season}, ${game.week},
                '${game.game_date}', '${game.game_time}',
                ${game.home_team_id}, ${game.away_team_id},
                ${game.home_score}, ${game.away_score},
                ${game.is_playoff}, '${game.venue.replace(/'/g, "''")}',
                ${game.venue.toLowerCase().includes('super bowl') || game.venue.toLowerCase().includes('neutral') ? 1 : 0}
              )
            `)
            
            results.total_inserted++
            results.by_season[season].total++
          }
          
          results.by_season[season].weeks[week] = games.length
        }
        
        await new Promise(r => setTimeout(r, 200)) // Rate limit
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Playoff games ingested',
      results
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

