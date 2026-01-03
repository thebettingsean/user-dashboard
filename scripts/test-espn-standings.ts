#!/usr/bin/env tsx

/**
 * Test ESPN Standings API for division/conference data
 */

async function testNHLStandings() {
  console.log('\n🏒 NHL STANDINGS API')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const response = await fetch('https://site.web.api.espn.com/apis/v2/sports/hockey/nhl/standings')
  const data = await response.json()
  
  console.log('\n📦 Structure:')
  console.log(JSON.stringify(data, null, 2).substring(0, 3000))
}

async function testCFBStandings() {
  console.log('\n\n🏈 CFB STANDINGS API')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const response = await fetch('https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings?group=80')
  const data = await response.json()
  
  console.log('\n📦 Structure:')
  console.log(JSON.stringify(data, null, 2).substring(0, 3000))
}

async function testIndividualTeam() {
  console.log('\n\n🏒 NHL INDIVIDUAL TEAM API')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/1')
  const data = await response.json()
  
  console.log('\n📦 Full Team Data:')
  console.log(JSON.stringify(data, null, 2))
}

async function main() {
  await testNHLStandings()
  await testCFBStandings()
  await testIndividualTeam()
}

main().catch(console.error)

