#!/usr/bin/env tsx

/**
 * FIX ALL TEAMS TABLE ISSUES
 * 
 * This script fixes 6 major issues:
 * 1. Convert 'cbb' → 'ncaab' (136 teams)
 * 2. Delete duplicate/bad NHL teams (2 teams)
 * 3. Backfill NHL divisions & conferences (34 teams)
 * 4. Backfill CFB conferences (743 teams)
 * 5. Backfill NCAAB conferences (362 teams)
 * 6. Backfill CFB missing logos (80 teams)
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

// ====================================
// FIX 1: Convert 'cbb' → 'ncaab'
// ====================================
async function fix1_convertCbbToNcaab() {
  console.log('\n1️⃣  CONVERTING CBB → NCAAB')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const cbbTeams = await queryClickHouse(`
    SELECT 
      team_id, espn_team_id, sport, name, abbreviation, city, 
      division, conference, logo_url, primary_color, secondary_color
    FROM teams
    WHERE sport = 'cbb'
  `)

  console.log(`Found ${cbbTeams.length} teams with sport='cbb'`)

  if (cbbTeams.length === 0) {
    console.log('✅ No teams to convert!')
    return
  }

  console.log('Converting cbb → ncaab (DELETE + INSERT)...')
  
  // Since sport is a key column, we need to DELETE the old records and INSERT new ones
  for (const team of cbbTeams) {
    // Delete old record
    await executeClickHouse(`
      ALTER TABLE teams 
      DELETE WHERE team_id = ${team.team_id} AND sport = 'cbb'
    `)

    // Insert new record with sport='ncaab'
    await executeClickHouse(`
      INSERT INTO teams (
        team_id, espn_team_id, sport, name, abbreviation, city,
        division, conference, logo_url, primary_color, secondary_color
      ) VALUES (
        ${team.team_id},
        ${team.espn_team_id},
        'ncaab',
        '${team.name.replace(/'/g, "\\'")}',
        '${team.abbreviation.replace(/'/g, "\\'")}',
        '${team.city.replace(/'/g, "\\'")}',
        '${team.division.replace(/'/g, "\\'")}',
        '${team.conference.replace(/'/g, "\\'")}',
        '${team.logo_url.replace(/'/g, "\\'")}',
        '${team.primary_color.replace(/'/g, "\\'")}',
        '${team.secondary_color.replace(/'/g, "\\'")}'
      )
    `)

    if (cbbTeams.indexOf(team) % 50 === 0) {
      console.log(`  ... ${cbbTeams.indexOf(team) + 1} / ${cbbTeams.length}`)
    }
  }

  console.log(`✅ Converted ${cbbTeams.length} teams from 'cbb' to 'ncaab'`)
}

// ====================================
// FIX 2: Delete duplicate/bad NHL teams
// ====================================
async function fix2_deleteBadNHLTeams() {
  console.log('\n2️⃣  DELETING DUPLICATE/BAD NHL TEAMS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const badTeamIds = [64229, 64230] // St Louis Blues duplicate, Montréal Canadiens duplicate

  console.log('Deleting bad team records:')
  console.log('  - team_id 64229: St Louis Blues (duplicate)')
  console.log('  - team_id 64230: Montréal Canadiens (duplicate)')

  await executeClickHouse(`
    ALTER TABLE teams 
    DELETE WHERE team_id IN (64229, 64230)
  `)

  console.log('✅ Deleted 2 duplicate NHL teams')
}

// ====================================
// FIX 3: Backfill NHL divisions & conferences
// ====================================
async function fix3_backfillNHLDivisionsConferences() {
  console.log('\n3️⃣  BACKFILLING NHL DIVISIONS & CONFERENCES')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  console.log('Fetching NHL standings from ESPN...')
  const response = await fetch('https://site.web.api.espn.com/apis/v2/sports/hockey/nhl/standings')
  const data = await response.json()

  if (!data.children) {
    throw new Error('Failed to fetch NHL standings from ESPN')
  }

  const teamMap = new Map<string, { division: string; conference: string }>()

  // Parse standings structure: League > Conferences > Teams
  // Note: NHL standings don't include divisions, only conferences
  for (const conference of data.children) {
    const conferenceName = conference.abbreviation || conference.name
    
    if (conference.standings?.entries) {
      for (const entry of conference.standings.entries) {
        const team = entry.team
        teamMap.set(team.id, {
          division: '', // NHL standings API doesn't include division info
          conference: conferenceName
        })
      }
    }
  }

  console.log(`Mapped ${teamMap.size} NHL teams with division/conference data`)

  let updated = 0
  for (const [espnId, info] of teamMap.entries()) {
    await executeClickHouse(`
      ALTER TABLE teams 
      UPDATE 
        division = '${info.division.replace(/'/g, "\\'")}',
        conference = '${info.conference.replace(/'/g, "\\'")}'
      WHERE espn_team_id = ${espnId} AND sport = 'nhl'
    `)
    updated++
    console.log(`  ✓ Team ID ${espnId} → ${info.division} (${info.conference})`)
  }

  console.log(`✅ Updated ${updated} NHL teams with divisions & conferences`)
}

// ====================================
// FIX 4: Backfill CFB conferences
// ====================================
async function fix4_backfillCFBConferences() {
  console.log('\n4️⃣  BACKFILLING CFB CONFERENCES')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  console.log('Fetching CFB standings from ESPN...')
  const response = await fetch('https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings?group=80')
  const data = await response.json()

  if (!data.children) {
    throw new Error('Failed to fetch CFB standings from ESPN')
  }

  const teamMap = new Map<string, string>()

  // Parse standings structure: FBS > Conferences > Teams
  for (const conference of data.children) {
    const conferenceName = conference.abbreviation || conference.shortName || conference.name
    
    if (conference.standings?.entries) {
      for (const entry of conference.standings.entries) {
        const team = entry.team
        teamMap.set(team.id, conferenceName)
      }
    }
  }

  console.log(`Mapped ${teamMap.size} CFB teams with conference data`)

  let updated = 0
  for (const [espnId, conference] of teamMap.entries()) {
    await executeClickHouse(`
      ALTER TABLE teams 
      UPDATE conference = '${conference.replace(/'/g, "\\'")}'
      WHERE espn_team_id = ${espnId} AND sport = 'cfb'
    `)
    updated++
    if (updated % 50 === 0) {
      console.log(`  ... ${updated} teams updated`)
    }
  }

  console.log(`✅ Updated ${updated} CFB teams with conferences`)
}

// ====================================
// FIX 5: Backfill NCAAB conferences
// ====================================
async function fix5_backfillNCAABConferences() {
  console.log('\n5️⃣  BACKFILLING NCAAB CONFERENCES')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  console.log('Fetching NCAAB standings from ESPN...')
  const response = await fetch('https://site.web.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/standings')
  const data = await response.json()

  if (!data.children) {
    throw new Error('Failed to fetch NCAAB standings from ESPN')
  }

  const teamMap = new Map<string, string>()

  // Parse standings structure: Conferences are at top level
  for (const conference of data.children) {
    const conferenceName = conference.abbreviation || conference.shortName || conference.name
    
    if (conference.standings?.entries) {
      for (const entry of conference.standings.entries) {
        const team = entry.team
        teamMap.set(team.id, conferenceName)
      }
    }
  }

  console.log(`Mapped ${teamMap.size} NCAAB teams with conference data`)

  let updated = 0
  for (const [espnId, conference] of teamMap.entries()) {
    await executeClickHouse(`
      ALTER TABLE teams 
      UPDATE conference = '${conference.replace(/'/g, "\\'")}'
      WHERE espn_team_id = ${espnId} AND sport = 'ncaab'
    `)
    updated++
    if (updated % 50 === 0) {
      console.log(`  ... ${updated} teams updated`)
    }
  }

  console.log(`✅ Updated ${updated} NCAAB teams with conferences`)
}

// ====================================
// FIX 6: Backfill CFB missing logos
// ====================================
async function fix6_backfillCFBLogos() {
  console.log('\n6️⃣  BACKFILLING CFB MISSING LOGOS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const teamsWithoutLogos = await queryClickHouse(`
    SELECT team_id, espn_team_id, name
    FROM teams
    WHERE sport = 'cfb' AND (logo_url = '' OR logo_url IS NULL)
  `)

  console.log(`Found ${teamsWithoutLogos.length} CFB teams without logos`)

  if (teamsWithoutLogos.length === 0) {
    console.log('✅ All CFB teams have logos!')
    return
  }

  console.log('Fetching CFB teams from ESPN...')
  const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=300')
  const data = await response.json()

  if (!data.sports?.[0]?.leagues?.[0]?.teams) {
    throw new Error('Failed to fetch CFB teams from ESPN')
  }

  const espnTeams = data.sports[0].leagues[0].teams
  const espnLogoMap = new Map()

  for (const teamData of espnTeams) {
    const team = teamData.team
    const logo = team.logos?.[0]?.href || ''
    if (logo) {
      espnLogoMap.set(team.id, logo)
    }
  }

  let updated = 0
  for (const team of teamsWithoutLogos) {
    const logo = espnLogoMap.get(team.espn_team_id)
    if (logo) {
      await executeClickHouse(`
        ALTER TABLE teams 
        UPDATE logo_url = '${logo.replace(/'/g, "\\'")}'
        WHERE team_id = ${team.team_id}
      `)
      updated++
      console.log(`  ✓ ${team.name}`)
    }
  }

  console.log(`✅ Updated ${updated} CFB teams with logos`)
}

// ====================================
// MAIN
// ====================================
async function main() {
  console.log('🛠️  FIXING ALL TEAMS TABLE ISSUES...\n')

  try {
    await fix1_convertCbbToNcaab()
    await fix2_deleteBadNHLTeams()
    await fix3_backfillNHLDivisionsConferences()
    await fix4_backfillCFBConferences()
    await fix5_backfillNCAABConferences()
    await fix6_backfillCFBLogos()

    console.log('\n\n✅ ALL FIXES COMPLETE!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Run the diagnostic script again to verify:')
    console.log('  npx tsx scripts/check-teams-table.ts')
  } catch (error) {
    console.error('\n❌ ERROR:', error)
    throw error
  }
}

main().catch(console.error)

