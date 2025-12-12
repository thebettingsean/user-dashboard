import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // List all tables
    const tables = await clickhouseQuery('SHOW TABLES')
    
    // Get sample from players
    const playersSample = await clickhouseQuery(`
      SELECT name, position, team_id 
      FROM players 
      WHERE sport = 'nfl' AND position = 'QB' 
      LIMIT 5
    `)
    
    // Get sample from teams
    const teamsSample = await clickhouseQuery(`
      SELECT team_id, espn_team_id, name, city, abbreviation 
      FROM teams 
      WHERE sport = 'nfl' 
      LIMIT 10
    `)
    
    // Get sample from nfl_prop_lines
    const propsSample = await clickhouseQuery(`
      SELECT game_id, espn_game_id, player_name, prop_type, line, home_team, away_team 
      FROM nfl_prop_lines 
      WHERE prop_type = 'player_pass_yds'
      LIMIT 5
    `)
    
    // Get sample from nfl_games
    const gamesSample = await clickhouseQuery(`
      SELECT game_id, home_team_id, away_team_id, home_team_name, away_team_name
      FROM nfl_games 
      LIMIT 5
    `)
    
    return NextResponse.json({
      tables: tables.data,
      players: playersSample.data,
      teams: teamsSample.data,
      props: propsSample.data,
      games: gamesSample.data
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

