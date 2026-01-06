#!/usr/bin/env node

// Deep dive into NBA betting splits issue
// Tests multiple games, checks all possible scenarios

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const SPORTSDATA_API_KEY = envVars.SPORTSDATA_IO_SPLITS_KEY;

if (!SPORTSDATA_API_KEY) {
  console.error('ERROR: SPORTSDATA_IO_SPLITS_KEY not found in .env.local');
  process.exit(1);
}

async function test() {
  console.log('='.repeat(80));
  console.log('DEEP DIVE: NBA BETTING SPLITS TESTING');
  console.log('='.repeat(80));
  
  // Step 1: Get NBA games for 2026 season
  console.log('\n[STEP 1] Fetching NBA games for 2026 season...');
  const gamesUrl = `https://api.sportsdata.io/v3/nba/scores/json/Games/2026?key=${SPORTSDATA_API_KEY}`;
  const gamesResp = await fetch(gamesUrl);
  
  if (!gamesResp.ok) {
    console.error('ERROR: Games API returned', gamesResp.status);
    process.exit(1);
  }
  
  const allGames = await gamesResp.json();
  console.log(`✓ Fetched ${allGames.length} total games`);
  
  // Step 2: Filter for upcoming games
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const future7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const upcomingGames = allGames.filter(g => {
    const gameDate = (g.Day || '').split('T')[0];
    return gameDate >= todayStr && gameDate <= future7Days;
  });
  
  console.log(`✓ Found ${upcomingGames.length} upcoming games (next 7 days)`);
  
  // Step 3: Categorize games by days away
  const today = upcomingGames.filter(g => g.Day.split('T')[0] === todayStr);
  const tomorrow = upcomingGames.filter(g => {
    const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return g.Day.split('T')[0] === tomorrowStr;
  });
  const dayAfter = upcomingGames.filter(g => {
    const dayAfterStr = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
    return g.Day.split('T')[0] === dayAfterStr;
  });
  
  console.log(`  - Today: ${today.length} games`);
  console.log(`  - Tomorrow: ${tomorrow.length} games`);
  console.log(`  - Day after: ${dayAfter.length} games`);
  
  // Step 4: Test splits for games at different times
  console.log('\n[STEP 2] Testing betting splits for various games...\n');
  
  const testSets = [
    { name: 'TODAY', games: today.slice(0, 3) },
    { name: 'TOMORROW', games: tomorrow.slice(0, 2) },
    { name: 'DAY AFTER TOMORROW', games: dayAfter.slice(0, 2) }
  ];
  
  let foundRealData = false;
  
  for (const set of testSets) {
    if (set.games.length === 0) {
      console.log(`[${set.name}] No games found`);
      continue;
    }
    
    console.log(`[${set.name}] Testing ${set.games.length} games:`);
    
    for (const game of set.games) {
      const gameTime = new Date(game.DateTime);
      const hoursAway = (gameTime - now) / (1000 * 60 * 60);
      
      console.log(`\n  Game ${game.GameID}: ${game.AwayTeam} @ ${game.HomeTeam}`);
      console.log(`  Time: ${game.DateTime} (${hoursAway.toFixed(1)} hours away)`);
      console.log(`  Status: ${game.Status}`);
      
      // Fetch splits
      const splitsUrl = `https://api.sportsdata.io/v3/nba/odds/json/BettingSplitsByGameId/${game.GameID}?key=${SPORTSDATA_API_KEY}`;
      const splitsResp = await fetch(splitsUrl);
      
      if (!splitsResp.ok) {
        console.log(`  ❌ Splits API error: ${splitsResp.status}`);
        continue;
      }
      
      const splits = await splitsResp.json();
      const marketCount = splits?.BettingMarketSplits?.length || 0;
      
      console.log(`  Markets returned: ${marketCount}`);
      
      if (marketCount === 0) {
        console.log(`  ❌ No betting markets returned`);
        continue;
      }
      
      // Check if any market has real data
      let hasRealData = false;
      for (const market of splits.BettingMarketSplits) {
        const betType = market.BettingBetType;
        
        if (market.BettingSplits && market.BettingSplits.length > 0) {
          const homeSplit = market.BettingSplits.find(s => s.BettingOutcomeType === 'Home');
          
          if (homeSplit) {
            const betPct = homeSplit.BetPercentage;
            const moneyPct = homeSplit.MoneyPercentage;
            
            console.log(`    ${betType}: BetPct=${betPct}, MoneyPct=${moneyPct}`);
            
            if (betPct !== null && betPct !== undefined) {
              hasRealData = true;
              foundRealData = true;
              console.log(`    ✅ FOUND REAL DATA!`);
            }
          }
        }
      }
      
      if (!hasRealData) {
        console.log(`  ❌ All percentages are NULL`);
      }
    }
  }
  
  // Step 5: Test with a historical game (should have data)
  console.log('\n[STEP 3] Testing with a COMPLETED game (should have data)...\n');
  
  const completedGames = allGames.filter(g => g.Status && (g.Status === 'Final' || g.Status.startsWith('F'))).slice(0, 3);
  
  if (completedGames.length > 0) {
    const game = completedGames[0];
    console.log(`Game ${game.GameID}: ${game.AwayTeam} ${game.AwayTeamScore} @ ${game.HomeTeam} ${game.HomeTeamScore}`);
    console.log(`Status: ${game.Status}, Date: ${game.Day}`);
    
    const splitsUrl = `https://api.sportsdata.io/v3/nba/odds/json/BettingSplitsByGameId/${game.GameID}?key=${SPORTSDATA_API_KEY}`;
    const splitsResp = await fetch(splitsUrl);
    
    if (splitsResp.ok) {
      const splits = await splitsResp.json();
      console.log(`Markets: ${splits?.BettingMarketSplits?.length || 0}`);
      
      if (splits?.BettingMarketSplits?.[0]?.BettingSplits?.[0]) {
        const split = splits.BettingMarketSplits[0].BettingSplits[0];
        console.log(`Sample: BetPct=${split.BetPercentage}, MoneyPct=${split.MoneyPercentage}`);
        
        if (split.BetPercentage !== null) {
          console.log('✅ Completed game HAS real data!');
        }
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  if (foundRealData) {
    console.log('✅ Found at least ONE game with real betting splits data!');
    console.log('   This means the API key HAS access to NBA splits.');
    console.log('   The issue is likely timing - data appears closer to game time.');
  } else {
    console.log('❌ NO games had real betting splits data (all null or empty).');
    console.log('   This suggests:');
    console.log('   1. API key may not have access to NBA betting splits');
    console.log('   2. OR data is only available very close to game time');
    console.log('   3. OR SportsDataIO has a temporary outage for NBA splits');
  }
  
  console.log('\n' + '='.repeat(80));
}

test().catch(err => {
  console.error('\nFATAL ERROR:', err.message);
  process.exit(1);
});

