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
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  useEffect(() => {
    if (!isSignedIn) {
      openSignIn({
        redirectUrl: window.location.href
      })
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

  const handleCreateGroup = async () => {
    if (!groupName.trim() || creatingGroup) return

    setCreatingGroup(true)
    try {
      const response = await fetch('/api/nfl-playoffs/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setShowCreateGroupModal(false)
        setGroupName('')
        // Redirect to group page
        router.push(`/nfl-playoffs/group/${data.group.id}`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Failed to create group')
    } finally {
      setCreatingGroup(false)
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
            onClick={() => {
              if (!isSignedIn) {
                openSignIn({
                  redirectUrl: window.location.href
                })
              } else {
                setShowCreateGroupModal(true)
              }
            }}
            className={styles.createButton}
          >
            Create Group
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className={styles.emptyState}>
          <p>You haven't created or joined any groups yet.</p>
          <p>Create a group to get started!</p>
          <button 
            onClick={() => {
              if (!isSignedIn) {
                openSignIn({
                  redirectUrl: window.location.href
                })
              } else {
                setShowCreateGroupModal(true)
              }
            }}
            className={styles.emptyStateCreateButton}
          >
            Create a Group
          </button>
        </div>
      ) : (
        <>
          {createdGroups.length > 0 && (
            <div className={styles.section}>
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

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateGroupModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Create a Group</h2>
            <p>Enter a unique name for your bracket competition group:</p>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
              className={styles.modalInput}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateGroup()
                }
              }}
            />
            <div className={styles.modalButtons}>
              <button onClick={handleCreateGroup} disabled={creatingGroup || !groupName.trim()}>
                {creatingGroup ? 'Creating...' : 'Create'}
              </button>
              <button onClick={() => {
                setShowCreateGroupModal(false)
                setGroupName('')
              }} disabled={creatingGroup}>
                Cancel
              </button>
            </div>
          </div>
        </div>
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

