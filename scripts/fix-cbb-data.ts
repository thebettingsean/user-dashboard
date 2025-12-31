import { clickhouseQuery } from '../lib/clickhouse'

async function fixCBBData() {
  console.log('=== FIXING CBB DATA IN CLICKHOUSE ===\n')

  try {
    // Step 1: Check current state
    console.log('Step 1: Checking current state...')
    const currentState = await clickhouseQuery<any>(`
      SELECT sport, count(*) as cnt, countIf(logo_url != '') as with_logo 
      FROM teams 
      WHERE sport IN ('cbb', 'ncaab') 
      GROUP BY sport
    `)
    console.log('Current teams state:', currentState.data)

    const gamesState = await clickhouseQuery<any>(`
      SELECT sport, count(*) as cnt
      FROM games 
      WHERE sport IN ('cbb', 'ncaab') AND game_time >= now()
      GROUP BY sport
    `)
    console.log('Current games state:', gamesState.data)

    // Step 2: Delete the 'cbb' teams (they have no logos and are duplicates)
    console.log('\nStep 2: Deleting cbb teams (0 logos, duplicates)...')
    const deleteTeams = await clickhouseQuery<any>(`
      ALTER TABLE teams DELETE WHERE sport = 'cbb'
    `)
    console.log('Delete cbb teams result:', deleteTeams.success ? 'SUCCESS' : deleteTeams.error)

    // Step 3: Update games from 'cbb' to 'ncaab'
    console.log('\nStep 3: Updating games from cbb to ncaab...')
    const updateGames = await clickhouseQuery<any>(`
      ALTER TABLE games UPDATE sport = 'ncaab' WHERE sport = 'cbb'
    `)
    console.log('Update games result:', updateGames.success ? 'SUCCESS' : updateGames.error)

    // Step 4: Verify changes
    console.log('\nStep 4: Verifying changes (waiting 5s for mutations)...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    const finalTeamsState = await clickhouseQuery<any>(`
      SELECT sport, count(*) as cnt, countIf(logo_url != '') as with_logo 
      FROM teams 
      WHERE sport IN ('cbb', 'ncaab') 
      GROUP BY sport
    `)
    console.log('Final teams state:', finalTeamsState.data)

    const finalGamesState = await clickhouseQuery<any>(`
      SELECT sport, count(*) as cnt
      FROM games 
      WHERE sport IN ('cbb', 'ncaab') AND game_time >= now()
      GROUP BY sport
    `)
    console.log('Final games state:', finalGamesState.data)

    console.log('\n=== DONE ===')
    console.log('All college basketball data should now use "ncaab" consistently.')
    console.log('Frontend should query for "ncaab" when user selects "CBB".')

  } catch (error) {
    console.error('Error fixing CBB data:', error)
  }
}

fixCBBData()

