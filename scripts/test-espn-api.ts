#!/usr/bin/env tsx

/**
 * Test ESPN API to see actual structure
 */

async function testNHL() {
  console.log('\n🏒 NHL API STRUCTURE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams?limit=5')
  const data = await response.json()
  
  console.log('\n📦 Full Structure:')
  console.log(JSON.stringify(data, null, 2).substring(0, 2000))
  
  if (data.sports?.[0]?.leagues?.[0]?.teams?.[0]) {
    const firstTeam = data.sports[0].leagues[0].teams[0].team
    console.log('\n🔍 First Team Detail:')
    console.log(JSON.stringify(firstTeam, null, 2))
  }
}

async function testCFB() {
  console.log('\n\n🏈 CFB API STRUCTURE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=5&groups=80')
  const data = await response.json()
  
  console.log('\n📦 Full Structure:')
  console.log(JSON.stringify(data, null, 2).substring(0, 2000))
  
  if (data.sports?.[0]?.leagues?.[0]?.teams?.[0]) {
    const firstTeam = data.sports[0].leagues[0].teams[0].team
    console.log('\n🔍 First Team Detail:')
    console.log(JSON.stringify(firstTeam, null, 2))
  }
}

async function testNCAAB() {
  console.log('\n\n🏀 NCAAB API STRUCTURE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=5')
  const data = await response.json()
  
  console.log('\n📦 Full Structure:')
  console.log(JSON.stringify(data, null, 2).substring(0, 2000))
  
  if (data.sports?.[0]?.leagues?.[0]?.teams?.[0]) {
    const firstTeam = data.sports[0].leagues[0].teams[0].team
    console.log('\n🔍 First Team Detail:')
    console.log(JSON.stringify(firstTeam, null, 2))
  }
}

async function main() {
  await testNHL()
  await testCFB()
  await testNCAAB()
}

main().catch(console.error)

