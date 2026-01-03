/**
 * Test Odds API for a specific date to see format
 */

const ODDS_API_KEY = process.env.ODDS_API_KEY

async function testDate(date: string) {
  const url = `https://api.the-odds-api.com/v4/historical/sports/basketball_nba/events?apiKey=${ODDS_API_KEY}&date=${date}T12:00:00Z`
  
  console.log(`Testing: ${url}`)
  
  try {
    const response = await fetch(url)
    console.log(`Status: ${response.status}`)
    
    if (!response.ok) {
      const text = await response.text()
      console.log(`Error: ${text}`)
      return
    }
    
    const data = await response.json()
    console.log(`Response:`, JSON.stringify(data, null, 2).substring(0, 500))
    console.log(`\nEvents found: ${data.data?.length || 0}`)
    
    if (data.data && data.data.length > 0) {
      console.log(`\nFirst event:`, {
        id: data.data[0].id,
        home_team: data.data[0].home_team,
        away_team: data.data[0].away_team,
        commence_time: data.data[0].commence_time
      })
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

// Test a recent date that should have data
testDate('2025-11-15')

