#!/usr/bin/env tsx

/**
 * Fix specific NHL team issues in ClickHouse
 * 
 * FIXES:
 * 1. Delete duplicate St. Louis Blues (team_id 64230, keep 19)
 * 2. Delete duplicate Montreal (keep team_id 10)
 * 3. Update Seattle Kraken conference to "West"
 * 4. Update Utah Mammoth conference to "West"
 */

const CLICKHOUSE_HOST = 'https://queries.clickhouse.cloud/service/a54845b1-196e-4d49-9972-3cd55e6766b1/run'
const CLICKHOUSE_KEY_ID = 'NhCacNZ17p6tH1xv5VcZ'
const CLICKHOUSE_KEY_SECRET = '4b1dxwoWH7vdq5hczTJUJjepfko718M8PfiQen8xWP'

async function queryClickHouse(query: string) {
  const auth = Buffer.from(`${CLICKHOUSE_KEY_ID}:${CLICKHOUSE_KEY_SECRET}`).toString('base64')
  
  const url = `${CLICKHOUSE_HOST}?format=JSONEachRow`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ClickHouse query failed: ${response.status} ${errorText}`)
  }

  const text = await response.text()
  
  // Parse JSONEachRow format (one JSON object per line)
  const lines = text.trim().split('\n').filter(Boolean)
  return lines.length > 0 ? lines.map(line => JSON.parse(line)) : []
}

async function executeClickHouse(query: string) {
  const auth = Buffer.from(`${CLICKHOUSE_KEY_ID}:${CLICKHOUSE_KEY_SECRET}`).toString('base64')
  
  const response = await fetch(CLICKHOUSE_HOST, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ClickHouse command failed: ${response.status} ${errorText}`)
  }
}

async function main() {
  console.log('🏒 FIXING NHL TEAM ISSUES...\n')

  // First, let's see what we have
  console.log('📊 CURRENT NHL TEAMS:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  const nhlTeams = await queryClickHouse(`
    SELECT team_id, espn_team_id, name, abbreviation, conference
    FROM teams
    WHERE sport = 'nhl'
    ORDER BY name
  `)

  console.log(`Total: ${nhlTeams.length} teams\n`)

  // Find duplicates
  const stLouisTeams = nhlTeams.filter((t: any) => t.name.includes('Louis'))
  const montrealTeams = nhlTeams.filter((t: any) => t.name.includes('Montr'))
  const krakenTeams = nhlTeams.filter((t: any) => t.name.includes('Kraken'))
  const utahTeams = nhlTeams.filter((t: any) => t.name.includes('Utah') || t.name.includes('Mammoth'))

  console.log('🔍 St. Louis Blues:')
  stLouisTeams.forEach((t: any) => {
    console.log(`   - team_id: ${t.team_id}, espn_team_id: ${t.espn_team_id}, name: "${t.name}", abbrev: ${t.abbreviation}, conference: "${t.conference}"`)
  })

  console.log('\n🔍 Montreal:')
  montrealTeams.forEach((t: any) => {
    console.log(`   - team_id: ${t.team_id}, espn_team_id: ${t.espn_team_id}, name: "${t.name}", abbrev: ${t.abbreviation}, conference: "${t.conference}"`)
  })

  console.log('\n🔍 Seattle Kraken:')
  krakenTeams.forEach((t: any) => {
    console.log(`   - team_id: ${t.team_id}, espn_team_id: ${t.espn_team_id}, name: "${t.name}", conference: "${t.conference}"`)
  })

  console.log('\n🔍 Utah:')
  utahTeams.forEach((t: any) => {
    console.log(`   - team_id: ${t.team_id}, espn_team_id: ${t.espn_team_id}, name: "${t.name}", conference: "${t.conference}"`)
  })

  console.log('\n\n🛠️  APPLYING FIXES...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // FIX 1: Delete St. Louis Blues duplicate (team_id 64230)
  if (stLouisTeams.some((t: any) => t.team_id === 64230)) {
    console.log('1️⃣  Deleting St. Louis Blues duplicate (team_id 64230)...')
    await executeClickHouse(`
      ALTER TABLE teams 
      DELETE WHERE team_id = 64230 AND sport = 'nhl'
    `)
    console.log('   ✅ Deleted!\n')
  } else {
    console.log('1️⃣  St. Louis Blues duplicate (64230) not found (already deleted?)\n')
  }

  // FIX 2: Delete Montreal duplicate (keep team_id 10)
  const montrealDuplicates = montrealTeams.filter((t: any) => t.team_id !== 10)
  if (montrealDuplicates.length > 0) {
    console.log('2️⃣  Deleting Montreal duplicate(s) (keeping team_id 10)...')
    for (const team of montrealDuplicates) {
      await executeClickHouse(`
        ALTER TABLE teams 
        DELETE WHERE team_id = ${team.team_id} AND sport = 'nhl'
      `)
      console.log(`   ✅ Deleted team_id ${team.team_id} (${team.name})`)
    }
    console.log()
  } else {
    console.log('2️⃣  Montreal duplicates not found (already deleted?)\n')
  }

  // FIX 3: Update Seattle Kraken conference to "West"
  const kraken = krakenTeams.find((t: any) => t.conference !== 'West')
  if (kraken) {
    console.log('3️⃣  Updating Seattle Kraken conference to "West"...')
    await executeClickHouse(`
      ALTER TABLE teams 
      UPDATE conference = 'West'
      WHERE team_id = ${kraken.team_id} AND sport = 'nhl'
    `)
    console.log('   ✅ Updated!\n')
  } else {
    console.log('3️⃣  Seattle Kraken already has "West" conference\n')
  }

  // FIX 4: Update Utah Mammoth conference to "West"
  const utah = utahTeams.find((t: any) => t.conference !== 'West')
  if (utah) {
    console.log('4️⃣  Updating Utah Mammoth conference to "West"...')
    await executeClickHouse(`
      ALTER TABLE teams 
      UPDATE conference = 'West'
      WHERE team_id = ${utah.team_id} AND sport = 'nhl'
    `)
    console.log('   ✅ Updated!\n')
  } else {
    console.log('4️⃣  Utah Mammoth already has "West" conference\n')
  }

  // Verify fixes
  console.log('\n📊 AFTER FIXES:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const nhlTeamsAfter = await queryClickHouse(`
    SELECT team_id, espn_team_id, name, abbreviation, conference
    FROM teams
    WHERE sport = 'nhl'
    ORDER BY name
  `)

  console.log(`Total: ${nhlTeamsAfter.length} teams (should be 32)\n`)

  const stLouisAfter = nhlTeamsAfter.filter((t: any) => t.name.includes('Louis'))
  const montrealAfter = nhlTeamsAfter.filter((t: any) => t.name.includes('Montr'))
  const krakenAfter = nhlTeamsAfter.filter((t: any) => t.name.includes('Kraken'))
  const utahAfter = nhlTeamsAfter.filter((t: any) => t.name.includes('Utah') || t.name.includes('Mammoth'))

  console.log('✅ St. Louis Blues:')
  stLouisAfter.forEach((t: any) => {
    console.log(`   - team_id: ${t.team_id}, conference: "${t.conference}"`)
  })

  console.log('\n✅ Montreal:')
  montrealAfter.forEach((t: any) => {
    console.log(`   - team_id: ${t.team_id}, conference: "${t.conference}"`)
  })

  console.log('\n✅ Seattle Kraken:')
  krakenAfter.forEach((t: any) => {
    console.log(`   - team_id: ${t.team_id}, conference: "${t.conference}"`)
  })

  console.log('\n✅ Utah:')
  utahAfter.forEach((t: any) => {
    console.log(`   - team_id: ${t.team_id}, conference: "${t.conference}"`)
  })

  // Check for any teams missing conferences
  const missingConference = nhlTeamsAfter.filter((t: any) => !t.conference || t.conference === '')
  if (missingConference.length > 0) {
    console.log('\n\n⚠️  Teams still missing conferences:')
    missingConference.forEach((t: any) => {
      console.log(`   - ${t.name} (team_id: ${t.team_id})`)
    })
  } else {
    console.log('\n\n🎉 ALL NHL TEAMS NOW HAVE CONFERENCES!')
  }

  console.log('\n✅ ALL FIXES COMPLETE!')
}

main().catch(console.error)

