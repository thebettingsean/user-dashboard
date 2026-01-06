'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './scores.module.css'

const GAME_KEYS = [
  'afc_wc_1',
  'afc_wc_2',
  'afc_wc_3',
  'nfc_wc_1',
  'nfc_wc_2',
  'nfc_wc_3',
  'afc_div_1',
  'afc_div_2',
  'nfc_div_1',
  'nfc_div_2',
  'afc_conf',
  'nfc_conf',
  'sb',
] as const

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
function sortTeams(teams: (string | undefined)[], confRank: string[]): string[] {
  return teams
    .filter((t): t is string => !!t)
    .sort((a, b) => {
      const aIndex = confRank.indexOf(a)
      const bIndex = confRank.indexOf(b)
      return aIndex - bIndex
    })
}

// Get matchup for a game based on game results
function getGameMatchup(gameKey: string, gameResults: Record<string, string>): { top: string | null; bottom: string | null } {
  // Wildcard games - use default matchups
  if (gameKey === 'afc_wc_1') {
    return { top: DEFAULT_TEAMS.afc[6], bottom: DEFAULT_TEAMS.afc[1] } // 7 vs 2
  }
  if (gameKey === 'afc_wc_2') {
    return { top: DEFAULT_TEAMS.afc[5], bottom: DEFAULT_TEAMS.afc[2] } // 6 vs 3
  }
  if (gameKey === 'afc_wc_3') {
    return { top: DEFAULT_TEAMS.afc[4], bottom: DEFAULT_TEAMS.afc[3] } // 5 vs 4
  }
  if (gameKey === 'nfc_wc_1') {
    return { top: DEFAULT_TEAMS.nfc[6], bottom: DEFAULT_TEAMS.nfc[1] } // 7 vs 2
  }
  if (gameKey === 'nfc_wc_2') {
    return { top: DEFAULT_TEAMS.nfc[5], bottom: DEFAULT_TEAMS.nfc[2] } // 6 vs 3
  }
  if (gameKey === 'nfc_wc_3') {
    return { top: DEFAULT_TEAMS.nfc[4], bottom: DEFAULT_TEAMS.nfc[3] } // 5 vs 4
  }

  // AFC Divisional
  if (gameKey === 'afc_div_1') {
    const wc1Winner = gameResults['afc_wc_1']
    const wc2Winner = gameResults['afc_wc_2']
    const wc3Winner = gameResults['afc_wc_3']
    const divTeams = sortTeams([
      DEFAULT_TEAMS.afc[0], // #1 seed
      wc1Winner,
      wc2Winner,
      wc3Winner,
    ], DEFAULT_TEAMS.afc)
    return { top: divTeams[3] || null, bottom: DEFAULT_TEAMS.afc[0] } // #1 seed always at bottom
  }
  if (gameKey === 'afc_div_2') {
    const wc1Winner = gameResults['afc_wc_1']
    const wc2Winner = gameResults['afc_wc_2']
    const wc3Winner = gameResults['afc_wc_3']
    const divTeams = sortTeams([
      DEFAULT_TEAMS.afc[0], // #1 seed
      wc1Winner,
      wc2Winner,
      wc3Winner,
    ], DEFAULT_TEAMS.afc)
    return { top: divTeams[2] || null, bottom: divTeams[1] || null }
  }

  // NFC Divisional
  if (gameKey === 'nfc_div_1') {
    const wc1Winner = gameResults['nfc_wc_1']
    const wc2Winner = gameResults['nfc_wc_2']
    const wc3Winner = gameResults['nfc_wc_3']
    const divTeams = sortTeams([
      DEFAULT_TEAMS.nfc[0], // #1 seed
      wc1Winner,
      wc2Winner,
      wc3Winner,
    ], DEFAULT_TEAMS.nfc)
    return { top: divTeams[3] || null, bottom: DEFAULT_TEAMS.nfc[0] } // #1 seed always at bottom
  }
  if (gameKey === 'nfc_div_2') {
    const wc1Winner = gameResults['nfc_wc_1']
    const wc2Winner = gameResults['nfc_wc_2']
    const wc3Winner = gameResults['nfc_wc_3']
    const divTeams = sortTeams([
      DEFAULT_TEAMS.nfc[0], // #1 seed
      wc1Winner,
      wc2Winner,
      wc3Winner,
    ], DEFAULT_TEAMS.nfc)
    return { top: divTeams[2] || null, bottom: divTeams[1] || null }
  }

  // AFC Conference
  if (gameKey === 'afc_conf') {
    const div1Winner = gameResults['afc_div_1']
    const div2Winner = gameResults['afc_div_2']
    const confTeams = sortTeams([div1Winner, div2Winner], DEFAULT_TEAMS.afc)
    return { top: confTeams[1] || null, bottom: confTeams[0] || null }
  }

  // NFC Conference
  if (gameKey === 'nfc_conf') {
    const div1Winner = gameResults['nfc_div_1']
    const div2Winner = gameResults['nfc_div_2']
    const confTeams = sortTeams([div1Winner, div2Winner], DEFAULT_TEAMS.nfc)
    return { top: confTeams[1] || null, bottom: confTeams[0] || null }
  }

  // Super Bowl
  if (gameKey === 'sb') {
    const afcWinner = gameResults['afc_conf']
    const nfcWinner = gameResults['nfc_conf']
    return { top: afcWinner || null, bottom: nfcWinner || null }
  }

  return { top: null, bottom: null }
}

export default function ScoresPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [gameResults, setGameResults] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Check if already authenticated (stored in sessionStorage)
    const isAuth = sessionStorage.getItem('nfl_scores_auth') === 'true'
    if (isAuth) {
      setAuthenticated(true)
      fetchGameResults()
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'sean') {
      setAuthenticated(true)
      sessionStorage.setItem('nfl_scores_auth', 'true')
      fetchGameResults()
    } else {
      alert('Incorrect password')
    }
  }

  const fetchGameResults = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/nfl-playoffs/scores')
      if (response.ok) {
        const data = await response.json()
        const resultsMap: Record<string, string> = {}
        data.results?.forEach((result: any) => {
          resultsMap[result.game_key] = result.winner
        })
        setGameResults(resultsMap)
      }
    } catch (error) {
      console.error('Error fetching game results:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitResult = async (gameKey: string, winner: string) => {
    setSaving(true)
    try {
      const response = await fetch('/api/nfl-playoffs/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameKey, winner, password: 'sean' }),
      })

      if (response.ok) {
        const data = await response.json()
        setGameResults(prev => ({ ...prev, [gameKey]: winner }))
        alert('Game result saved and scores updated!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error submitting result:', error)
      alert('Failed to save result')
    } finally {
      setSaving(false)
    }
  }

  if (!authenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.loginBox}>
          <h1>NFL Playoff Scores</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className={styles.passwordInput}
              autoFocus
            />
            <button type="submit" className={styles.loginButton}>
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>NFL Playoff Scores</h1>
        <button onClick={() => router.push('/nfl-playoffs')} className={styles.backButton}>
          Back to Bracket
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : (
        <div className={styles.gamesList}>
          {GAME_KEYS.map((gameKey) => {
            const currentWinner = gameResults[gameKey]
            const round = gameKey.includes('wc') ? 'wildcard' : 
                         gameKey.includes('div') ? 'divisional' :
                         gameKey.includes('conf') ? 'conference' : 'superbowl'
            
            // Get actual matchup for this game
            const matchup = getGameMatchup(gameKey, gameResults)
            const matchupTeams = [matchup.top, matchup.bottom].filter(Boolean) as string[]
            
            // Get all possible teams for this conference/round
            const isAFC = gameKey.startsWith('afc') || gameKey === 'sb'
            const isNFC = gameKey.startsWith('nfc') || gameKey === 'sb'
            const allTeams = gameKey === 'sb' 
              ? [...DEFAULT_TEAMS.afc, ...DEFAULT_TEAMS.nfc]
              : isAFC 
                ? DEFAULT_TEAMS.afc 
                : DEFAULT_TEAMS.nfc
            
            return (
              <div key={gameKey} className={styles.gameCard}>
                <h3>
                  {matchup.top && matchup.bottom 
                    ? `${TEAM_NAMES[matchup.top] || matchup.top} vs ${TEAM_NAMES[matchup.bottom] || matchup.bottom}`
                    : gameKey.replace(/_/g, ' ').toUpperCase()}
                </h3>
                <p className={styles.round}>Round: {round}</p>
                {currentWinner && (
                  <p className={styles.currentWinner}>
                    Winner: {TEAM_NAMES[currentWinner] || currentWinner}
                  </p>
                )}
                <div className={styles.teamSelector}>
                  <label>Select Winner:</label>
                  <select
                    value={currentWinner || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleSubmitResult(gameKey, e.target.value)
                      }
                    }}
                    disabled={saving}
                    className={styles.teamSelect}
                  >
                    <option value="">-- Select Team --</option>
                    {/* Show matchup teams first if available */}
                    {matchupTeams.length > 0 && matchupTeams.map((team) => (
                      <option key={team} value={team}>
                        {TEAM_NAMES[team] || team}
                      </option>
                    ))}
                    {/* Show all teams as fallback */}
                    {allTeams.map((team) => {
                      if (matchupTeams.includes(team)) return null // Already shown above
                      return (
                        <option key={team} value={team}>
                          {TEAM_NAMES[team] || team}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

