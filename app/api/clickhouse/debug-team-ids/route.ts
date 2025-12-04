import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Get unique team IDs from nfl_games
    const gamesTeamIds = await clickhouseQuery(`
      SELECT DISTINCT home_team_id as team_id FROM nfl_games
      UNION ALL
      SELECT DISTINCT away_team_id as team_id FROM nfl_games
    `)
    
    // Get team IDs from teams table for NFL
    const teamsTableIds = await clickhouseQuery(`
      SELECT team_id, espn_team_id, name, division, conference 
      FROM teams 
      WHERE sport = 'nfl'
      ORDER BY team_id
    `)
    
    const gameIds = [...new Set(gamesTeamIds.data?.map((r: any) => r.team_id))].sort((a: number, b: number) => a - b)
    const teamIds = teamsTableIds.data?.map((t: any) => t.team_id).sort((a: number, b: number) => a - b)
    
    // Check for mismatches
    const inGamesNotInTeams = gameIds.filter((id: number) => !teamIds?.includes(id))
    const inTeamsNotInGames = teamIds?.filter((id: number) => !gameIds.includes(id))
    
    return NextResponse.json({
      games_team_ids: gameIds,
      teams_table_ids: teamIds,
      mismatches: {
        in_games_not_in_teams: inGamesNotInTeams,
        in_teams_not_in_games: inTeamsNotInGames
      },
      teams_sample: teamsTableIds.data?.slice(0, 10)
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

