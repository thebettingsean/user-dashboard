// lib/utils/sportSelector.ts
type League = 'nfl' | 'nba' | 'mlb' | 'nhl' | 'cfb'

interface SportPriority {
  primary: League
  fallbacks: League[]
}

// Determine which sport to show based on day of week
export function getSportPriority(dayOfWeek?: number): SportPriority {
  // If no day provided, use current day
  const day = dayOfWeek ?? new Date().getDay()
  
  // 0 = Sunday, 1 = Monday, etc.
  switch (day) {
    case 0: // Sunday
      return {
        primary: 'nfl',
        fallbacks: ['nba', 'mlb', 'nhl']
      }
    case 1: // Monday
      return {
        primary: 'nfl',
        fallbacks: ['nba', 'mlb', 'nhl']
      }
    case 2: // Tuesday
      return {
        primary: 'nba',
        fallbacks: ['mlb', 'nhl', 'nfl']
      }
    case 3: // Wednesday
      return {
        primary: 'nba',
        fallbacks: ['mlb', 'nhl', 'nfl']
      }
    case 4: // Thursday
      return {
        primary: 'nfl',
        fallbacks: ['nba', 'mlb', 'nhl']
      }
    case 5: // Friday
      return {
        primary: 'cfb',
        fallbacks: ['nba', 'mlb', 'nhl', 'nfl']
      }
    case 6: // Saturday
      return {
        primary: 'cfb',
        fallbacks: ['nba', 'mlb', 'nhl', 'nfl']
      }
    default:
      return {
        primary: 'nfl',
        fallbacks: ['nba', 'mlb', 'nhl']
      }
  }
}

// Get date range for fetching games based on the sport
export function getDateRangeForSport(league: League): { from: string; to: string } {
  const now = new Date()
  const hour = now.getHours()
  
  // If it's after 10pm EST/EDT, look at tomorrow's games instead
  const today = hour >= 22 ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : now
  
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const from = new Date(today)
  const to = new Date(today)
  
  switch (league) {
    case 'nfl':
      // NFL games: Thursday, Sunday, Monday
      // Strategy: Show from today through next Monday (or current week's games)
      
      if (dayOfWeek === 0) {
        // Sunday: Show Sun-Mon (today and tomorrow)
        from.setDate(today.getDate())
        to.setDate(today.getDate() + 1)
      } else if (dayOfWeek === 1) {
        // Monday: Show Mon-Thu (today through Thursday)
        from.setDate(today.getDate())
        to.setDate(today.getDate() + 3)
      } else if (dayOfWeek === 4) {
        // Thursday: Show Thu-Mon (rest of week)
        from.setDate(today.getDate())
        to.setDate(today.getDate() + 4)
      } else if (dayOfWeek >= 2 && dayOfWeek <= 3) {
        // Tue/Wed: Show upcoming Thu-Mon
        const daysUntilThursday = (4 - dayOfWeek + 7) % 7
        from.setDate(today.getDate() + daysUntilThursday)
        to.setDate(from.getDate() + 4) // Thu + 4 days = Mon
      } else {
        // Fri/Sat: Show upcoming Sun-Mon
        const daysUntilSunday = (7 - dayOfWeek) % 7
        from.setDate(today.getDate() + daysUntilSunday)
        to.setDate(from.getDate() + 1) // Sun + 1 day = Mon
      }
      break
      
    case 'cfb':
      // College Football: Mostly Friday/Saturday games
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        // Fri/Sat: Show this weekend
        from.setDate(today.getDate())
        to.setDate(today.getDate() + (dayOfWeek === 5 ? 2 : 1))
      } else {
        // Other days: Show next Fri-Sun
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7
        from.setDate(today.getDate() + daysUntilFriday)
        to.setDate(from.getDate() + 2) // Fri-Sun
      }
      break
      
    case 'nba':
    case 'mlb':
    case 'nhl':
      // These sports play almost daily - show TODAY ONLY first
      // If no games today, the widget will fall back to next sport
      from.setDate(today.getDate())
      to.setDate(today.getDate()) // Only today, not +3 days
      break
  }
  
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0]
  }
}

// Get a user-friendly sport name
export function getSportDisplayName(league: League): string {
  const names: Record<League, string> = {
    nfl: 'NFL',
    nba: 'NBA',
    mlb: 'MLB',
    nhl: 'NHL',
    cfb: 'College Football'
  }
  return names[league]
}

// Get dynamic widget links based on sport - using EXACT URLs provided
export function getSportWidgetLinks(league: League): {
  publicBetting: string
  refereeTrends: string
  playerProps: string
} {
  const baseUrl = 'https://app.thebettinginsider.com'
  
  // PUBLIC BETTING LINKS (exact as provided)
  const publicBettingLinks: Record<League, string> = {
    nba: `${baseUrl}/?view=big_money&headerState=NBA`,
    cfb: `${baseUrl}/?view=big_money&headerState=NBA`, // CFB uses NBA headerState
    mlb: `${baseUrl}/?headerState=MLB&view=big_money`,
    nfl: `${baseUrl}/?headerState=NFL&view=big_money`,
    nhl: `${baseUrl}/?headerState=NHL&view=big_money`
  }
  
  // REFEREE TRENDS LINKS (all use same format)
  const refereeTrendsLinks: Record<League, string> = {
    mlb: `${baseUrl}/?headerState=MLB&view=ref_trends`,
    nba: `${baseUrl}/?headerState=NBA&view=ref_trends`,
    nfl: `${baseUrl}/?headerState=NFL&view=ref_trends`,
    nhl: `${baseUrl}/?headerState=NHL&view=ref_trends`,
    cfb: `${baseUrl}/?headerState=NCAAF&view=ref_trends` // fallback for CFB
  }
  
  // PLAYER PROPS LINKS (exact as provided)
  const playerPropsLinks: Record<League, string> = {
    nfl: `${baseUrl}/?view=player_props&headerState=NFL`,
    mlb: `${baseUrl}/?headerState=MLB&view=player_props`,
    nba: `${baseUrl}/?headerState=NBA&view=player_props`,
    nhl: `${baseUrl}/?headerState=NHL&view=player_props`,
    cfb: `${baseUrl}/?view=player_props&headerState=NCAAF` // fallback for CFB
  }
  
  return {
    publicBetting: publicBettingLinks[league],
    refereeTrends: refereeTrendsLinks[league],
    playerProps: playerPropsLinks[league]
  }
}
