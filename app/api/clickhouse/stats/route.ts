import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Get counts and sample data
    const queries = {
      // Team counts
      nfl_teams: await clickhouseQuery("SELECT COUNT(*) as count FROM teams WHERE sport = 'nfl'"),
      nba_teams: await clickhouseQuery("SELECT COUNT(*) as count FROM teams WHERE sport = 'nba'"),
      
      // Player counts
      nfl_players: await clickhouseQuery("SELECT COUNT(*) as count FROM players WHERE sport = 'nfl'"),
      nba_players: await clickhouseQuery("SELECT COUNT(*) as count FROM players WHERE sport = 'nba'"),
      
      // Injured players
      nfl_injured: await clickhouseQuery("SELECT COUNT(*) as count FROM players WHERE sport = 'nfl' AND injury_status != 'healthy'"),
      nba_injured: await clickhouseQuery("SELECT COUNT(*) as count FROM players WHERE sport = 'nba' AND injury_status != 'healthy'"),
      
      // Sample NFL team
      sample_nfl_team: await clickhouseQuery("SELECT name, abbreviation, division, conference, logo_url FROM teams WHERE sport = 'nfl' LIMIT 1"),
      
      // Sample NFL players with injuries
      sample_nfl_injured: await clickhouseQuery("SELECT name, position, injury_status FROM players WHERE sport = 'nfl' AND injury_status != 'healthy' LIMIT 5"),
      
      // Sample NBA team
      sample_nba_team: await clickhouseQuery("SELECT name, abbreviation, division, conference, logo_url FROM teams WHERE sport = 'nba' LIMIT 1"),
      
      // Sample NBA players with injuries
      sample_nba_injured: await clickhouseQuery("SELECT name, position, injury_status FROM players WHERE sport = 'nba' AND injury_status != 'healthy' LIMIT 5"),
      
      // Players by position (NFL)
      nfl_by_position: await clickhouseQuery("SELECT position, COUNT(*) as count FROM players WHERE sport = 'nfl' GROUP BY position ORDER BY count DESC"),
      
      // Players by position (NBA)
      nba_by_position: await clickhouseQuery("SELECT position, COUNT(*) as count FROM players WHERE sport = 'nba' GROUP BY position ORDER BY count DESC")
    }

    return NextResponse.json({
      success: true,
      summary: {
        nfl: {
          teams: queries.nfl_teams[0]?.count || 0,
          players: queries.nfl_players[0]?.count || 0,
          injured: queries.nfl_injured[0]?.count || 0,
          by_position: queries.nfl_by_position
        },
        nba: {
          teams: queries.nba_teams[0]?.count || 0,
          players: queries.nba_players[0]?.count || 0,
          injured: queries.nba_injured[0]?.count || 0,
          by_position: queries.nba_by_position
        }
      },
      samples: {
        nfl_team: queries.sample_nfl_team[0] || null,
        nfl_injured_players: queries.sample_nfl_injured,
        nba_team: queries.sample_nba_team[0] || null,
        nba_injured_players: queries.sample_nba_injured
      }
    })

  } catch (error: any) {
    console.error('[Stats] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

