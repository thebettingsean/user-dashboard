'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './nfl-playoffs.module.css'

type TeamSlug = string

// Game keys in order (for serialization)
const GAME_KEYS = [
  'afc_wc_1',
  'afc_wc_2',
  'afc_wc_3',
  'afc_div_1',
  'afc_div_2',
  'afc_conf',
  'nfc_wc_1',
  'nfc_wc_2',
  'nfc_wc_3',
  'nfc_div_1',
  'nfc_div_2',
  'nfc_conf',
  'sb',
] as const

type GameKey = typeof GAME_KEYS[number]

interface GameSelection {
  top?: TeamSlug
  bottom?: TeamSlug
  selected?: 'top' | 'bottom' // Which team is selected (winner)
}

interface BracketSelections {
  [key: string]: GameSelection
}

// Team slug to gradient color mapping for background (main color, secondary color) - darkened for subtlety
const TEAM_GRADIENT_COLORS: Record<string, { main: string; secondary: string }> = {
  // AFC Teams
  broncos: { main: '#4A1405', secondary: '#000811' }, // Dark Orange → Dark Navy Blue
  panthers: { main: '#002133', secondary: '#000000' }, // Dark Carolina Blue → Black
  jaguars: { main: '#00191E', secondary: '#000000' }, // Dark Teal → Black
  steelers: { main: '#000000', secondary: '#3E2D05' }, // Black → Dark Gold
  patriots: { main: '#000911', secondary: '#2A0000' }, // Dark Navy Blue → Dark Red
  chargers: { main: '#002032', secondary: '#3E2D05' }, // Dark Powder Blue → Dark Yellow
  bills: { main: '#000D24', secondary: '#2A0000' }, // Dark Royal Blue → Dark Red
  texans: { main: '#00080A', secondary: '#2A0000' }, // Dark Deep Steel Blue → Dark Red
  // NFC Teams
  packers: { main: '#080D0C', secondary: '#3E2D05' }, // Dark Green → Dark Gold
  bears: { main: '#02050B', secondary: '#4A1405' }, // Dark Navy Blue → Dark Orange
  fortyniners: { main: '#2A0000', secondary: '#3E2D05' }, // Dark Red → Dark Gold
  eagles: { main: '#001315', secondary: '#252525' }, // Dark Midnight Green → Dark Silver
  seahawks: { main: '#000911', secondary: '#003300' }, // Dark College Navy → Dark Neon Green
  rams: { main: '#000E25', secondary: '#3E2D05' }, // Dark Royal Blue → Dark Yellow
}

// Team slug to full name mapping
const TEAM_NAMES: Record<string, string> = {
  ravens: 'Baltimore Ravens',
  chiefs: 'Kansas City Chiefs',
  patriots: 'New England Patriots',
  dolphins: 'Miami Dolphins',
  chargers: 'Los Angeles Chargers',
  jaguars: 'Jacksonville Jaguars',
  texans: 'Houston Texans',
  bills: 'Buffalo Bills',
  titans: 'Tennessee Titans',
  fortyniners: 'San Francisco 49ers',
  giants: 'New York Giants',
  packers: 'Green Bay Packers',
  saints: 'New Orleans Saints',
  seahawks: 'Seattle Seahawks',
  vikings: 'Minnesota Vikings',
  eagles: 'Philadelphia Eagles',
  colts: 'Indianapolis Colts',
  browns: 'Cleveland Browns',
  steelers: 'Pittsburgh Steelers',
  bears: 'Chicago Bears',
  rams: 'Los Angeles Rams',
  buccaneers: 'Tampa Bay Buccaneers',
  raiders: 'Las Vegas Raiders',
  bengals: 'Cincinnati Bengals',
  cowboys: 'Dallas Cowboys',
  cardinals: 'Arizona Cardinals',
  lions: 'Detroit Lions',
  broncos: 'Denver Broncos',
  commanders: 'Washington Commanders',
  panthers: 'Carolina Panthers',
}

const DEFAULT_TEAMS = {
  afc: ['broncos', 'patriots', 'jaguars', 'steelers', 'texans', 'bills', 'chargers'],
  nfc: ['seahawks', 'bears', 'eagles', 'panthers', 'rams', 'fortyniners', 'packers'],
}

// Get serial number from selections (base-3 encoding like reference)
function getSerial(selections: BracketSelections): number {
  let serial = 0
  GAME_KEYS.forEach((gameKey, index) => {
    serial *= 3
    const game = selections[gameKey]
    if (game?.selected === 'top') {
      serial += 1
    } else if (game?.selected === 'bottom') {
      serial += 2
    }
  })
  return serial
}

// Deserialize from serial number
function selectTeams(serial: number): BracketSelections {
  const selections: BracketSelections = {}
  let remaining = serial
  
  // Process games in reverse order
  for (let i = GAME_KEYS.length - 1; i >= 0; i--) {
    const gameKey = GAME_KEYS[i]
    const flag = remaining % 3
    remaining = Math.floor(remaining / 3)
    
    if (flag === 1) {
      selections[gameKey] = { selected: 'top' }
    } else if (flag === 2) {
      selections[gameKey] = { selected: 'bottom' }
    }
  }
  
  return selections
}

// Sort teams by their seed/rank order (like reference sort_teams)
function sortTeams(teams: (TeamSlug | undefined)[], confRank: TeamSlug[]): TeamSlug[] {
  return teams
    .filter((t): t is TeamSlug => !!t)
    .sort((a, b) => {
      const aIndex = confRank.indexOf(a)
      const bIndex = confRank.indexOf(b)
      return aIndex - bIndex
    })
}

// Populate teams in each round based on selections (like reference populate_teams)
function populateTeams(selections: BracketSelections): BracketSelections {
  const updated = { ...selections }
  
  // Set initial wildcard matchups (preserve selection if exists)
  updated.afc_wc_1 = {
    ...updated.afc_wc_1,
    top: DEFAULT_TEAMS.afc[6], // 7 seed
    bottom: DEFAULT_TEAMS.afc[1], // 2 seed
  }
  updated.afc_wc_2 = {
    ...updated.afc_wc_2,
    top: DEFAULT_TEAMS.afc[5], // 6 seed
    bottom: DEFAULT_TEAMS.afc[2], // 3 seed
  }
  updated.afc_wc_3 = {
    ...updated.afc_wc_3,
    top: DEFAULT_TEAMS.afc[4], // 5 seed
    bottom: DEFAULT_TEAMS.afc[3], // 4 seed
  }
  
  updated.nfc_wc_1 = {
    ...updated.nfc_wc_1,
    top: DEFAULT_TEAMS.nfc[6], // 7 seed
    bottom: DEFAULT_TEAMS.nfc[1], // 2 seed
  }
  updated.nfc_wc_2 = {
    ...updated.nfc_wc_2,
    top: DEFAULT_TEAMS.nfc[5], // 6 seed
    bottom: DEFAULT_TEAMS.nfc[2], // 3 seed
  }
  updated.nfc_wc_3 = {
    ...updated.nfc_wc_3,
    top: DEFAULT_TEAMS.nfc[4], // 5 seed
    bottom: DEFAULT_TEAMS.nfc[3], // 4 seed
  }
  
  // AFC Divisional: Sort teams including #1 seed and wildcard winners
  const afcDivTeams = sortTeams([
    DEFAULT_TEAMS.afc[0], // #1 seed (Broncos) - always included
    updated.afc_wc_1?.selected === 'top' ? updated.afc_wc_1.top : updated.afc_wc_1?.selected === 'bottom' ? updated.afc_wc_1.bottom : undefined,
    updated.afc_wc_2?.selected === 'top' ? updated.afc_wc_2.top : updated.afc_wc_2?.selected === 'bottom' ? updated.afc_wc_2.bottom : undefined,
    updated.afc_wc_3?.selected === 'top' ? updated.afc_wc_3.top : updated.afc_wc_3?.selected === 'bottom' ? updated.afc_wc_3.bottom : undefined,
  ], DEFAULT_TEAMS.afc)
  
  // Ensure #1 seed (Broncos) is always at bottom of div_1 - it should be at index 0 after sorting
  updated.afc_div_1 = {
    ...updated.afc_div_1,
    top: afcDivTeams[3] || undefined,
    bottom: DEFAULT_TEAMS.afc[0], // #1 seed (Broncos) always at bottom, always visible
  }
  updated.afc_div_2 = {
    ...updated.afc_div_2,
    top: afcDivTeams[2] || undefined,
    bottom: afcDivTeams[1] || undefined,
  }
  
  // NFC Divisional: Sort teams including #1 seed and wildcard winners
  const nfcDivTeams = sortTeams([
    DEFAULT_TEAMS.nfc[0], // #1 seed (Seahawks) - always included
    updated.nfc_wc_1?.selected === 'top' ? updated.nfc_wc_1.top : updated.nfc_wc_1?.selected === 'bottom' ? updated.nfc_wc_1.bottom : undefined,
    updated.nfc_wc_2?.selected === 'top' ? updated.nfc_wc_2.top : updated.nfc_wc_2?.selected === 'bottom' ? updated.nfc_wc_2.bottom : undefined,
    updated.nfc_wc_3?.selected === 'top' ? updated.nfc_wc_3.top : updated.nfc_wc_3?.selected === 'bottom' ? updated.nfc_wc_3.bottom : undefined,
  ], DEFAULT_TEAMS.nfc)
  
  // Ensure #1 seed (Seahawks) is always at bottom of div_1 - it should be at index 0 after sorting
  updated.nfc_div_1 = {
    ...updated.nfc_div_1,
    top: nfcDivTeams[3] || undefined,
    bottom: DEFAULT_TEAMS.nfc[0], // #1 seed (Seahawks) always at bottom, always visible
  }
  updated.nfc_div_2 = {
    ...updated.nfc_div_2,
    top: nfcDivTeams[2] || undefined,
    bottom: nfcDivTeams[1] || undefined,
  }
  
  // AFC Conference: Sort divisional winners
  const afcConfTeams = sortTeams([
    updated.afc_div_1?.selected === 'top' ? updated.afc_div_1.top : updated.afc_div_1?.selected === 'bottom' ? updated.afc_div_1.bottom : undefined,
    updated.afc_div_2?.selected === 'top' ? updated.afc_div_2.top : updated.afc_div_2?.selected === 'bottom' ? updated.afc_div_2.bottom : undefined,
  ], DEFAULT_TEAMS.afc)
  
  updated.afc_conf = {
    ...updated.afc_conf,
    top: afcConfTeams[1] || undefined,
    bottom: afcConfTeams[0] || undefined,
  }
  
  // NFC Conference: Sort divisional winners
  const nfcConfTeams = sortTeams([
    updated.nfc_div_1?.selected === 'top' ? updated.nfc_div_1.top : updated.nfc_div_1?.selected === 'bottom' ? updated.nfc_div_1.bottom : undefined,
    updated.nfc_div_2?.selected === 'top' ? updated.nfc_div_2.top : updated.nfc_div_2?.selected === 'bottom' ? updated.nfc_div_2.bottom : undefined,
  ], DEFAULT_TEAMS.nfc)
  
  updated.nfc_conf = {
    ...updated.nfc_conf,
    top: nfcConfTeams[1] || undefined,
    bottom: nfcConfTeams[0] || undefined,
  }
  
  // Super Bowl
  const sbTeams = [
    updated.afc_conf?.selected === 'top' ? updated.afc_conf.top : updated.afc_conf?.selected === 'bottom' ? updated.afc_conf.bottom : undefined,
    updated.nfc_conf?.selected === 'top' ? updated.nfc_conf.top : updated.nfc_conf?.selected === 'bottom' ? updated.nfc_conf.bottom : undefined,
  ]
  
  updated.sb = {
    ...updated.sb,
    top: sbTeams[0] || undefined,
    bottom: sbTeams[1] || undefined,
  }
  
  return updated
}

function NFLPlayoffsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Initialize with populated teams so bracket shows immediately
  const [selections, setSelections] = useState<BracketSelections>(() => populateTeams({}))
  const [shareUrl, setShareUrl] = useState('')
  const [teamLogos, setTeamLogos] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [activeOverlay, setActiveOverlay] = useState<'first' | 'second'>('first')
  const [overlayColors, setOverlayColors] = useState<{ first: string | null; second: string | null }>({
    first: null,
    second: null,
  })
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const manualNavigationRef = useRef(false)

  // Fetch team logos
  useEffect(() => {
    async function fetchTeamLogos() {
      try {
        const logoMap: Record<string, string | null> = {}
        
        // Helper function to match team names flexibly
        const matchTeamName = (apiName: string, teamName: string): boolean => {
          if (!apiName || !teamName) return false
          
          const apiLower = apiName.toLowerCase().trim()
          const teamLower = teamName.toLowerCase().trim()
          
          // Exact match
          if (apiLower === teamLower) return true
          
          // Match by last word (e.g., "Broncos" matches "Denver Broncos", "Seahawks" matches "Seattle Seahawks")
          const apiLastWord = apiLower.split(' ').pop() || ''
          const teamLastWord = teamLower.split(' ').pop() || ''
          if (apiLastWord && teamLastWord && apiLastWord === teamLastWord) return true
          
          // Match by city/state name (e.g., "Denver" matches "Denver Broncos")
          const apiFirstWord = apiLower.split(' ')[0] || ''
          const teamFirstWord = teamLower.split(' ')[0] || ''
          if (apiFirstWord && teamFirstWord && apiFirstWord === teamFirstWord) return true
          
          // Match if one contains the other (e.g., "Denver Broncos" contains "Broncos")
          if (apiLower.includes(teamLastWord) || teamLower.includes(apiLastWord)) return true
          
          return false
        }
        
        // First, try to get logos from upcoming games
        const response = await fetch(`/api/games/upcoming?sport=nfl`)
        if (response.ok) {
          const data = await response.json()
          
          if (data.games) {
            data.games.forEach((game: any) => {
              if (game.awayTeam && game.awayTeamLogo) {
                const slug = Object.entries(TEAM_NAMES).find(([_, name]) => 
                  matchTeamName(game.awayTeam, name)
                )?.[0]
                if (slug) logoMap[slug] = game.awayTeamLogo
              }
              if (game.homeTeam && game.homeTeamLogo) {
                const slug = Object.entries(TEAM_NAMES).find(([_, name]) => 
                  matchTeamName(game.homeTeam, name)
                )?.[0]
                if (slug) logoMap[slug] = game.homeTeamLogo
              }
            })
          }
        }
        
        // For any missing logos, fetch directly from teams table
        const allTeamSlugs = [...DEFAULT_TEAMS.afc, ...DEFAULT_TEAMS.nfc]
        const missingLogos = allTeamSlugs.filter(slug => !logoMap[slug])
        
        if (missingLogos.length > 0) {
          try {
            const teamsResponse = await fetch(`/api/teams/logos?sport=nfl`)
            if (teamsResponse.ok) {
              const teamsData = await teamsResponse.json()
              if (teamsData.teams) {
                for (const slug of missingLogos) {
                  const teamName = TEAM_NAMES[slug]
                  if (teamName) {
                    // Try exact match first
                    if (teamsData.teams[teamName]) {
                      logoMap[slug] = teamsData.teams[teamName]
                    } else {
                      // Try partial match
                      const matchedKey = Object.keys(teamsData.teams).find(key => 
                        matchTeamName(key, teamName)
                      )
                      if (matchedKey) {
                        logoMap[slug] = teamsData.teams[matchedKey]
                      }
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error fetching missing logos from teams table:', err)
          }
        }
        
        // Debug: Log #1 seeds specifically
        console.log('Broncos logo:', logoMap['broncos'], 'Team name:', TEAM_NAMES['broncos'])
        console.log('Seahawks logo:', logoMap['seahawks'], 'Team name:', TEAM_NAMES['seahawks'])
        console.log('Missing logos:', allTeamSlugs.filter(slug => !logoMap[slug]))
        
        setTeamLogos(logoMap)
      } catch (error) {
        console.error('Failed to fetch team logos:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchTeamLogos()
  }, [])

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Check if a round is complete and auto-advance (only forward, not backward)
  useEffect(() => {
    if (!isMobile) return

    const rounds = [
      { key: 'wildcard', games: ['afc_wc_1', 'afc_wc_2', 'afc_wc_3', 'nfc_wc_1', 'nfc_wc_2', 'nfc_wc_3'] },
      { key: 'divisional', games: ['afc_div_1', 'afc_div_2', 'nfc_div_1', 'nfc_div_2'] },
      { key: 'conference', games: ['afc_conf', 'nfc_conf'] },
      { key: 'superbowl', games: ['sb'] },
    ]

    // Find the highest completed round
    let highestCompleteRound = -1
    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i]
      const isComplete = round.games.every(gameKey => {
        const game = selections[gameKey]
        return game?.selected !== undefined && (game?.top || game?.bottom)
      })
      if (isComplete) {
        highestCompleteRound = i
      }
    }

    const currentRound = rounds[currentRoundIndex]
    if (!currentRound) return

    // Check if all games in current round have selections
    const isRoundComplete = currentRound.games.every(gameKey => {
      const game = selections[gameKey]
      return game?.selected !== undefined && (game?.top || game?.bottom)
    })

    // Only auto-advance if:
    // 1. Current round is complete
    // 2. We're on the highest completed round (not a previous one)
    // 3. We're not on the last round
    // 4. User hasn't manually navigated
    if (isRoundComplete && 
        currentRoundIndex === highestCompleteRound &&
        currentRoundIndex < rounds.length - 1 &&
        !manualNavigationRef.current) {
      const timer = setTimeout(() => {
        // Double-check that user hasn't navigated away
        if (!manualNavigationRef.current) {
          setCurrentRoundIndex(prev => Math.min(prev + 1, rounds.length - 1))
        }
      }, 800) // Increased delay for smoother transition
      return () => clearTimeout(timer)
    }
  }, [selections, currentRoundIndex, isMobile])

  // Reset manual navigation flag after a short delay
  useEffect(() => {
    if (!isMobile) return
    
    if (manualNavigationRef.current) {
      const timer = setTimeout(() => {
        manualNavigationRef.current = false
      }, 1000) // Reset flag after 1 second
      return () => clearTimeout(timer)
    }
  }, [currentRoundIndex, isMobile])

  // Initialize from URL serial
  useEffect(() => {
    const serialStr = searchParams.get('serial') || window.location.hash.substring(1) || '0'
    const serial = parseInt(serialStr, 10) || 0
    if (serial === 0) {
      // No serial - just populate with initial teams
      setSelections(populateTeams({}))
      setCurrentRoundIndex(0)
    } else {
      // Deserialize from serial and populate
      const initialSelections = selectTeams(serial)
      const populated = populateTeams(initialSelections)
      setSelections(populated)
      
      // Determine which round to show based on completion
      const rounds = [
        { key: 'wildcard', games: ['afc_wc_1', 'afc_wc_2', 'afc_wc_3', 'nfc_wc_1', 'nfc_wc_2', 'nfc_wc_3'] },
        { key: 'divisional', games: ['afc_div_1', 'afc_div_2', 'nfc_div_1', 'nfc_div_2'] },
        { key: 'conference', games: ['afc_conf', 'nfc_conf'] },
        { key: 'superbowl', games: ['sb'] },
      ]
      
      let highestCompleteRound = 0
      for (let i = 0; i < rounds.length; i++) {
        const isComplete = rounds[i].games.every(gameKey => {
          const game = populated[gameKey]
          return game?.selected !== undefined && (game?.top || game?.bottom)
        })
        if (isComplete && i < rounds.length - 1) {
          highestCompleteRound = i + 1
        } else if (isComplete) {
          highestCompleteRound = i
        }
      }
      setCurrentRoundIndex(highestCompleteRound)
    }
  }, [searchParams])

  // Update URL when selections change
  useEffect(() => {
    const serial = getSerial(selections)
    const url = `${window.location.origin}${window.location.pathname}${serial !== 0 ? `?serial=${serial}` : ''}`
    setShareUrl(url)
    
    if (serial !== 0) {
      window.history.replaceState({}, '', `?serial=${serial}`)
    } else {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [selections])

  // Calculate champion for overlay effect (before early return)
  const champion = selections.sb?.selected === 'top' 
    ? selections.sb.top 
    : selections.sb?.selected === 'bottom' 
    ? selections.sb.bottom 
    : undefined

  // Update overlay colors with cross-fade effect
  useEffect(() => {
    if (champion && TEAM_GRADIENT_COLORS[champion]) {
      const teamColors = TEAM_GRADIENT_COLORS[champion]
      const newGradient = `linear-gradient(135deg, ${teamColors.main} 0%, #0C0E12 50%, ${teamColors.secondary} 100%)`
      // Only update if the gradient is different from what's currently active
      const currentActiveGradient = activeOverlay === 'first' ? overlayColors.first : overlayColors.second
      if (currentActiveGradient !== newGradient) {
        if (activeOverlay === 'first') {
          setOverlayColors(prev => ({ ...prev, second: newGradient }))
          setActiveOverlay('second')
        } else {
          setOverlayColors(prev => ({ ...prev, first: newGradient }))
          setActiveOverlay('first')
        }
      }
    } else {
      // Reset to default blue - only if we currently have a gradient
      const currentActiveGradient = activeOverlay === 'first' ? overlayColors.first : overlayColors.second
      if (currentActiveGradient !== null) {
        const defaultGradient = `linear-gradient(135deg, #161F2B 0%, #0C0E12 50%, #161F2B 100%)`
        if (activeOverlay === 'first') {
          setOverlayColors(prev => ({ ...prev, second: defaultGradient }))
          setActiveOverlay('second')
        } else {
          setOverlayColors(prev => ({ ...prev, first: defaultGradient }))
          setActiveOverlay('first')
        }
      }
    }
  }, [champion, activeOverlay, overlayColors.first, overlayColors.second])

  // Handle team click - toggle selection
  const handleTeamClick = (gameKey: GameKey, position: 'top' | 'bottom') => {
    setSelections(prev => {
      const updated = { ...prev }
      const current = updated[gameKey]
      
      // Toggle selection: if already selected, deselect; otherwise select
      if (current?.selected === position) {
        // Deselect
        updated[gameKey] = {
          ...current,
          selected: undefined,
        }
      } else {
        // Select this position
        updated[gameKey] = {
          ...current,
          selected: position,
        }
      }
      
      // Repopulate teams based on new selections
      return populateTeams(updated)
    })
  }

  const resetBracket = () => {
    setSelections(populateTeams({}))
    setCurrentRoundIndex(0) // Reset to wildcard round
    window.history.replaceState({}, '', window.location.pathname)
  }

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl)
    alert('Share URL copied to clipboard!')
  }


  // Swipe handlers for mobile carousel
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    
    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (Math.abs(distance) > minSwipeDistance) {
      manualNavigationRef.current = true // Mark as manual navigation
      if (distance > 0) {
        // Swipe left - next round
        setCurrentRoundIndex(prev => Math.min(prev + 1, 3))
      } else {
        // Swipe right - previous round
        setCurrentRoundIndex(prev => Math.max(prev - 1, 0))
      }
    }

    touchStartX.current = null
    touchEndX.current = null
  }

  // Render mobile carousel round
  const renderMobileRound = (roundIndex: number) => {
    switch (roundIndex) {
      case 0: // Wildcard
        return (
          <div className={styles.mobileRound}>
            <div className={styles.mobileRoundLabel}>Wildcard Round</div>
            <div className={styles.mobileRoundContent}>
              <div className={styles.mobileConference}>
                <div className={styles.mobileConferenceLabel}>AFC</div>
                <GameSlot
                  gameKey="afc_wc_1"
                  game={selections.afc_wc_1}
                  onTeamClick={handleTeamClick}
                  seeds={[7, 2]}
                  teamLogos={teamLogos}
                />
                <GameSlot
                  gameKey="afc_wc_2"
                  game={selections.afc_wc_2}
                  onTeamClick={handleTeamClick}
                  seeds={[6, 3]}
                  teamLogos={teamLogos}
                />
                <GameSlot
                  gameKey="afc_wc_3"
                  game={selections.afc_wc_3}
                  onTeamClick={handleTeamClick}
                  seeds={[5, 4]}
                  teamLogos={teamLogos}
                />
              </div>
              <div className={styles.mobileConference}>
                <div className={styles.mobileConferenceLabel}>NFC</div>
                <GameSlot
                  gameKey="nfc_wc_1"
                  game={selections.nfc_wc_1}
                  onTeamClick={handleTeamClick}
                  seeds={[7, 2]}
                  teamLogos={teamLogos}
                />
                <GameSlot
                  gameKey="nfc_wc_2"
                  game={selections.nfc_wc_2}
                  onTeamClick={handleTeamClick}
                  seeds={[6, 3]}
                  teamLogos={teamLogos}
                />
                <GameSlot
                  gameKey="nfc_wc_3"
                  game={selections.nfc_wc_3}
                  onTeamClick={handleTeamClick}
                  seeds={[5, 4]}
                  teamLogos={teamLogos}
                />
              </div>
            </div>
          </div>
        )
      case 1: // Divisional
        return (
          <div className={styles.mobileRound}>
            <div className={styles.mobileRoundLabel}>Divisional Round</div>
            <div className={styles.mobileRoundContent}>
              <div className={styles.mobileConference}>
                <div className={styles.mobileConferenceLabel}>AFC</div>
                <GameSlot
                  gameKey="afc_div_1"
                  game={selections.afc_div_1}
                  onTeamClick={handleTeamClick}
                  seeds={[null, 1]}
                  teamLogos={teamLogos}
                />
                <GameSlot
                  gameKey="afc_div_2"
                  game={selections.afc_div_2}
                  onTeamClick={handleTeamClick}
                  teamLogos={teamLogos}
                />
              </div>
              <div className={styles.mobileConference}>
                <div className={styles.mobileConferenceLabel}>NFC</div>
                <GameSlot
                  gameKey="nfc_div_1"
                  game={selections.nfc_div_1}
                  onTeamClick={handleTeamClick}
                  seeds={[null, 1]}
                  teamLogos={teamLogos}
                />
                <GameSlot
                  gameKey="nfc_div_2"
                  game={selections.nfc_div_2}
                  onTeamClick={handleTeamClick}
                  teamLogos={teamLogos}
                />
              </div>
            </div>
          </div>
        )
      case 2: // Conference
        return (
          <div className={styles.mobileRound}>
            <div className={styles.mobileRoundLabel}>Conference Championships</div>
            <div className={styles.mobileRoundContent}>
              <div className={styles.mobileConference}>
                <div className={styles.mobileConferenceLabel}>AFC</div>
                <GameSlot
                  gameKey="afc_conf"
                  game={selections.afc_conf}
                  onTeamClick={handleTeamClick}
                  teamLogos={teamLogos}
                />
              </div>
              <div className={styles.mobileConference}>
                <div className={styles.mobileConferenceLabel}>NFC</div>
                <GameSlot
                  gameKey="nfc_conf"
                  game={selections.nfc_conf}
                  onTeamClick={handleTeamClick}
                  teamLogos={teamLogos}
                />
              </div>
            </div>
          </div>
        )
      case 3: // Super Bowl
        return (
          <div className={styles.mobileRound}>
            <div className={styles.mobileRoundLabel}>Super Bowl</div>
            <div className={styles.mobileRoundContent}>
              <div className={styles.mobileSuperBowl}>
                <GameSlot
                  gameKey="sb"
                  game={selections.sb}
                  onTeamClick={handleTeamClick}
                  teamLogos={teamLogos}
                />
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  const bracketWrapperStyle = {
    '--gradient-color': '#161F2B', // Default blue (for CSS variable, not used in new implementation)
  } as React.CSSProperties

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer}></div>
      
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>NFL Playoff Bracket</h1>
          </div>
          <p className={styles.subtitle}>Make your picks for the 2026 NFL Playoffs</p>
        </div>
      </div>

      <div className={styles.bracketWrapper} style={bracketWrapperStyle}>
        <div 
          className={`${styles.bracketGradientOverlay} ${styles.bracketGradientOverlayFirst} ${activeOverlay === 'first' && overlayColors.first ? styles.bracketGradientOverlayActive : ''}`}
          style={{
            background: overlayColors.first || undefined,
          }}
        />
        <div 
          className={`${styles.bracketGradientOverlay} ${styles.bracketGradientOverlaySecond} ${activeOverlay === 'second' && overlayColors.second ? styles.bracketGradientOverlayActive : ''}`}
          style={{
            background: overlayColors.second || undefined,
          }}
        />
        <div className={styles.bracketContent}>
          {/* Desktop View */}
          <div className={styles.desktopBracket}>
            <div className={styles.topRow}>
            <div className={styles.afcLogo}>AFC</div>
            <div className={styles.championSection}>
              <div className={styles.championLabel}>Champion</div>
              <div className={styles.championTeam}>
                <TeamSlot
                  teamSlug={champion}
                  teamLogos={teamLogos}
                  onClick={() => {
                    if (selections.sb?.top && selections.sb?.bottom) {
                      const newSelected = selections.sb.selected === 'top' ? 'bottom' : 'top'
                      handleTeamClick('sb', newSelected)
                    }
                  }}
                  isChampion
                />
              </div>
            </div>
            <div className={styles.nfcLogo}>NFC</div>
          </div>

          <div className={styles.bracket}>
          {/* AFC Side */}
          <div className={styles.conferenceSection}>
            <div className={styles.round}>
              <div className={styles.roundLabel}>Wildcard</div>
              <div className={styles.roundContent}>
                <GameSlot
                  gameKey="afc_wc_1"
                  game={selections.afc_wc_1}
                  onTeamClick={handleTeamClick}
                  seeds={[7, 2]}
                  teamLogos={teamLogos}
                />
                <GameSlot
                  gameKey="afc_wc_2"
                  game={selections.afc_wc_2}
                  onTeamClick={handleTeamClick}
                  seeds={[6, 3]}
                  teamLogos={teamLogos}
                />
                <GameSlot
                  gameKey="afc_wc_3"
                  game={selections.afc_wc_3}
                  onTeamClick={handleTeamClick}
                  seeds={[5, 4]}
                  teamLogos={teamLogos}
                />
              </div>
            </div>

            <div className={styles.round}>
              <div className={styles.roundLabel}>Divisional</div>
              <div className={styles.roundContent}>
                <GameSlot
                  gameKey="afc_div_1"
                  game={selections.afc_div_1}
                  onTeamClick={handleTeamClick}
                  seeds={[null, 1]}
                  teamLogos={teamLogos}
                />
                <GameSlot
                  gameKey="afc_div_2"
                  game={selections.afc_div_2}
                  onTeamClick={handleTeamClick}
                  teamLogos={teamLogos}
                />
              </div>
            </div>

            <div className={styles.round}>
              <div className={styles.roundLabel}>Conference</div>
              <div className={styles.roundContent}>
                <GameSlot
                  gameKey="afc_conf"
                  game={selections.afc_conf}
                  onTeamClick={handleTeamClick}
                  teamLogos={teamLogos}
                />
              </div>
            </div>
          </div>

          {/* Super Bowl */}
          <div className={styles.superBowlSection}>
            <div className={styles.round}>
              <div className={styles.roundLabel}>Super Bowl</div>
              <div className={styles.roundContent}>
                <GameSlot
                  gameKey="sb"
                  game={selections.sb}
                  onTeamClick={handleTeamClick}
                  teamLogos={teamLogos}
                />
              </div>
            </div>
          </div>

          {/* NFC Side */}
          <div className={styles.conferenceSection}>
            <div className={styles.round}>
              <div className={styles.roundLabel}>Conference</div>
              <div className={styles.roundContent}>
                <GameSlot
                  gameKey="nfc_conf"
                  game={selections.nfc_conf}
                  onTeamClick={handleTeamClick}
                  teamLogos={teamLogos}
                />
              </div>
            </div>

            <div className={styles.round}>
              <div className={styles.roundLabel}>Divisional</div>
              <div className={styles.roundContent}>
                <GameSlot
                  gameKey="nfc_div_1"
                  game={selections.nfc_div_1}
                  onTeamClick={handleTeamClick}
                  seeds={[null, 1]}
                  teamLogos={teamLogos}
                />
                <GameSlot
                  gameKey="nfc_div_2"
                  game={selections.nfc_div_2}
                  onTeamClick={handleTeamClick}
                  teamLogos={teamLogos}
                />
              </div>
            </div>

            <div className={styles.round}>
              <div className={styles.roundLabel}>Wildcard</div>
              <div className={styles.roundContent}>
                <GameSlot
                  gameKey="nfc_wc_1"
                  game={selections.nfc_wc_1}
                  onTeamClick={handleTeamClick}
                  seeds={[7, 2]}
                  teamLogos={teamLogos}
                />
                <GameSlot
                  gameKey="nfc_wc_2"
                  game={selections.nfc_wc_2}
                  onTeamClick={handleTeamClick}
                  seeds={[6, 3]}
                  teamLogos={teamLogos}
                />
                <GameSlot
                  gameKey="nfc_wc_3"
                  game={selections.nfc_wc_3}
                  onTeamClick={handleTeamClick}
                  seeds={[5, 4]}
                  teamLogos={teamLogos}
                />
              </div>
            </div>
          </div>
        </div>
          </div>

          {/* Mobile Carousel View */}
          <div 
            className={styles.mobileCarousel}
            ref={carouselRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {renderMobileRound(currentRoundIndex)}
            <div className={styles.mobileCarouselIndicators}>
              {[0, 1, 2, 3].map((index) => (
                <button
                  key={index}
                  className={`${styles.mobileCarouselIndicator} ${currentRoundIndex === index ? styles.mobileCarouselIndicatorActive : ''}`}
                  onClick={() => {
                    manualNavigationRef.current = true // Mark as manual navigation
                    setCurrentRoundIndex(index)
                  }}
                  aria-label={`Round ${index + 1}`}
                />
              ))}
          </div>
        </div>

          <div className={styles.brandingSection}>
            <img 
              src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e2e0cb7ce335565e485fe4_BETTING%20INSIDER%20SVG.svg" 
              alt="The Betting Insider" 
              className={styles.brandLogo}
            />
            <a href="https://thebettinginsider.com" className={styles.brandLink} target="_blank" rel="noopener noreferrer">
              thebettinginsider.com
            </a>
          </div>
        </div>
      </div>

      <div className={styles.shareSection}>
        <button onClick={resetBracket} className={styles.resetButton}>Reset Selections</button>
        <label htmlFor="share_url" className={styles.shareLabel}>Share with this URL:</label>
        <div className={styles.shareInputContainer}>
          <input
            id="share_url"
            type="text"
            readOnly
            value={shareUrl}
            className={styles.shareInput}
          />
          <button onClick={copyShareUrl} className={styles.copyButton}>Copy</button>
        </div>
      </div>

    </div>
  )
}

export default function NFLPlayoffsPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    }>
      <NFLPlayoffsPageContent />
    </Suspense>
  )
}

function TeamSlot({
  teamSlug,
  onClick,
  seed,
  isChampion = false,
  isLocked = false,
  teamLogos,
  isSelected = false,
}: {
  teamSlug?: TeamSlug
  onClick: () => void
  seed?: number | null
  isChampion?: boolean
  isLocked?: boolean
  teamLogos: Record<string, string | null>
  isSelected?: boolean
}) {
  const teamName = teamSlug ? TEAM_NAMES[teamSlug] : ''
  const hasTeam = !!teamSlug
  const logo = teamSlug ? teamLogos[teamSlug] : null

  return (
    <div
      className={`${styles.teamSlot} ${hasTeam ? styles.teamSelected : ''} ${isChampion ? styles.championSlot : ''} ${isLocked ? styles.teamLocked : ''} ${isSelected ? styles.teamSelected : ''} ${isSelected ? styles.teamActuallySelected : ''}`}
      onClick={isLocked ? undefined : onClick}
      title={teamSlug || ''}
      style={isLocked ? { cursor: 'default' } : {}}
    >
      {logo ? (
        <img src={logo} alt={teamName} className={styles.teamLogo} />
      ) : (
        <div className={styles.teamLogoPlaceholder}>
          {teamSlug ? teamName.split(' ').pop()?.[0] || '' : ''}
        </div>
      )}
      <div className={styles.teamName}>
        {hasTeam ? (
          (() => {
            const nameParts = teamName.split(' ')
            if (nameParts.length >= 2) {
              // City is everything except the last word, mascot is the last word
              const city = nameParts.slice(0, -1).join(' ')
              const mascot = nameParts[nameParts.length - 1]
              return (
                <>
                  <div className={styles.teamCity}>{city}</div>
                  <div className={styles.teamMascot}>{mascot}</div>
                </>
              )
            }
            // Fallback for single-word team names
            return <div>{teamName}</div>
          })()
        ) : null}
      </div>
      {seed !== null && seed !== undefined && (
        <div className={styles.seed}>{seed}</div>
      )}
    </div>
  )
}

function GameSlot({
  gameKey,
  game,
  onTeamClick,
  seeds = [null, null],
  teamLogos,
  lockedPositions = [],
}: {
  gameKey: GameKey
  game?: GameSelection
  onTeamClick: (gameKey: GameKey, position: 'top' | 'bottom') => void
  seeds?: (number | null)[]
  teamLogos: Record<string, string | null>
  lockedPositions?: ('top' | 'bottom')[]
}) {
  const topTeam = game?.top
  const bottomTeam = game?.bottom
  const topSelected = game?.selected === 'top'
  const bottomSelected = game?.selected === 'bottom'

  return (
    <div className={styles.gameSlot}>
      <TeamSlot
        teamSlug={topTeam}
        onClick={() => onTeamClick(gameKey, 'top')}
        seed={seeds[0] ?? undefined}
        teamLogos={teamLogos}
        isLocked={lockedPositions.includes('top')}
        isSelected={topSelected}
      />
      <TeamSlot
        teamSlug={bottomTeam}
        onClick={() => onTeamClick(gameKey, 'bottom')}
        seed={seeds[1] ?? undefined}
        teamLogos={teamLogos}
        isLocked={lockedPositions.includes('bottom')}
        isSelected={bottomSelected}
      />
    </div>
  )
}
