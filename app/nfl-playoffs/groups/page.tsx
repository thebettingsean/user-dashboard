'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import styles from './groups.module.css'

function GroupsPageContent() {
  const router = useRouter()
  const { user, isSignedIn } = useUser()
  const { openSignIn } = useClerk()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)

  useEffect(() => {
    if (!isSignedIn) {
      openSignIn()
      return
    }

    if (isSignedIn && user?.id) {
      fetchGroups()
    }
  }, [isSignedIn, user?.id, openSignIn])

  const fetchGroups = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/nfl-playoffs/groups?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        // Transform the data to include group info
        const groupsList = (data.groups || []).map((membership: any) => ({
          ...membership.nfl_playoff_groups,
          membershipId: membership.id,
          joinedAt: membership.joined_at,
        }))
        setGroups(groupsList)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to delete "${groupName}"? This action cannot be undone.`)) {
      return
    }

    setDeletingGroupId(groupId)
    try {
      const response = await fetch(`/api/nfl-playoffs/groups/${groupId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove from local state
        setGroups(prev => prev.filter(g => g.id !== groupId))
        alert('Group deleted successfully')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      alert('Failed to delete group')
    } finally {
      setDeletingGroupId(null)
    }
  }

  if (!isSignedIn) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Please sign in to view your groups</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  const createdGroups = groups.filter(g => g.created_by === user?.id)
  const joinedGroups = groups.filter(g => g.created_by !== user?.id)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Groups</h1>
          <p className={styles.subtitle}>
            {groups.length} {groups.length === 1 ? 'group' : 'groups'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button 
            onClick={() => router.push('/nfl-playoffs')}
            className={styles.backButton}
          >
            Back to Bracket
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className={styles.emptyState}>
          <p>You haven't created or joined any groups yet.</p>
          <p>Create a group to get started!</p>
          <button 
            onClick={() => router.push('/nfl-playoffs')}
            className={styles.createButton}
          >
            Create a Group
          </button>
        </div>
      ) : (
        <>
          {createdGroups.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Groups I Created</h2>
              <div className={styles.groupsGrid}>
                {createdGroups.map((group) => (
                  <div key={group.id} className={styles.groupCard}>
                    <Link 
                      href={`/nfl-playoffs/group/${group.id}`}
                      className={styles.groupLink}
                    >
                      <h3 className={styles.groupName}>{group.name}</h3>
                      <p className={styles.groupMeta}>
                        Created {new Date(group.created_at).toLocaleDateString()}
                      </p>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDeleteGroup(group.id, group.name)
                      }}
                      disabled={deletingGroupId === group.id}
                      className={styles.deleteButton}
                    >
                      {deletingGroupId === group.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {joinedGroups.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Groups I Joined</h2>
              <div className={styles.groupsGrid}>
                {joinedGroups.map((group) => (
                  <div key={group.id} className={styles.groupCard}>
                    <Link 
                      href={`/nfl-playoffs/group/${group.id}`}
                      className={styles.groupLink}
                    >
                      <h3 className={styles.groupName}>{group.name}</h3>
                      <p className={styles.groupMeta}>
                        Joined {new Date(group.joinedAt).toLocaleDateString()}
                      </p>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function GroupsPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    }>
      <GroupsPageContent />
    </Suspense>
  )
}

