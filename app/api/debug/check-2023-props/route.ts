import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // 1. Get game count by month for 2023 season
    const gamesPerMonth = await clickhouseQuery(`
      SELECT 
        toYYYYMM(game_date) as year_month,
        formatDateTime(MIN(game_date), '%Y-%m-%d') as first_game,
        formatDateTime(MAX(game_date), '%Y-%m-%d') as last_game,
        COUNT(*) as total_games,
        groupArray(toString(game_id)) as game_ids
      FROM nfl_games FINAL
      WHERE season = 2023
        AND is_playoff = 0
      GROUP BY year_month
      ORDER BY year_month
    `)
    
    // 2. Check prop lines by month (joining with games to get month)
    const propsPerMonth = await clickhouseQuery(`
      SELECT 
        toYYYYMM(g.game_date) as year_month,
        COUNT(DISTINCT p.game_id) as games_with_prop_lines,
        COUNT(*) as total_prop_lines,
        COUNT(DISTINCT p.player_name) as unique_players
      FROM nfl_prop_lines p FINAL
      INNER JOIN nfl_games g FINAL ON toString(g.game_id) = p.game_id
      WHERE g.season = 2023
        AND g.is_playoff = 0
      GROUP BY year_month
      ORDER BY year_month
    `)
    
    // 3. Check prop snapshots by month (historical lines)
    const snapshotsPerMonth = await clickhouseQuery(`
      SELECT 
        toYYYYMM(g.game_date) as year_month,
        COUNT(DISTINCT s.game_id) as games_with_snapshots,
        COUNT(*) as total_snapshots
      FROM nfl_prop_line_snapshots s
      INNER JOIN nfl_games g FINAL ON toString(g.game_id) = s.game_id
      WHERE g.season = 2023
        AND g.is_playoff = 0
      GROUP BY year_month
      ORDER BY year_month
    `)
    
    // 4. Combine data to show coverage
    const monthlyReport: any[] = []
    for (const month of (gamesPerMonth.data || [])) {
      const propLines = (propsPerMonth.data || []).find((p: any) => p.year_month === month.year_month)
      const propSnapshots = (snapshotsPerMonth.data || []).find((s: any) => s.year_month === month.year_month)
      
      monthlyReport.push({
        month: month.year_month,
        date_range: `${month.first_game} to ${month.last_game}`,
        total_games: month.total_games,
        games_with_prop_lines: propLines?.games_with_prop_lines || 0,
        total_prop_lines: propLines?.total_prop_lines || 0,
        unique_players: propLines?.unique_players || 0,
        games_with_snapshots: propSnapshots?.games_with_snapshots || 0,
        total_snapshots: propSnapshots?.total_snapshots || 0,
        prop_coverage_pct: propLines 
          ? Math.round((propLines.games_with_prop_lines / month.total_games) * 100)
          : 0
      })
    }
    
    // 5. Get sample of games WITHOUT props from missing months
    const gamesWithoutProps = await clickhouseQuery(`
      SELECT 
        g.game_id,
        g.game_date,
        g.week
      FROM nfl_games g FINAL
      LEFT JOIN (
        SELECT DISTINCT game_id 
        FROM nfl_prop_lines FINAL
      ) pl ON toString(g.game_id) = pl.game_id
      WHERE g.season = 2023
        AND g.is_playoff = 0
        AND pl.game_id IS NULL
      ORDER BY g.game_date
      LIMIT 20
    `)
    
    return NextResponse.json({
      success: true,
      summary: {
        total_2023_games: (gamesPerMonth.data || []).reduce((sum: number, m: any) => sum + m.total_games, 0),
        total_games_with_props: monthlyReport.reduce((sum, m) => sum + m.games_with_prop_lines, 0),
        total_games_without_props: monthlyReport.reduce((sum, m) => sum + (m.total_games - m.games_with_prop_lines), 0)
      },
      monthly_report: monthlyReport,
      sample_games_without_props: gamesWithoutProps.data || []
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

