'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import styles from '../nfl-playoffs.module.css'

// Import types and constants from main page
type TeamSlug = string

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
  selected?: 'top' | 'bottom'
}

interface BracketSelections {
  [key: string]: GameSelection
}

const TEAM_GRADIENT_COLORS: Record<string, { main: string; secondary: string }> = {
  broncos: { main: '#4A1405', secondary: '#000811' },
  panthers: { main: '#002133', secondary: '#000000' },
  jaguars: { main: '#00191E', secondary: '#000000' },
  steelers: { main: '#000000', secondary: '#3E2D05' },
  patriots: { main: '#000911', secondary: '#2A0000' },
  chargers: { main: '#002032', secondary: '#3E2D05' },
  bills: { main: '#000D24', secondary: '#2A0000' },
  texans: { main: '#00080A', secondary: '#2A0000' },
  packers: { main: '#080D0C', secondary: '#3E2D05' },
  bears: { main: '#02050B', secondary: '#4A1405' },
  fortyniners: { main: '#2A0000', secondary: '#3E2D05' },
  eagles: { main: '#001315', secondary: '#252525' },
  seahawks: { main: '#000911', secondary: '#003300' },
  rams: { main: '#000E25', secondary: '#3E2D05' },
}

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

// Sort teams by their seed/rank order
function sortTeams(teams: (TeamSlug | undefined)[], confRank: TeamSlug[]): TeamSlug[] {
  return teams
    .filter((t): t is TeamSlug => !!t)
    .sort((a, b) => {
      const aIndex = confRank.indexOf(a)
      const bIndex = confRank.indexOf(b)
      return aIndex - bIndex
    })
}

// Populate teams in each round based on selections
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
  
  // Ensure #1 seed (Broncos) is always at bottom of div_1
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
  
  // Ensure #1 seed (Seahawks) is always at bottom of div_1
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

function SubmitPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isSignedIn } = useUser()
  const { openSignIn } = useClerk()
  
  const groupId = searchParams.get('groupId')
  const [selections, setSelections] = useState<BracketSelections>(() => populateTeams({}))
  const [teamLogos, setTeamLogos] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [group, setGroup] = useState<any>(null)
  const [existingBracket, setExistingBracket] = useState<any>(null)
  const [bracketName, setBracketName] = useState('')

  // Redirect if not signed in
  useEffect(() => {
    if (!isSignedIn) {
      openSignIn()
    }
  }, [isSignedIn, openSignIn])

  // Redirect if no groupId
  useEffect(() => {
    if (!groupId) {
      router.push('/nfl-playoffs')
    }
  }, [groupId, router])

  // Fetch group info and existing bracket
  useEffect(() => {
    if (!groupId || !isSignedIn || !user?.id) return

    async function fetchData() {
      try {
        // Fetch group
        const groupResponse = await fetch(`/api/nfl-playoffs/groups?groupId=${groupId}`)
        if (groupResponse.ok) {
          const groupData = await groupResponse.json()
          setGroup(groupData.group)
        }

        // Fetch existing bracket
        const bracketResponse = await fetch(`/api/nfl-playoffs/brackets?groupId=${groupId}&userId=${user.id}`)
        if (bracketResponse.ok) {
          const bracketData = await bracketResponse.json()
          if (bracketData.bracket) {
            setExistingBracket(bracketData.bracket)
            setSelections(bracketData.bracket.selections)
            setBracketName(bracketData.bracket.name || '')
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [groupId, isSignedIn, user?.id])

  // Fetch team logos (same as main page)
  useEffect(() => {
    async function fetchTeamLogos() {
      try {
        const logoMap: Record<string, string | null> = {}
        
        const matchTeamName = (apiName: string, teamName: string): boolean => {
          if (!apiName || !teamName) return false
          const apiLower = apiName.toLowerCase().trim()
          const teamLower = teamName.toLowerCase().trim()
          if (apiLower === teamLower) return true
          const apiLastWord = apiLower.split(' ').pop() || ''
          const teamLastWord = teamLower.split(' ').pop() || ''
          if (apiLastWord && teamLastWord && apiLastWord === teamLastWord) return true
          return false
        }
        
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
                  if (teamName && teamsData.teams[teamName]) {
                    logoMap[slug] = teamsData.teams[teamName]
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error fetching missing logos:', err)
          }
        }
        
        setTeamLogos(logoMap)
      } catch (error) {
        console.error('Failed to fetch team logos:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchTeamLogos()
  }, [])

  const handleTeamClick = (gameKey: GameKey, position: 'top' | 'bottom') => {
    setSelections(prev => {
      const updated = { ...prev }
      const current = updated[gameKey]
      
      if (current?.selected === position) {
        updated[gameKey] = {
          ...current,
          selected: undefined,
        }
      } else {
        updated[gameKey] = {
          ...current,
          selected: position,
        }
      }
      
      return populateTeams(updated)
    })
  }

  const handleSubmit = async () => {
    if (!groupId || !isSignedIn || submitting) return

    // Require bracket name for first-time submissions
    if (!existingBracket && (!bracketName || bracketName.trim().length === 0)) {
      alert('Please enter a bracket name before submitting')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/nfl-playoffs/brackets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          selections,
          name: bracketName.trim(),
        }),
      })

      if (response.ok) {
        alert('Bracket submitted successfully!')
        router.push(`/nfl-playoffs/group/${groupId}`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error submitting bracket:', error)
      alert('Failed to submit bracket')
    } finally {
      setSubmitting(false)
    }
  }

  const champion = selections.sb?.selected === 'top' 
    ? selections.sb.top 
    : selections.sb?.selected === 'bottom' 
    ? selections.sb.bottom 
    : undefined

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Please sign in to submit a bracket</div>
      </div>
    )
  }

  if (!groupId) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>No group specified</div>
        <Link href="/nfl-playoffs" className={styles.backLink}>Back to Bracket</Link>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer}></div>
      
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>
              {existingBracket ? 'Edit Your Bracket' : 'Submit Your Bracket'}
            </h1>
          </div>
          {group && (
            <p className={styles.subtitle}>Group: {group.name}</p>
          )}
        </div>
        <Link href={`/nfl-playoffs/group/${groupId}`} style={{ padding: '10px 20px', background: 'rgba(41, 47, 63, 0.6)', border: '1px solid rgba(50, 51, 53, 0.5)', borderRadius: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '500', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Back to Group
        </Link>
      </div>

      <div className={styles.bracketWrapper}>
        <div className={styles.bracketContent}>
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
                    <GameSlot gameKey="afc_wc_1" game={selections.afc_wc_1} onTeamClick={handleTeamClick} seeds={[7, 2]} teamLogos={teamLogos} />
                    <GameSlot gameKey="afc_wc_2" game={selections.afc_wc_2} onTeamClick={handleTeamClick} seeds={[6, 3]} teamLogos={teamLogos} />
                    <GameSlot gameKey="afc_wc_3" game={selections.afc_wc_3} onTeamClick={handleTeamClick} seeds={[5, 4]} teamLogos={teamLogos} />
                  </div>
                </div>
                <div className={styles.round}>
                  <div className={styles.roundLabel}>Divisional</div>
                  <div className={styles.roundContent}>
                    <GameSlot gameKey="afc_div_1" game={selections.afc_div_1} onTeamClick={handleTeamClick} seeds={[null, 1]} teamLogos={teamLogos} />
                    <GameSlot gameKey="afc_div_2" game={selections.afc_div_2} onTeamClick={handleTeamClick} teamLogos={teamLogos} />
                  </div>
                </div>
                <div className={styles.round}>
                  <div className={styles.roundLabel}>Conference</div>
                  <div className={styles.roundContent}>
                    <GameSlot gameKey="afc_conf" game={selections.afc_conf} onTeamClick={handleTeamClick} teamLogos={teamLogos} />
                  </div>
                </div>
              </div>

              {/* Super Bowl */}
              <div className={styles.superBowlSection}>
                <div className={styles.round}>
                  <div className={styles.roundLabel}>Super Bowl</div>
                  <div className={styles.roundContent}>
                    <GameSlot gameKey="sb" game={selections.sb} onTeamClick={handleTeamClick} teamLogos={teamLogos} />
                  </div>
                </div>
              </div>

              {/* NFC Side */}
              <div className={styles.conferenceSection}>
                <div className={styles.round}>
                  <div className={styles.roundLabel}>Conference</div>
                  <div className={styles.roundContent}>
                    <GameSlot gameKey="nfc_conf" game={selections.nfc_conf} onTeamClick={handleTeamClick} teamLogos={teamLogos} />
                  </div>
                </div>
                <div className={styles.round}>
                  <div className={styles.roundLabel}>Divisional</div>
                  <div className={styles.roundContent}>
                    <GameSlot gameKey="nfc_div_1" game={selections.nfc_div_1} onTeamClick={handleTeamClick} seeds={[null, 1]} teamLogos={teamLogos} />
                    <GameSlot gameKey="nfc_div_2" game={selections.nfc_div_2} onTeamClick={handleTeamClick} teamLogos={teamLogos} />
                  </div>
                </div>
                <div className={styles.round}>
                  <div className={styles.roundLabel}>Wildcard</div>
                  <div className={styles.roundContent}>
                    <GameSlot gameKey="nfc_wc_1" game={selections.nfc_wc_1} onTeamClick={handleTeamClick} seeds={[7, 2]} teamLogos={teamLogos} />
                    <GameSlot gameKey="nfc_wc_2" game={selections.nfc_wc_2} onTeamClick={handleTeamClick} seeds={[6, 3]} teamLogos={teamLogos} />
                    <GameSlot gameKey="nfc_wc_3" game={selections.nfc_wc_3} onTeamClick={handleTeamClick} seeds={[5, 4]} teamLogos={teamLogos} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.shareSection}>
        {!existingBracket && (
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="bracket_name" style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#696969', marginBottom: '12px' }}>
              Bracket Name (required, unique per group):
            </label>
            <input
              id="bracket_name"
              type="text"
              value={bracketName}
              onChange={(e) => setBracketName(e.target.value)}
              placeholder="Enter bracket name"
              style={{
                width: '100%',
                maxWidth: '600px',
                padding: '12px',
                background: 'rgba(41, 47, 63, 0.5)',
                border: '1px solid rgba(50, 51, 53, 0.5)',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '14px',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                boxSizing: 'border-box',
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && bracketName.trim()) {
                  handleSubmit()
                }
              }}
            />
          </div>
        )}
        {existingBracket && (
          <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(41, 47, 63, 0.3)', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#ffffff' }}>
              <strong>Bracket Name:</strong> {existingBracket.name}
            </p>
          </div>
        )}
        <button 
          onClick={handleSubmit} 
          className={styles.submitButton}
          disabled={submitting || (!existingBracket && !bracketName.trim())}
        >
          {submitting ? 'Submitting...' : existingBracket ? 'Update Bracket' : 'Submit Bracket'}
        </button>
        <Link href={`/nfl-playoffs/group/${groupId}`} style={{ display: 'block', textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', fontSize: '14px', marginTop: '12px' }}>
          Cancel
        </Link>
      </div>
    </div>
  )
}

// TeamSlot and GameSlot components (simplified versions)
function TeamSlot({
  teamSlug,
  onClick,
  seed,
  isChampion = false,
  teamLogos,
  isSelected = false,
}: {
  teamSlug?: TeamSlug
  onClick: () => void
  seed?: number | null
  isChampion?: boolean
  teamLogos: Record<string, string | null>
  isSelected?: boolean
}) {
  const teamName = teamSlug ? TEAM_NAMES[teamSlug] : ''
  const hasTeam = !!teamSlug
  const logo = teamSlug ? teamLogos[teamSlug] : null

  return (
    <div
      className={`${styles.teamSlot} ${hasTeam ? styles.teamSelected : ''} ${isChampion ? styles.championSlot : ''} ${isSelected ? styles.teamSelected : ''}`}
      onClick={onClick}
      title={teamSlug || ''}
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
              const city = nameParts.slice(0, -1).join(' ')
              const mascot = nameParts[nameParts.length - 1]
              return (
                <>
                  <div className={styles.teamCity}>{city}</div>
                  <div className={styles.teamMascot}>{mascot}</div>
                </>
              )
            }
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
}: {
  gameKey: GameKey
  game?: GameSelection
  onTeamClick: (gameKey: GameKey, position: 'top' | 'bottom') => void
  seeds?: (number | null)[]
  teamLogos: Record<string, string | null>
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
        isSelected={topSelected}
      />
      <TeamSlot
        teamSlug={bottomTeam}
        onClick={() => onTeamClick(gameKey, 'bottom')}
        seed={seeds[1] ?? undefined}
        teamLogos={teamLogos}
        isSelected={bottomSelected}
      />
    </div>
  )
}

export default function SubmitPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    }>
      <SubmitPageContent />
    </Suspense>
  )
}

