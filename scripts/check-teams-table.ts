#!/usr/bin/env tsx

/**
 * Direct ClickHouse Teams Table Diagnostic
 * 
 * Checks for:
 * 1. CBB vs NCAAB naming inconsistencies + duplicates
 * 2. NHL teams with missing column data
 * 3. CFB/NCAAB conference accuracy + missing images
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
  return lines.map(line => JSON.parse(line))
}

async function main() {
  console.log('🔍 CHECKING CLICKHOUSE TEAMS TABLE...\n')

  // ====================================
  // 1. CBB vs NCAAB CHECK
  // ====================================
  console.log('1️⃣  COLLEGE BASKETBALL (CBB vs NCAAB)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const cbbTeams = await queryClickHouse(`
    SELECT team_id, espn_team_id, sport, name, abbreviation
    FROM teams
    WHERE sport = 'cbb'
  `)
  
  const ncaabTeams = await queryClickHouse(`
    SELECT team_id, espn_team_id, sport, name, abbreviation
    FROM teams
    WHERE sport = 'ncaab'
  `)

  console.log(`❌ Teams with 'cbb': ${cbbTeams.length}`)
  if (cbbTeams.length > 0) {
    console.log('   These need to be changed to "ncaab":')
    cbbTeams.slice(0, 10).forEach((t: any) => {
      console.log(`   - ${t.name} (${t.abbreviation}) [team_id: ${t.team_id}]`)
    })
    if (cbbTeams.length > 10) {
      console.log(`   ... and ${cbbTeams.length - 10} more`)
    }
  }

  console.log(`✅ Teams with 'ncaab': ${ncaabTeams.length}`)

  // Check for duplicates (same team in both cbb and ncaab)
  const cbbEspnIds = new Set(cbbTeams.map((t: any) => t.espn_team_id))
  const ncaabEspnIds = new Set(ncaabTeams.map((t: any) => t.espn_team_id))
  const duplicates = [...cbbEspnIds].filter(id => ncaabEspnIds.has(id))
  
  if (duplicates.length > 0) {
    console.log(`\n⚠️  DUPLICATES FOUND: ${duplicates.length} teams exist in BOTH 'cbb' and 'ncaab'`)
    for (const espnId of duplicates.slice(0, 5)) {
      const cbbTeam = cbbTeams.find((t: any) => t.espn_team_id === espnId)
      const ncaabTeam = ncaabTeams.find((t: any) => t.espn_team_id === espnId)
      console.log(`   - ${cbbTeam?.name} (ESPN ID: ${espnId})`)
      console.log(`     cbb team_id: ${cbbTeam?.team_id}`)
      console.log(`     ncaab team_id: ${ncaabTeam?.team_id}`)
    }
  } else {
    console.log('\n✅ No duplicates between cbb and ncaab')
  }

  // ====================================
  // 2. NHL MISSING DATA CHECK
  // ====================================
  console.log('\n\n2️⃣  NHL TEAMS - MISSING DATA CHECK')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const nhlTeamsAll = await queryClickHouse(`
    SELECT 
      team_id,
      espn_team_id,
      name,
      abbreviation,
      city,
      division,
      conference,
      logo_url,
      primary_color,
      secondary_color
    FROM teams
    WHERE sport = 'nhl'
    ORDER BY name
  `)

  console.log(`Total NHL teams: ${nhlTeamsAll.length}`)

  // Check each team for missing columns
  const nhlMissing = nhlTeamsAll.filter((t: any) => {
    return !t.name || !t.abbreviation || !t.city || !t.division || 
           !t.conference || !t.logo_url || !t.primary_color || !t.secondary_color ||
           t.logo_url === '' || t.city === '' || t.division === '' || 
           t.conference === '' || t.primary_color === '' || t.secondary_color === ''
  })

  if (nhlMissing.length > 0) {
    console.log(`\n❌ ${nhlMissing.length} NHL teams with missing data:`)
    nhlMissing.forEach((t: any) => {
      console.log(`\n   ${t.name} (${t.abbreviation})`)
      console.log(`   team_id: ${t.team_id}`)
      console.log(`   espn_team_id: ${t.espn_team_id}`)
      if (!t.city || t.city === '') console.log(`   ❌ Missing: city`)
      if (!t.division || t.division === '') console.log(`   ❌ Missing: division`)
      if (!t.conference || t.conference === '') console.log(`   ❌ Missing: conference`)
      if (!t.logo_url || t.logo_url === '') console.log(`   ❌ Missing: logo_url`)
      if (!t.primary_color || t.primary_color === '') console.log(`   ❌ Missing: primary_color`)
      if (!t.secondary_color || t.secondary_color === '') console.log(`   ❌ Missing: secondary_color`)
    })
  } else {
    console.log('✅ All NHL teams have complete data')
  }

  // ====================================
  // 3. CFB CONFERENCES & IMAGES
  // ====================================
  console.log('\n\n3️⃣  COLLEGE FOOTBALL (CFB) - CONFERENCES & IMAGES')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const cfbTeams = await queryClickHouse(`
    SELECT 
      team_id,
      name,
      abbreviation,
      division,
      conference,
      logo_url
    FROM teams
    WHERE sport = 'cfb'
    ORDER BY name
  `)

  console.log(`Total CFB teams: ${cfbTeams.length}`)

  // Check for teams with division (should be empty for CFB)
  const cfbWithDivisions = cfbTeams.filter((t: any) => t.division && t.division !== '')
  if (cfbWithDivisions.length > 0) {
    console.log(`\n⚠️  ${cfbWithDivisions.length} CFB teams have divisions (should be empty):`)
    cfbWithDivisions.slice(0, 10).forEach((t: any) => {
      console.log(`   - ${t.name}: division="${t.division}"`)
    })
  } else {
    console.log('✅ No CFB teams have divisions (correct)')
  }

  // Check for missing conferences
  const cfbMissingConference = cfbTeams.filter((t: any) => !t.conference || t.conference === '')
  if (cfbMissingConference.length > 0) {
    console.log(`\n❌ ${cfbMissingConference.length} CFB teams missing conference:`)
    cfbMissingConference.slice(0, 10).forEach((t: any) => {
      console.log(`   - ${t.name} (${t.abbreviation})`)
    })
  } else {
    console.log('✅ All CFB teams have conferences')
  }

  // Check for missing images
  const cfbMissingLogo = cfbTeams.filter((t: any) => !t.logo_url || t.logo_url === '')
  if (cfbMissingLogo.length > 0) {
    console.log(`\n❌ ${cfbMissingLogo.length} CFB teams missing logo:`)
    cfbMissingLogo.slice(0, 10).forEach((t: any) => {
      console.log(`   - ${t.name} (${t.abbreviation})`)
    })
  } else {
    console.log('✅ All CFB teams have logos')
  }

  // ====================================
  // 4. NCAAB CONFERENCES & IMAGES
  // ====================================
  console.log('\n\n4️⃣  COLLEGE BASKETBALL (NCAAB) - CONFERENCES & IMAGES')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  console.log(`Total NCAAB teams: ${ncaabTeams.length}`)

  // Check for teams with division (should be empty for NCAAB)
  const ncaabWithDivisions = await queryClickHouse(`
    SELECT team_id, name, division, conference
    FROM teams
    WHERE sport = 'ncaab' AND division != ''
  `)
  
  if (ncaabWithDivisions.length > 0) {
    console.log(`\n⚠️  ${ncaabWithDivisions.length} NCAAB teams have divisions (should be empty):`)
    ncaabWithDivisions.slice(0, 10).forEach((t: any) => {
      console.log(`   - ${t.name}: division="${t.division}"`)
    })
  } else {
    console.log('✅ No NCAAB teams have divisions (correct)')
  }

  // Check for missing conferences
  const ncaabMissingConference = await queryClickHouse(`
    SELECT team_id, name, abbreviation, conference
    FROM teams
    WHERE sport = 'ncaab' AND (conference = '' OR conference IS NULL)
  `)
  
  if (ncaabMissingConference.length > 0) {
    console.log(`\n❌ ${ncaabMissingConference.length} NCAAB teams missing conference:`)
    ncaabMissingConference.slice(0, 10).forEach((t: any) => {
      console.log(`   - ${t.name} (${t.abbreviation})`)
    })
  } else {
    console.log('✅ All NCAAB teams have conferences')
  }

  // Check for missing images
  const ncaabMissingLogo = await queryClickHouse(`
    SELECT team_id, name, abbreviation, logo_url
    FROM teams
    WHERE sport = 'ncaab' AND (logo_url = '' OR logo_url IS NULL)
  `)
  
  if (ncaabMissingLogo.length > 0) {
    console.log(`\n❌ ${ncaabMissingLogo.length} NCAAB teams missing logo:`)
    ncaabMissingLogo.slice(0, 10).forEach((t: any) => {
      console.log(`   - ${t.name} (${t.abbreviation})`)
    })
  } else {
    console.log('✅ All NCAAB teams have logos')
  }

  // ====================================
  // SUMMARY
  // ====================================
  console.log('\n\n📊 SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`CBB teams (need to convert to ncaab): ${cbbTeams.length}`)
  console.log(`NCAAB teams: ${ncaabTeams.length}`)
  console.log(`Duplicates (same team in both): ${duplicates.length}`)
  console.log(`NHL teams with missing data: ${nhlMissing.length}`)
  console.log(`CFB teams missing conference: ${cfbMissingConference.length}`)
  console.log(`CFB teams missing logo: ${cfbMissingLogo.length}`)
  console.log(`NCAAB teams missing conference: ${ncaabMissingConference.length}`)
  console.log(`NCAAB teams missing logo: ${ncaabMissingLogo.length}`)
  
  console.log('\n✅ Diagnostic complete!')
}

main().catch(console.error)

