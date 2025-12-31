import { clickhouseQuery } from '../lib/clickhouse'

async function check() {
  // Check CBB game team_ids
  const cbbGames = await clickhouseQuery<any>(`
    SELECT game_id, home_team_id, away_team_id FROM games 
    WHERE sport = 'cbb' AND game_time >= now() 
    LIMIT 5
  `)
  console.log('CBB Game team_ids:', cbbGames.data)

  // Check NCAAB team_ids in teams table
  const ncaabTeams = await clickhouseQuery<any>(`
    SELECT team_id, name FROM teams 
    WHERE sport = 'ncaab' 
    LIMIT 5
  `)
  console.log('NCAAB Teams:', ncaabTeams.data)

  // Check if any of the CBB team_ids exist in teams table
  if (cbbGames.data?.length) {
    const ids = [...new Set([...cbbGames.data.map((g: any) => g.home_team_id), ...cbbGames.data.map((g: any) => g.away_team_id)])]
    const matchCheck = await clickhouseQuery<any>(`
      SELECT team_id, name, sport FROM teams 
      WHERE team_id IN (${ids.join(',')})
    `)
    console.log('Teams matching CBB game team_ids:', matchCheck.data)
  }

  // Check Panthers game time
  const panthers = await clickhouseQuery<any>(`
    SELECT game_id, game_time, 
           toTimeZone(game_time, 'America/New_York') as game_time_est,
           home_team_id, away_team_id
    FROM games 
    WHERE sport = 'nfl' 
      AND (home_team_id = 29 OR away_team_id = 29)
      AND game_time >= now()
  `)
  console.log('Panthers game:', panthers.data)
}
check()

