import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const CLICKHOUSE_HOST = process.env.CLICKHOUSE_HOST
const CLICKHOUSE_KEY_ID = process.env.CLICKHOUSE_KEY_ID
const CLICKHOUSE_KEY_SECRET = process.env.CLICKHOUSE_KEY_SECRET

async function clickhouseQuery(query: string) {
  const response = await fetch(CLICKHOUSE_HOST!, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${CLICKHOUSE_KEY_ID}:${CLICKHOUSE_KEY_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: query + ' FORMAT JSON' })
  })
  return response.json()
}

async function main() {
  // Check for Michigan teams
  console.log('=== CFB Teams containing "Michigan" ===')
  const michigan = await clickhouseQuery(`
    SELECT team_id, name, abbreviation, logo_url 
    FROM teams 
    WHERE sport = 'cfb' AND lower(name) LIKE '%michigan%'
  `)
  console.log(michigan.data)

  // Check for Texas teams
  console.log('\n=== CFB Teams containing "Texas" ===')
  const texas = await clickhouseQuery(`
    SELECT team_id, name, abbreviation, logo_url 
    FROM teams 
    WHERE sport = 'cfb' AND lower(name) LIKE '%texas%'
  `)
  console.log(texas.data)

  // Check for Iowa teams
  console.log('\n=== CFB Teams containing "Iowa" ===')
  const iowa = await clickhouseQuery(`
    SELECT team_id, name, abbreviation, logo_url 
    FROM teams 
    WHERE sport = 'cfb' AND lower(name) LIKE '%iowa%'
  `)
  console.log(iowa.data)

  // Check for Utah teams
  console.log('\n=== CFB Teams containing "Utah" ===')
  const utah = await clickhouseQuery(`
    SELECT team_id, name, abbreviation, logo_url 
    FROM teams 
    WHERE sport = 'cfb' AND lower(name) LIKE '%utah%'
  `)
  console.log(utah.data)

  // Check actual games for today
  console.log('\n=== CFB Games today with team_ids ===')
  const games = await clickhouseQuery(`
    SELECT g.game_id, g.home_team_id, g.away_team_id,
           ht.name as home_name, at.name as away_name
    FROM games g
    LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'cfb'
    LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'cfb'
    WHERE g.sport = 'cfb' 
      AND toDate(g.game_time) = today()
    LIMIT 10
  `)
  console.log(games.data)
}

main()

