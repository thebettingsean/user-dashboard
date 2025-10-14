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
  const today = new Date()
  const from = new Date(today)
  const to = new Date(today)
  
  switch (league) {
    case 'nfl':
      // NFL: Show Thursday through Monday games
      // Go back to most recent Thursday
      const daysToThursday = (today.getDay() + 3) % 7
      from.setDate(today.getDate() - daysToThursday)
      // Go forward to next Monday
      to.setDate(from.getDate() + 4)
      break
      
    case 'cfb':
      // College Football: Show Friday-Saturday games
      // Go back to most recent Friday
      const daysToFriday = (today.getDay() + 2) % 7
      from.setDate(today.getDate() - daysToFriday)
      // Show through Sunday
      to.setDate(from.getDate() + 2)
      break
      
    case 'nba':
    case 'mlb':
    case 'nhl':
      // These sports play almost daily - show today's games plus next 2 days
      from.setDate(today.getDate())
      to.setDate(today.getDate() + 2)
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
