import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // List all tables
    const tables = await clickhouseQuery('SHOW TABLES')
    
    // Get nfl_games schema
    const gamesSchema = await clickhouseQuery('DESCRIBE nfl_games')
    
    // Get nfl_prop_lines schema
    const propsSchema = await clickhouseQuery('DESCRIBE nfl_prop_lines')
    
    // Get players schema
    const playersSchema = await clickhouseQuery('DESCRIBE players')
    
    // Get teams schema  
    const teamsSchema = await clickhouseQuery('DESCRIBE teams')
    
    // Get sample from nfl_prop_lines
    const propsSample = await clickhouseQuery(`
      SELECT * 
      FROM nfl_prop_lines 
      WHERE prop_type = 'player_pass_yds'
      LIMIT 3
    `)
    
    // Get sample from nfl_games
    const gamesSample = await clickhouseQuery(`
      SELECT *
      FROM nfl_games 
      LIMIT 2
    `)
    
    // Get sample QB from players
    const playersSample = await clickhouseQuery(`
      SELECT * 
      FROM players 
      WHERE sport = 'nfl' AND position = 'QB' 
      LIMIT 3
    `)
    
    // Get sample from teams
    const teamsSample = await clickhouseQuery(`
      SELECT * 
      FROM teams 
      WHERE sport = 'nfl' 
      LIMIT 5
    `)
    
    return NextResponse.json({
      tables: tables.data,
      schemas: {
        nfl_games: gamesSchema.data,
        nfl_prop_lines: propsSchema.data,
        players: playersSchema.data,
        teams: teamsSchema.data
      },
      samples: {
        props: propsSample.data,
        games: gamesSample.data,
        players: playersSample.data,
        teams: teamsSample.data
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

