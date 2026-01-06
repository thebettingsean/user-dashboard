'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import styles from './group.module.css'

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
              <p>You have submitted a bracket. Score: {userBracket.score} points</p>
              <Link 
                href={`/nfl-playoffs?groupId=${groupId}`}
                className={styles.editBracketButton}
              >
                Edit Your Bracket
              </Link>
            </div>
          ) : (
            <div>
              <p>You haven't submitted a bracket yet.</p>
              <Link 
                href={`/nfl-playoffs?groupId=${groupId}`}
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
            {leaderboard.map((entry, index) => (
              <div 
                key={entry.id} 
                className={`${styles.leaderboardEntry} ${entry.user_id === user?.id ? styles.currentUser : ''}`}
              >
                <div className={styles.rank}>#{index + 1}</div>
                <div className={styles.userInfo}>
                  <div className={styles.userId}>
                    {entry.user_id === user?.id ? 'You' : `User ${entry.user_id.slice(0, 8)}...`}
                  </div>
                  {entry.submitted_at && (
                    <div className={styles.submittedAt}>
                      Submitted {new Date(entry.submitted_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className={styles.score}>{entry.score} pts</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.membersSection}>
        <h2>Members</h2>
        <div className={styles.membersList}>
          {members.map((member) => (
            <div key={member.id} className={styles.member}>
              <div className={styles.memberId}>
                {member.user_id === user?.id ? 'You' : `User ${member.user_id.slice(0, 8)}...`}
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

