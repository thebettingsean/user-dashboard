/**
 * NFL Data Extraction Helper Functions
 * Used by the complete ingestion pipeline
 */

const ESPN_CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl'

// Extract game data (scores, odds, outcomes)
export async function extractGameData(event: any, season: string, week: string, gameDate: Date) {
  const gameId = parseInt(event.id)
  const competition = event.competitions[0]
  const competitors = competition.competitors
  
  const homeTeam = competitors.find((c: any) => c.homeAway === 'home')
  const awayTeam = competitors.find((c: any) => c.homeAway === 'away')
  
  if (!homeTeam || !awayTeam) {
    console.warn(`Missing team data for game ${gameId}`)
    return null
  }

  const homeScore = parseInt(homeTeam.score) || 0
  const awayScore = parseInt(awayTeam.score) || 0
  const homeTeamId = parseInt(homeTeam.team.id)
  const awayTeamId = parseInt(awayTeam.team.id)

  // Fetch odds data from ESPN Core API
  let oddsData: any = {}
  
  try {
    const oddsUrl = `${ESPN_CORE}/events/${gameId}/competitions/${gameId}/odds`
    const oddsRes = await fetch(oddsUrl)
    
    if (oddsRes.ok) {
      const oddsResponse = await oddsRes.json()
      
      if (oddsResponse.items?.[0]) {
        const oddsItem = oddsResponse.items[0]
        
        // If we get a $ref, fetch the full odds details
        if (oddsItem.$ref) {
          const providerRes = await fetch(oddsItem.$ref)
          if (providerRes.ok) {
            const providerOdds = await providerRes.json()
            oddsData = extractOddsFromProvider(providerOdds, homeScore, awayScore, homeTeamId, awayTeamId)
          }
        } else {
          // Use the odds directly if no $ref
          oddsData = extractOddsFromProvider(oddsItem, homeScore, awayScore, homeTeamId, awayTeamId)
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch odds for game ${gameId}:`, err)
  }

  return {
    game_id: gameId,
    espn_game_id: event.id.toString(),
    season: parseInt(season),
    week: parseInt(week),
    game_date: gameDate.toISOString().split('T')[0],
    game_time: Math.floor(gameDate.getTime() / 1000),
    
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    
    venue: competition.venue?.fullName || '',
    city: competition.venue?.address?.city || '',
    state: competition.venue?.address?.state || '',
    is_neutral_site: competition.neutralSite ? 1 : 0,
    is_indoor: competition.venue?.indoor ? 1 : 0,
    
    is_playoff: parseInt(week) > 18 ? 1 : 0,
    is_division_game: 0, // Calculate later if needed
    is_conference_game: 0,
    
    home_score: homeScore,
    away_score: awayScore,
    total_points: homeScore + awayScore,
    
    home_won: homeScore > awayScore ? 1 : 0,
    margin_of_victory: Math.abs(homeScore - awayScore),
    
    ...oddsData,
    
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000)
  }
}

// Extract odds and calculate outcomes from ESPN Core API structure
function extractOddsFromProvider(odds: any, homeScore: number, awayScore: number, homeTeamId: number, awayTeamId: number) {
  // ESPN Core API provides: awayTeamOdds, homeTeamOdds, overUnder, spread
  const awayOdds = odds.awayTeamOdds || {}
  const homeOdds = odds.homeTeamOdds || {}
  
  // Spread: ESPN provides from away team perspective, convert to home team perspective
  // If away team spread is -3.5, home team spread is +3.5
  const awaySpreadOpen = parseFloat(awayOdds.open?.pointSpread?.american) || 0
  const awaySpreadClose = parseFloat(awayOdds.close?.pointSpread?.american || awayOdds.current?.pointSpread?.american) || 0
  
  // Convert to home team perspective (flip sign)
  const spreadOpen = -1 * awaySpreadOpen
  const spreadClose = -1 * awaySpreadClose
  
  // Moneylines
  const homeMLOpen = parseInt(homeOdds.open?.moneyLine?.american) || 0
  const homeMLClose = parseInt(homeOdds.close?.moneyLine?.american || homeOdds.current?.moneyLine?.american) || 0
  const awayMLOpen = parseInt(awayOdds.open?.moneyLine?.american) || 0
  const awayMLClose = parseInt(awayOdds.close?.moneyLine?.american || awayOdds.current?.moneyLine?.american) || 0
  
  // Totals (over/under)
  const totalOpen = parseFloat(odds.overUnder) || 0
  const totalClose = parseFloat(odds.overUnder) || 0 // ESPN may not differentiate open/close in all endpoints
  
  // Spread odds
  const homeSpreadOddsClose = parseInt(homeOdds.spreadOdds || homeOdds.close?.spread?.american || homeOdds.current?.spread?.american) || -110
  const awaySpreadOddsClose = parseInt(awayOdds.spreadOdds || awayOdds.close?.spread?.american || awayOdds.current?.spread?.american) || -110
  
  // Calculate spread outcome (spread is from home team perspective)
  const homeAdjusted = homeScore + spreadClose
  let homeCovered = 0
  let spreadPush = 0
  if (spreadClose !== 0) {
    if (homeAdjusted > awayScore) homeCovered = 1
    else if (homeAdjusted === awayScore) spreadPush = 1
  }

  // Calculate total outcome
  const totalPoints = homeScore + awayScore
  let wentOver = 0
  let wentUnder = 0
  let totalPush = 0
  if (totalClose > 0) {
    if (totalPoints > totalClose) wentOver = 1
    else if (totalPoints < totalClose) wentUnder = 1
    else totalPush = 1
  }

  return {
    spread_open: spreadOpen,
    spread_close: spreadClose,
    spread_movement: spreadClose - spreadOpen,
    home_spread_odds_close: homeSpreadOddsClose,
    away_spread_odds_close: awaySpreadOddsClose,
    
    home_covered: homeCovered,
    spread_push: spreadPush,
    
    home_ml_open: homeMLOpen,
    home_ml_close: homeMLClose,
    home_ml_movement: homeMLClose - homeMLOpen,
    away_ml_open: awayMLOpen,
    away_ml_close: awayMLClose,
    away_ml_movement: awayMLClose - awayMLOpen,
    
    total_open: totalOpen,
    total_close: totalClose,
    total_movement: 0,
    over_odds_close: odds.overOdds || -110,
    under_odds_close: odds.underOdds || -110,
    
    went_over: wentOver,
    went_under: wentUnder,
    total_push: totalPush,
    
    odds_provider_id: parseInt(odds.provider?.id) || 0,
    odds_provider_name: odds.provider?.name || 'Unknown',
    
    home_win_prob_pregame: 0
  }
}

// Extract team stats for both teams
export async function extractTeamStats(event: any, gameId: number, season: string, week: string, gameDate: Date) {
  const teamStatsData = []
  const competitors = event.competitions[0].competitors
  
  // First pass: collect ALL teams' stats
  const teamOffensiveStats: Record<number, any> = {}

  for (const competitor of competitors) {
    const teamId = parseInt(competitor.team.id)
    
    try {
      const statsUrl = `${ESPN_CORE}/events/${gameId}/competitions/${gameId}/competitors/${teamId}/statistics`
      const statsRes = await fetch(statsUrl)
      
      if (!statsRes.ok) continue

      const stats = await statsRes.json()
      const categories = stats.splits?.categories || []
      const parsedStats = parseTeamStats(categories)
      
      teamOffensiveStats[teamId] = parsedStats
    } catch (err) {
      console.warn(`Failed to fetch stats for team ${teamId}`)
    }
  }

  // Second pass: build team stats with opponent's offensive = our defensive
  for (const competitor of competitors) {
    const teamId = parseInt(competitor.team.id)
    const isHome = competitor.homeAway === 'home'
    const opponentComp = competitors.find((c: any) => c.team.id !== competitor.team.id)
    const opponentId = parseInt(opponentComp?.team?.id) || 0
    const score = parseInt(competitor.score) || 0
    const opponentScore = parseInt(opponentComp?.score) || 0

    const ourOffense = teamOffensiveStats[teamId] || {}
    const theirOffense = teamOffensiveStats[opponentId] || {}

    teamStatsData.push({
      team_id: teamId,
      game_id: gameId,
      season: parseInt(season),
      week: parseInt(week),
      game_date: gameDate.toISOString().split('T')[0],
      opponent_id: opponentId,
      is_home: isHome ? 1 : 0,
      
      points_scored: score,
      points_allowed: opponentScore,
      won: score > opponentScore ? 1 : 0,
      
      // Our offense
      total_yards: ourOffense.total_yards || 0,
      passing_yards: ourOffense.passing_yards || 0,
      rushing_yards: ourOffense.rushing_yards || 0,
      passing_attempts: ourOffense.passing_attempts || 0,
      completions: ourOffense.completions || 0,
      passing_tds: ourOffense.passing_tds || 0,
      interceptions_thrown: ourOffense.interceptions_thrown || 0,
      rushing_attempts: ourOffense.rushing_attempts || 0,
      rushing_tds: ourOffense.rushing_tds || 0,
      sacks_taken: ourOffense.sacks_taken || 0,
      turnovers: ourOffense.turnovers || 0,
      first_downs: ourOffense.first_downs || 0,
      third_down_attempts: ourOffense.third_down_attempts || 0,
      third_down_conversions: ourOffense.third_down_conversions || 0,
      third_down_pct: ourOffense.third_down_pct || 0,
      redzone_attempts: ourOffense.redzone_attempts || 0,
      redzone_scores: ourOffense.redzone_scores || 0,
      redzone_pct: ourOffense.redzone_pct || 0,
      time_of_possession_seconds: ourOffense.time_of_possession_seconds || 0,
      
      // Our defense = what opponent did offensively
      def_total_yards_allowed: theirOffense.total_yards || 0,
      def_passing_yards_allowed: theirOffense.passing_yards || 0,
      def_rushing_yards_allowed: theirOffense.rushing_yards || 0,
      def_sacks: ourOffense.def_sacks_stat || 0,
      def_turnovers_forced: ourOffense.def_turnovers_stat || 0,
      def_interceptions: ourOffense.def_interceptions_stat || 0,
      
      created_at: Math.floor(Date.now() / 1000)
    })
  }

  return teamStatsData
}

// Parse team stats from ESPN categories
function parseTeamStats(categories: any[]) {
  const getValue = (catName: string, statName: string) => {
    const cat = categories.find(c => c.name === catName)
    return cat?.stats?.find((s: any) => s.name === statName)?.value || 0
  }

  return {
    total_yards: getValue('passing', 'netTotalYards') || getValue('rushing', 'netTotalYards') || 0,
    passing_yards: getValue('passing', 'netPassingYards'),
    rushing_yards: getValue('rushing', 'rushingYards'),
    passing_attempts: getValue('passing', 'passingAttempts'),
    completions: getValue('passing', 'completions'),
    passing_tds: getValue('passing', 'passingTouchdowns'),
    interceptions_thrown: getValue('passing', 'interceptions'),
    rushing_attempts: getValue('rushing', 'rushingAttempts'),
    rushing_tds: getValue('rushing', 'rushingTouchdowns'),
    sacks_taken: getValue('passing', 'sacks'),
    turnovers: getValue('passing', 'interceptions') + getValue('general', 'fumblesLost'),
    
    first_downs: getValue('miscellaneous', 'firstDowns'),
    third_down_attempts: getValue('miscellaneous', 'thirdDownAttempts'),
    third_down_conversions: getValue('miscellaneous', 'thirdDownConvs'),
    third_down_pct: getValue('miscellaneous', 'thirdDownConvPct'),
    
    redzone_attempts: getValue('miscellaneous', 'redzoneAttempts'),
    redzone_scores: getValue('miscellaneous', 'redzoneTouchdowns') + getValue('miscellaneous', 'redzoneFieldGoals'),
    redzone_pct: getValue('miscellaneous', 'redzoneEfficiencyPct'),
    
    time_of_possession_seconds: getValue('miscellaneous', 'possessionTimeSeconds'),
    
    // Defensive stats (to use for team's own defensive performance)
    def_sacks_stat: getValue('defensive', 'sacks'),
    def_turnovers_stat: getValue('defensiveInterceptions', 'interceptions') + getValue('general', 'fumblesRecovered'),
    def_interceptions_stat: getValue('defensiveInterceptions', 'interceptions')
  }
}

// Extract player box scores for both teams
export async function extractPlayerBoxScores(event: any, gameId: number, season: string, week: string, gameDate: Date) {
  const boxScoresData = []
  const competitors = event.competitions[0].competitors

  for (const competitor of competitors) {
    const teamId = parseInt(competitor.team.id)
    const opponentId = parseInt(competitors.find((c: any) => c.team.id !== competitor.team.id)?.team.id) || 0
    const isHome = competitor.homeAway === 'home'

    try {
      // Fetch team statistics to get player list
      const statsUrl = `${ESPN_CORE}/events/${gameId}/competitions/${gameId}/competitors/${teamId}/statistics`
      const statsRes = await fetch(statsUrl)
      
      if (!statsRes.ok) continue

      const stats = await statsRes.json()
      const categories = stats.splits?.categories || []
      
      // Get offensive players (passing, rushing, receiving)
      const processedPlayers = new Set<string>()
      const offensiveCategories = ['passing', 'rushing', 'receiving']

      for (const category of categories) {
        if (!offensiveCategories.includes(category.name)) continue

        for (const athlete of category.athletes || []) {
          if (!athlete.athlete?.$ref) continue
          
          const athleteId = athlete.athlete.$ref.split('/athletes/')[1]?.split('?')[0]
          if (!athleteId || processedPlayers.has(athleteId)) continue
          
          processedPlayers.add(athleteId)

          // Fetch individual player stats
          const playerStats = await fetchPlayerStats(gameId, teamId, athleteId, season)
          
          if (playerStats && playerStats.hasStats) {
            boxScoresData.push({
              player_id: parseInt(athleteId),
              game_id: gameId,
              game_date: gameDate.toISOString().split('T')[0],
              season: parseInt(season),
              week: parseInt(week),
              
              team_id: teamId,
              opponent_id: opponentId,
              is_home: isHome ? 1 : 0,
              
              // Rankings will be populated later
              opp_def_rank_pass_yards: 0,
              opp_def_rank_rush_yards: 0,
              opp_def_rank_receiving_yards: 0,
              
              ...playerStats.stats,
              
              created_at: Math.floor(Date.now() / 1000)
            })
          }

          await new Promise(r => setTimeout(r, 50)) // Rate limit
        }
      }

    } catch (err) {
      console.warn(`Failed to fetch player stats for team ${teamId} in game ${gameId}`)
    }
  }

  return boxScoresData
}

// Fetch individual player stats
async function fetchPlayerStats(gameId: number, teamId: number, athleteId: string, season: string) {
  try {
    const statsUrl = `${ESPN_CORE}/events/${gameId}/competitions/${gameId}/competitors/${teamId}/roster/${athleteId}/statistics/0`
    const statsRes = await fetch(statsUrl)
    
    if (!statsRes.ok) return null

    const statsData = await statsRes.json()
    const categories = statsData.splits?.categories || []

    const stats: any = {
      pass_attempts: 0,
      pass_completions: 0,
      pass_yards: 0,
      pass_tds: 0,
      interceptions: 0,
      sacks: 0,
      qb_rating: 0,
      rush_attempts: 0,
      rush_yards: 0,
      rush_tds: 0,
      rush_long: 0,
      yards_per_carry: 0,
      targets: 0,
      receptions: 0,
      receiving_yards: 0,
      receiving_tds: 0,
      receiving_long: 0,
      yards_per_reception: 0,
      fumbles: 0,
      fumbles_lost: 0
    }

    let hasStats = false

    for (const category of categories) {
      const categoryStats = category.stats || []

      if (category.name === 'passing') {
        stats.pass_attempts = categoryStats.find((s: any) => s.name === 'passingAttempts')?.value || 0
        stats.pass_completions = categoryStats.find((s: any) => s.name === 'completions')?.value || 0
        stats.pass_yards = categoryStats.find((s: any) => s.name === 'passingYards')?.value || 0
        stats.pass_tds = categoryStats.find((s: any) => s.name === 'passingTouchdowns')?.value || 0
        stats.interceptions = categoryStats.find((s: any) => s.name === 'interceptions')?.value || 0
        stats.sacks = categoryStats.find((s: any) => s.name === 'sacks')?.value || 0
        stats.qb_rating = categoryStats.find((s: any) => s.name === 'QBRating')?.value || 0
        if (stats.pass_attempts > 0) hasStats = true
      }
      else if (category.name === 'rushing') {
        stats.rush_attempts = categoryStats.find((s: any) => s.name === 'rushingAttempts')?.value || 0
        stats.rush_yards = categoryStats.find((s: any) => s.name === 'rushingYards')?.value || 0
        stats.rush_tds = categoryStats.find((s: any) => s.name === 'rushingTouchdowns')?.value || 0
        stats.rush_long = categoryStats.find((s: any) => s.name === 'longRushing')?.value || 0
        if (stats.rush_attempts > 0 && stats.rush_yards > 0) {
          stats.yards_per_carry = stats.rush_yards / stats.rush_attempts
        }
        if (stats.rush_attempts > 0) hasStats = true
      }
      else if (category.name === 'receiving') {
        stats.targets = categoryStats.find((s: any) => s.name === 'receivingTargets')?.value || 0
        stats.receptions = categoryStats.find((s: any) => s.name === 'receptions')?.value || 0
        stats.receiving_yards = categoryStats.find((s: any) => s.name === 'receivingYards')?.value || 0
        stats.receiving_tds = categoryStats.find((s: any) => s.name === 'receivingTouchdowns')?.value || 0
        stats.receiving_long = categoryStats.find((s: any) => s.name === 'longReception')?.value || 0
        if (stats.receptions > 0 && stats.receiving_yards > 0) {
          stats.yards_per_reception = stats.receiving_yards / stats.receptions
        }
        if (stats.receptions > 0) hasStats = true
      }
      else if (category.name === 'general' || category.name === 'fumbles') {
        stats.fumbles = categoryStats.find((s: any) => s.name === 'fumbles')?.value || 0
        stats.fumbles_lost = categoryStats.find((s: any) => s.name === 'fumblesLost')?.value || 0
      }
    }

    return hasStats ? { hasStats: true, stats } : null

  } catch (error) {
    return null
  }
}

