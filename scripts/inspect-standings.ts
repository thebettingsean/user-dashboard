#!/usr/bin/env tsx

async function inspectNHL() {
  const response = await fetch('https://site.web.api.espn.com/apis/v2/sports/hockey/nhl/standings')
  const data = await response.json()
  
  console.log('🏒 NHL STANDINGS STRUCTURE\n')
  console.log(`Top level has ${data.children?.length || 0} children (conferences)\n`)
  
  if (data.children?.[0]) {
    const firstConf = data.children[0]
    console.log(`First conference: ${firstConf.name} (${firstConf.abbreviation})`)
    console.log(`Has ${firstConf.children?.length || 0} children (divisions)\n`)
    
    if (firstConf.children?.[0]) {
      const firstDiv = firstConf.children[0]
      console.log(`First division: ${firstDiv.name} (${firstDiv.abbreviation})`)
      console.log(`Has ${firstDiv.standings?.entries?.length || 0} teams\n`)
      
      if (firstDiv.standings?.entries?.[0]) {
        const firstTeam = firstDiv.standings.entries[0].team
        console.log(`First team: ${firstTeam.displayName} (ID: ${firstTeam.id})`)
      }
    }
  }
}

async function inspectNCAAB() {
  const response = await fetch('https://site.web.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/standings')
  const data = await response.json()
  
  console.log('\n\n🏀 NCAAB STANDINGS STRUCTURE\n')
  console.log(`Top level has ${data.children?.length || 0} children\n`)
  
  if (data.children?.[0]) {
    const firstDiv = data.children[0]
    console.log(`First level: ${firstDiv.name} (${firstDiv.abbreviation || 'no abbrev'})`)
    console.log(`Has ${firstDiv.children?.length || 0} children (conferences)\n`)
    
    if (firstDiv.children?.[0]) {
      const firstConf = firstDiv.children[0]
      console.log(`First conference: ${firstConf.name} (${firstConf.abbreviation || 'no abbrev'})`)
      console.log(`Has ${firstConf.standings?.entries?.length || 0} teams\n`)
      
      if (firstConf.standings?.entries?.[0]) {
        const firstTeam = firstConf.standings.entries[0].team
        console.log(`First team: ${firstTeam.displayName} (ID: ${firstTeam.id})`)
      }
    }
  }
}

inspectNHL().then(inspectNCAAB).catch(console.error)

