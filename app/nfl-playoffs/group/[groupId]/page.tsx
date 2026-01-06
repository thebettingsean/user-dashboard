'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import styles from './group.module.css'

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

// Max possible points (perfect bracket)
const MAX_POINTS = 190 // Wildcard (6*10) + Divisional (4*20) + Conference (2*40) + Super Bowl (1*80) = 300, but perfect bracket bonus = 190

// Get champion from bracket selections
function getChampion(selections: any): string | null {
  if (!selections || !selections.sb) return null
  const sb = selections.sb
  if (sb.selected === 'top' && sb.top) return sb.top
  if (sb.selected === 'bottom' && sb.bottom) return sb.bottom
  return null
}

export default function GroupPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    }>
      <GroupPageContent />
    </Suspense>
  )
}

function GroupPageContent() {
  const params = useParams()
  const router = useRouter()
  const { user, isSignedIn } = useUser()
  const { openSignIn } = useClerk()
  const groupId = params.groupId as string

  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [userBracket, setUserBracket] = useState<any>(null)
  const [teamLogos, setTeamLogos] = useState<Record<string, string | null>>({})

  useEffect(() => {
    if (!groupId) return

    // Check if user needs to join
    const urlParams = new URLSearchParams(window.location.search)
    const shouldJoin = urlParams.get('join') === 'true'

    if (shouldJoin && isSignedIn && user?.id) {
      handleJoinGroup()
    } else {
      fetchGroupData()
    }
  }, [groupId, isSignedIn, user?.id])

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
          
          // Match by last word
          const apiLastWord = apiLower.split(' ').pop() || ''
          const teamLastWord = teamLower.split(' ').pop() || ''
          if (apiLastWord && teamLastWord && apiLastWord === teamLastWord) return true
          
          // Match by city/state name
          const apiFirstWord = apiLower.split(' ')[0] || ''
          const teamFirstWord = teamLower.split(' ')[0] || ''
          if (apiFirstWord && teamFirstWord && apiFirstWord === teamFirstWord) return true
          
          // Match if one contains the other
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
        const allTeamSlugs = Object.keys(TEAM_NAMES)
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
        
        setTeamLogos(logoMap)
      } catch (error) {
        console.error('Failed to fetch team logos:', error)
      }
    }
    
    fetchTeamLogos()
  }, [])

  const fetchGroupData = async () => {
    setLoading(true)
    try {
      // Fetch group and members
      const groupResponse = await fetch(`/api/nfl-playoffs/groups?groupId=${groupId}`)
      if (groupResponse.ok) {
        const groupData = await groupResponse.json()
        setGroup(groupData.group)
        setMembers(groupData.members || [])
      }

      // Fetch leaderboard
      const leaderboardResponse = await fetch(`/api/nfl-playoffs/leaderboard?groupId=${groupId}`)
      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json()
        setLeaderboard(leaderboardData.leaderboard || [])
      }

      // Fetch user's bracket if signed in
      if (isSignedIn && user?.id) {
        const bracketResponse = await fetch(`/api/nfl-playoffs/brackets?groupId=${groupId}&userId=${user.id}`)
        if (bracketResponse.ok) {
          const bracketData = await bracketResponse.json()
          setUserBracket(bracketData.bracket)
        }
      }
    } catch (error) {
      console.error('Error fetching group data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGroup = async () => {
    if (!isSignedIn) {
      openSignIn()
      return
    }

    setJoining(true)
    try {
      const response = await fetch('/api/nfl-playoffs/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      })

      if (response.ok) {
        // Remove join param from URL
        window.history.replaceState({}, '', window.location.pathname)
        // Refresh group data
        fetchGroupData()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error joining group:', error)
      alert('Failed to join group')
    } finally {
      setJoining(false)
    }
  }

  const copyGroupLink = () => {
    const link = `${window.location.origin}/nfl-playoffs/group/${groupId}?join=true`
    navigator.clipboard.writeText(link)
    alert('Group link copied to clipboard!')
  }

  const isMember = isSignedIn && user?.id && members.some(m => m.user_id === user.id)
  const isCreator = group && isSignedIn && user?.id && group.created_by === user.id

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Group not found</div>
        <Link href="/nfl-playoffs" className={styles.backLink}>Back to Bracket</Link>
      </div>
    )
  }

  const shareLink = `${window.location.origin}/nfl-playoffs/group/${groupId}?join=true`

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.groupName}>{group.name}</h1>
          <p className={styles.groupInfo}>
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={copyGroupLink} className={styles.shareButton}>
            Copy Link
          </button>
          {!isMember && isSignedIn && (
            <button onClick={handleJoinGroup} disabled={joining} className={styles.joinButton}>
              {joining ? 'Joining...' : 'Join Group'}
            </button>
          )}
          {!isSignedIn && (
            <button onClick={() => openSignIn()} className={styles.joinButton}>
              Sign In to Join
            </button>
          )}
        </div>
      </div>

      {isMember && (
        <div className={styles.bracketSection}>
          <h2>Your Bracket</h2>
          {userBracket ? (
            <div>
              <p className={styles.bracketNameDisplay}>
                <strong>Bracket Name:</strong> {userBracket.name || 'Unnamed Bracket'}
              </p>
              <p>Score: {userBracket.score} points (Max: {MAX_POINTS} points)</p>
              {(() => {
                const champion = getChampion(userBracket.selections)
                const championName = champion ? TEAM_NAMES[champion] || champion : null
                return championName ? (
                  <p className={styles.championDisplay}>
                    <strong>Champion Pick:</strong> {championName}
                  </p>
                ) : null
              })()}
              <Link 
                href={`/nfl-playoffs/submit?groupId=${groupId}`}
                className={styles.editBracketButton}
              >
                Edit Your Bracket
              </Link>
            </div>
          ) : (
            <div>
              <p>You haven't submitted a bracket yet.</p>
              <Link 
                href={`/nfl-playoffs/submit?groupId=${groupId}`}
                className={styles.editBracketButton}
              >
                Create Your Bracket
              </Link>
            </div>
          )}
        </div>
      )}

      <div className={styles.leaderboardSection}>
        <h2>Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className={styles.noBrackets}>No brackets submitted yet.</p>
        ) : (
          <div className={styles.leaderboard}>
            {leaderboard.map((entry, index) => {
              const champion = getChampion(entry.selections)
              const championLogo = champion ? teamLogos[champion] : null
              
              return (
                <div 
                  key={entry.id} 
                  className={`${styles.leaderboardEntry} ${entry.user_id === user?.id ? styles.currentUser : ''}`}
                >
                  <div className={styles.rank}>#{index + 1}</div>
                  <div className={styles.mobileContent}>
                    <div className={styles.mobileTopRow}>
                      {champion && (
                        <div className={styles.championPick}>
                          {championLogo ? (
                            <img 
                              src={championLogo} 
                              alt={TEAM_NAMES[champion] || champion} 
                              className={styles.championLogo}
                            />
                          ) : (
                            <div className={styles.championPlaceholder}>
                              {champion.slice(0, 3).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                      <div className={styles.mobileBracketInfo}>
                        <div className={styles.bracketName}>{entry.name || 'Unnamed Bracket'}</div>
                        <div className={styles.userId}>
                          {entry.user_id === user?.id ? 'You' : (entry.userDisplayName || `User ${entry.user_id.slice(0, 8)}...`)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.desktopContent}>
                    {champion && (
                      <div className={styles.championPick}>
                        {championLogo ? (
                          <img 
                            src={championLogo} 
                            alt={TEAM_NAMES[champion] || champion} 
                            className={styles.championLogo}
                          />
                        ) : (
                          <div className={styles.championPlaceholder}>
                            {champion.slice(0, 3).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}
                    <div className={styles.userInfo}>
                      <div className={styles.bracketName}>{entry.name || 'Unnamed Bracket'}</div>
                      <div className={styles.userId}>
                        {entry.user_id === user?.id ? 'You' : (entry.userDisplayName || `User ${entry.user_id.slice(0, 8)}...`)}
                      </div>
                    </div>
                  </div>
                  <div className={styles.scoreInfo}>
                    <div className={styles.score}>{entry.score} pts</div>
                    <div className={styles.maxPoints}>Max: {MAX_POINTS} pts</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className={styles.membersSection}>
        <h2>Members</h2>
        <div className={styles.membersList}>
          {members.map((member) => (
            <div key={member.id} className={styles.member}>
              <div className={styles.memberId}>
                {member.user_id === user?.id ? 'You' : (member.userDisplayName || `User ${member.user_id.slice(0, 8)}...`)}
              </div>
              {member.user_id === group.created_by && (
                <span className={styles.creatorBadge}>Creator</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <Link href="/nfl-playoffs" className={styles.backLink}>Back to Bracket</Link>
    </div>
  )
}

