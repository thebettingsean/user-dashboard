# Saved Queries Feature - Complete Step-by-Step Guide

## Overview
This guide will walk you through implementing the saved queries feature from start to finish. We'll add the ability for users to save their query builds, load them later, and manage them.

---

## Step 1: Set Up the Database Table

### What This Does
Creates a table in your Supabase database to store saved queries.

### How to Do It

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Sign in to your account
   - Find your **USERS** project (the one where you store user data)
   - The URL should be something like: `https://pkmqhozyorpmteytizut.supabase.co`

2. **Open the SQL Editor**
   - In the left sidebar, click on "SQL Editor"
   - Click "New query"

3. **Copy and Paste the SQL**
   - Open the file `supabase-saved-queries-setup.sql` in your project
   - Copy ALL the contents
   - Paste it into the SQL Editor in Supabase

4. **Run the SQL**
   - Click the "Run" button (or press Ctrl/Cmd + Enter)
   - You should see a success message
   - If you see any errors, let me know and I'll help fix them

5. **Verify It Worked**
   - In the left sidebar, click "Table Editor"
   - You should see a new table called `saved_queries`
   - If you see it, you're good to go!

---

## Step 2: Understand What We're Adding

### Files Already Created
✅ `supabase-saved-queries-setup.sql` - Database setup (you just ran this)
✅ `app/api/saved-queries/route.ts` - API to list/create queries
✅ `app/api/saved-queries/[id]/route.ts` - API to get/update/delete queries
✅ `app/api/saved-queries/[id]/run/route.ts` - API to track query runs
✅ `lib/saved-queries.ts` - Helper functions to convert state to/from JSON

### What We Need to Add
We need to add UI components to the sports engine page (`app/sports-engine/page.tsx`) to:
1. Show a "Save Build" button
2. Show a modal to name the saved query
3. Display saved queries in the sidebar
4. Allow loading and deleting saved queries

---

## Step 3: Add the UI Components (The Big Step)

### Step 3.1: Add Required Imports

**Location:** Near the top of `app/sports-engine/page.tsx`, with the other imports

**Find this section:**
```typescript
import { FiCopy, FiCheck, FiMenu, FiChevronLeft } from "react-icons/fi"
```

**Add these imports right after it:**
```typescript
import { useUser } from "@clerk/nextjs"
import { serializeQueryState, deserializeQueryConfig } from "@/lib/saved-queries"
```

### Step 3.2: Add State Variables

**Location:** Inside the `SportsEngineContent` function, with the other `useState` declarations (around line 250-410)

**Find a section that looks like:**
```typescript
const [sidebarOpen, setSidebarOpen] = useState(false)
const [activeSection, setActiveSection] = useState<'builder' | 'myBuilds' | 'buddy' | 'topBuilds' | 'preferences'>('builder')
```

**Add these new state variables right after the sidebar state:**
```typescript
// Saved queries state
const { user, isSignedIn } = useUser()
const [savedQueries, setSavedQueries] = useState<any[]>([])
const [showSaveModal, setShowSaveModal] = useState(false)
const [saveQueryName, setSaveQueryName] = useState('')
const [saveQueryDescription, setSaveQueryDescription] = useState('')
const [savingQuery, setSavingQuery] = useState(false)
const [loadingSavedQueries, setLoadingSavedQueries] = useState(false)
const [deletingQueryId, setDeletingQueryId] = useState<string | null>(null)
```

### Step 3.3: Add Functions to Load/Save/Delete Queries

**Location:** After the `clearFilters` function (around line 530), before the `useEffect` hooks

**Add these functions:**

```typescript
// ============================================
// SAVED QUERIES FUNCTIONALITY
// ============================================

// Load all saved queries for the current user
const loadSavedQueries = async () => {
  if (!isSignedIn) return
  
  setLoadingSavedQueries(true)
  try {
    const response = await fetch('/api/saved-queries')
    if (!response.ok) {
      console.error('Failed to load saved queries')
      return
    }
    const data = await response.json()
    if (data.success) {
      setSavedQueries(data.queries || [])
    }
  } catch (error) {
    console.error('Error loading saved queries:', error)
  } finally {
    setLoadingSavedQueries(false)
  }
}

// Save current query state
const handleSaveQuery = async () => {
  if (!isSignedIn) {
    alert('Please sign in to save queries')
    return
  }
  
  if (!saveQueryName.trim()) {
    alert('Please enter a name for your saved query')
    return
  }
  
  setSavingQuery(true)
  try {
    // Serialize current state
    const queryConfig = serializeQueryState({
      queryType,
      betType,
      side,
      timePeriod,
      location,
      division,
      conference,
      playoff,
      favorite,
      homeFavDog,
      ownDefenseRank,
      ownDefenseStat,
      ownOffenseRank,
      ownOffenseStat,
      defenseRank,
      defenseStat,
      offenseRank,
      offenseStat,
      defenseStatPosition,
      offenseStatPosition,
      ownDefenseStatPosition,
      ownOffenseStatPosition,
      teamWinPctMin,
      teamWinPctMax,
      oppWinPctMin,
      oppWinPctMax,
      spreadMin,
      spreadMax,
      totalMin,
      totalMax,
      mlMin,
      mlMax,
      spreadMoveMin,
      spreadMoveMax,
      totalMoveMin,
      totalMoveMax,
      mlMoveMin,
      mlMoveMax,
      homeTeamDefenseRank,
      homeTeamDefenseStat,
      homeTeamOffenseRank,
      homeTeamOffenseStat,
      awayTeamDefenseRank,
      awayTeamDefenseStat,
      awayTeamOffenseRank,
      awayTeamOffenseStat,
      streak,
      prevGameMarginMin,
      prevGameMarginMax,
      awayStreak,
      awayPrevGameMarginMin,
      awayPrevGameMarginMax,
      teamId,
      teamLocation,
      selectedVersusTeam,
      refereeId,
      selectedReferee,
      playerId: selectedPlayer?.espn_player_id,
      selectedPlayer,
      propPosition,
      propStat,
      propLine,
      propLineMode,
      bookLineMin,
      bookLineMax,
      selectedPropVersusTeam,
      minTargets,
      minCarries,
      minPassAttempts
    })
    
    // Save last result summary if available
    const lastResultSummary = result ? {
      hits: result.hits,
      misses: result.misses,
      hit_rate: result.hit_rate,
      total_games: result.total_games
    } : null
    
    const response = await fetch('/api/saved-queries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: saveQueryName.trim(),
        description: saveQueryDescription.trim() || null,
        query_config: queryConfig,
        last_result_summary: lastResultSummary
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      alert(error.error || 'Failed to save query')
      return
    }
    
    // Success - reload queries and close modal
    await loadSavedQueries()
    setShowSaveModal(false)
    setSaveQueryName('')
    setSaveQueryDescription('')
    alert('Query saved successfully!')
  } catch (error) {
    console.error('Error saving query:', error)
    alert('Failed to save query')
  } finally {
    setSavingQuery(false)
  }
}

// Load a saved query into the builder
const handleLoadQuery = async (savedQuery: any) => {
  try {
    const config = savedQuery.query_config
    
    // Navigate to the correct query type first
    if (config.queryType) {
      navigateToQueryType(config.queryType)
    }
    
    // Deserialize and apply all the state
    const state = deserializeQueryConfig(config)
    
    // Apply basic filters
    if (state.timePeriod) setTimePeriod(state.timePeriod as TimePeriod)
    if (state.betType) setBetType(state.betType)
    if (state.side) setSide(state.side)
    if (state.location) setLocation(state.location)
    if (state.division) setDivision(state.division)
    if (state.conference) setConference(state.conference)
    if (state.playoff) setPlayoff(state.playoff)
    if (state.favorite) setFavorite(state.favorite)
    if (state.homeFavDog) setHomeFavDog(state.homeFavDog)
    
    // Rankings
    if (state.ownDefenseRank) setOwnDefenseRank(state.ownDefenseRank)
    if (state.ownDefenseStat) setOwnDefenseStat(state.ownDefenseStat)
    if (state.ownOffenseRank) setOwnOffenseRank(state.ownOffenseRank)
    if (state.ownOffenseStat) setOwnOffenseStat(state.ownOffenseStat)
    if (state.defenseRank) setDefenseRank(state.defenseRank)
    if (state.defenseStat) setDefenseStat(state.defenseStat)
    if (state.offenseRank) setOffenseRank(state.offenseRank)
    if (state.offenseStat) setOffenseStat(state.offenseStat)
    if (state.defenseStatPosition) setDefenseStatPosition(state.defenseStatPosition)
    if (state.offenseStatPosition) setOffenseStatPosition(state.offenseStatPosition)
    if (state.ownDefenseStatPosition) setOwnDefenseStatPosition(state.ownDefenseStatPosition)
    if (state.ownOffenseStatPosition) setOwnOffenseStatPosition(state.ownOffenseStatPosition)
    
    // Win percentages
    if (state.teamWinPctMin) setTeamWinPctMin(state.teamWinPctMin)
    if (state.teamWinPctMax) setTeamWinPctMax(state.teamWinPctMax)
    if (state.oppWinPctMin) setOppWinPctMin(state.oppWinPctMin)
    if (state.oppWinPctMax) setOppWinPctMax(state.oppWinPctMax)
    
    // Ranges
    if (state.spreadMin) setSpreadMin(state.spreadMin)
    if (state.spreadMax) setSpreadMax(state.spreadMax)
    if (state.totalMin) setTotalMin(state.totalMin)
    if (state.totalMax) setTotalMax(state.totalMax)
    if (state.mlMin) setMlMin(state.mlMin)
    if (state.mlMax) setMlMax(state.mlMax)
    
    // Line movement
    if (state.spreadMoveMin) setSpreadMoveMin(state.spreadMoveMin)
    if (state.spreadMoveMax) setSpreadMoveMax(state.spreadMoveMax)
    if (state.totalMoveMin) setTotalMoveMin(state.totalMoveMin)
    if (state.totalMoveMax) setTotalMoveMax(state.totalMoveMax)
    if (state.mlMoveMin) setMlMoveMin(state.mlMoveMin)
    if (state.mlMoveMax) setMlMoveMax(state.mlMoveMax)
    
    // O/U specific
    if (state.homeTeamDefenseRank) setHomeTeamDefenseRank(state.homeTeamDefenseRank)
    if (state.homeTeamDefenseStat) setHomeTeamDefenseStat(state.homeTeamDefenseStat)
    if (state.homeTeamOffenseRank) setHomeTeamOffenseRank(state.homeTeamOffenseRank)
    if (state.homeTeamOffenseStat) setHomeTeamOffenseStat(state.homeTeamOffenseStat)
    if (state.awayTeamDefenseRank) setAwayTeamDefenseRank(state.awayTeamDefenseRank)
    if (state.awayTeamDefenseStat) setAwayTeamDefenseStat(state.awayTeamDefenseStat)
    if (state.awayTeamOffenseRank) setAwayTeamOffenseRank(state.awayTeamOffenseRank)
    if (state.awayTeamOffenseStat) setAwayTeamOffenseStat(state.awayTeamOffenseStat)
    
    // Momentum
    if (state.streak) setStreak(state.streak)
    if (state.prevGameMarginMin) setPrevGameMarginMin(state.prevGameMarginMin)
    if (state.prevGameMarginMax) setPrevGameMarginMax(state.prevGameMarginMax)
    if (state.awayStreak) setAwayStreak(state.awayStreak)
    if (state.awayPrevGameMarginMin) setAwayPrevGameMarginMin(state.awayPrevGameMarginMin)
    if (state.awayPrevGameMarginMax) setAwayPrevGameMarginMax(state.awayPrevGameMarginMax)
    
    // Type-specific
    if (config.queryType === 'team') {
      if (state.teamId) {
        setTeamId(state.teamId)
        const team = NFL_TEAMS.find(t => t.id === state.teamId)
        if (team) setSelectedTeam(team)
      }
      if (state.teamLocation) setTeamLocation(state.teamLocation)
      if (state.selectedVersusTeam) {
        const vsTeam = NFL_TEAMS.find(t => t.id === state.selectedVersusTeam.id)
        if (vsTeam) setSelectedVersusTeam(vsTeam)
      }
    }
    
    if (config.queryType === 'referee') {
      if (state.refereeId) setRefereeId(state.refereeId)
      if (state.selectedReferee) {
        setSelectedReferee(state.selectedReferee)
      }
    }
    
    if (config.queryType === 'prop') {
      if (state.propPosition) setPropPosition(state.propPosition)
      if (state.propStat) setPropStat(state.propStat)
      if (state.propLine) setPropLine(state.propLine)
      if (state.propLineMode) setPropLineMode(state.propLineMode)
      if (state.bookLineMin) setBookLineMin(state.bookLineMin)
      if (state.bookLineMax) setBookLineMax(state.bookLineMax)
      if (state.selectedPropVersusTeam) {
        const vsTeam = NFL_TEAMS.find(t => t.id === state.selectedPropVersusTeam.id)
        if (vsTeam) setSelectedPropVersusTeam(vsTeam)
      }
      if (state.minTargets) setMinTargets(state.minTargets)
      if (state.minCarries) setMinCarries(state.minCarries)
      if (state.minPassAttempts) setMinPassAttempts(state.minPassAttempts)
      
      // Load player if saved
      if (state.selectedPlayer && state.selectedPlayer.espn_player_id) {
        // Try to find player in search results or trigger search
        searchPlayers(state.selectedPlayer.name || '', state.selectedPlayer.position || propPosition)
        // Set after a short delay to allow search
        setTimeout(() => {
          const foundPlayer = playerSearchResults.find(p => p.espn_player_id === state.selectedPlayer.espn_player_id)
          if (foundPlayer) {
            setSelectedPlayer(foundPlayer)
            setPlayerId(foundPlayer.espn_player_id)
          }
        }, 500)
      }
    }
    
    // Switch to builder section
    setActiveSection('builder')
    setSidebarOpen(false)
    
    // Track that this query was loaded
    if (savedQuery.id) {
      fetch(`/api/saved-queries/${savedQuery.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }).catch(err => console.error('Failed to track query run:', err))
    }
  } catch (error) {
    console.error('Error loading query:', error)
    alert('Failed to load query')
  }
}

// Delete a saved query
const handleDeleteQuery = async (id: string) => {
  if (!confirm('Are you sure you want to delete this saved query?')) {
    return
  }
  
  setDeletingQueryId(id)
  try {
    const response = await fetch(`/api/saved-queries/${id}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      alert('Failed to delete query')
      return
    }
    
    // Reload queries
    await loadSavedQueries()
  } catch (error) {
    console.error('Error deleting query:', error)
    alert('Failed to delete query')
  } finally {
    setDeletingQueryId(null)
  }
}
```

### Step 3.4: Add useEffect to Load Queries on Mount

**Location:** After the other `useEffect` hooks (around line 650)

**Add this:**
```typescript
// Load saved queries when user signs in
useEffect(() => {
  if (isSignedIn) {
    loadSavedQueries()
  }
}, [isSignedIn])
```

### Step 3.5: Enable "My Builds" Sidebar Section

**Location:** Find the sidebar navigation (around line 3238)

**Find this:**
```typescript
<button 
  className={`${styles.sidebarItem} ${activeSection === 'myBuilds' ? styles.sidebarItemActive : ''} ${styles.sidebarItemDisabled}`}
  onClick={() => {}}
>
  <FaToolbox className={styles.sidebarIcon} />
  <span>My Builds</span>
  <span className={styles.soonTag}>soon</span>
</button>
```

**Replace it with:**
```typescript
<button 
  className={`${styles.sidebarItem} ${activeSection === 'myBuilds' ? styles.sidebarItemActive : ''}`}
  onClick={() => { setActiveSection('myBuilds'); setSidebarOpen(false); }}
>
  <FaToolbox className={styles.sidebarIcon} />
  <span>My Builds</span>
  {savedQueries.length > 0 && <span className={styles.badge}>{savedQueries.length}</span>}
</button>
```

### Step 3.6: Add "Save Build" Button

**Location:** Find the action buttons section (around line 4242)

**Find this:**
```typescript
<div className={styles.actionButtons}>
  <button
    className={styles.runBtn}
    onClick={runQuery}
    disabled={loading}
  >
    {loading ? 'Running...' : <><IoRocketOutline /> Run Build</>}
  </button>
  <button
    className={styles.clearBtn}
    onClick={clearFilters}
    type="button"
  >
    Clear
  </button>
</div>
```

**Replace it with:**
```typescript
<div className={styles.actionButtons}>
  <button
    className={styles.runBtn}
    onClick={runQuery}
    disabled={loading}
  >
    {loading ? 'Running...' : <><IoRocketOutline /> Run Build</>}
  </button>
  <button
    className={styles.saveBtn}
    onClick={() => setShowSaveModal(true)}
    type="button"
    disabled={!isSignedIn}
    title={!isSignedIn ? 'Sign in to save queries' : 'Save this build'}
  >
    <FiCopy /> Save Build
  </button>
  <button
    className={styles.clearBtn}
    onClick={clearFilters}
    type="button"
  >
    Clear
  </button>
</div>
```

### Step 3.7: Add Save Modal

**Location:** Right before the closing `</div>` tags at the end of the component (around line 4774, before the closing tags)

**Add this modal right before the final closing tags:**
```typescript
{/* Save Query Modal */}
{showSaveModal && (
  <div className={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <h3>Save Query Build</h3>
        <button 
          className={styles.modalClose}
          onClick={() => setShowSaveModal(false)}
        >
          ×
        </button>
      </div>
      <div className={styles.modalBody}>
        <div className={styles.modalField}>
          <label>Name *</label>
          <input
            type="text"
            value={saveQueryName}
            onChange={(e) => setSaveQueryName(e.target.value)}
            placeholder="e.g., 'Chiefs Home Favorites'"
            autoFocus
          />
        </div>
        <div className={styles.modalField}>
          <label>Description (optional)</label>
          <textarea
            value={saveQueryDescription}
            onChange={(e) => setSaveQueryDescription(e.target.value)}
            placeholder="Add a note about this build..."
            rows={3}
          />
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button
          className={styles.modalCancel}
          onClick={() => {
            setShowSaveModal(false)
            setSaveQueryName('')
            setSaveQueryDescription('')
          }}
        >
          Cancel
        </button>
        <button
          className={styles.modalSave}
          onClick={handleSaveQuery}
          disabled={savingQuery || !saveQueryName.trim()}
        >
          {savingQuery ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  </div>
)}
```

### Step 3.8: Add "My Builds" Section Content

**Location:** After the sidebar, before the main layout (around line 3295, after the sidebar overlay)

**Find where the sidebar ends and the layout begins, then add this new section:**
```typescript
{/* My Builds Section */}
{activeSection === 'myBuilds' && (
  <div className={styles.myBuildsSection}>
    <div className={styles.myBuildsHeader}>
      <h2>My Saved Builds</h2>
      <button
        className={styles.closeMyBuilds}
        onClick={() => setActiveSection('builder')}
      >
        <FiChevronLeft /> Back to Builder
      </button>
    </div>
    
    {!isSignedIn ? (
      <div className={styles.myBuildsEmpty}>
        <p>Please sign in to save and load query builds.</p>
      </div>
    ) : loadingSavedQueries ? (
      <div className={styles.myBuildsEmpty}>
        <p>Loading saved builds...</p>
      </div>
    ) : savedQueries.length === 0 ? (
      <div className={styles.myBuildsEmpty}>
        <p>No saved builds yet. Create a build and click "Save Build" to get started!</p>
      </div>
    ) : (
      <div className={styles.savedQueriesList}>
        {savedQueries.map((query) => (
          <div key={query.id} className={styles.savedQueryItem}>
            <div className={styles.savedQueryHeader}>
              <h3>{query.name}</h3>
              <div className={styles.savedQueryActions}>
                <button
                  className={styles.loadQueryBtn}
                  onClick={() => handleLoadQuery(query)}
                  title="Load this build"
                >
                  Load
                </button>
                <button
                  className={styles.deleteQueryBtn}
                  onClick={() => handleDeleteQuery(query.id)}
                  disabled={deletingQueryId === query.id}
                  title="Delete this build"
                >
                  {deletingQueryId === query.id ? '...' : 'Delete'}
                </button>
              </div>
            </div>
            {query.description && (
              <p className={styles.savedQueryDescription}>{query.description}</p>
            )}
            <div className={styles.savedQueryMeta}>
              <span>Type: {query.query_config?.queryType || 'unknown'}</span>
              {query.run_count > 0 && (
                <span>Used {query.run_count} time{query.run_count !== 1 ? 's' : ''}</span>
              )}
              {query.last_result_summary && (
                <span>
                  Last: {query.last_result_summary.hit_rate}% ({query.last_result_summary.hits}-{query.last_result_summary.misses})
                </span>
              )}
            </div>
            {query.updated_at && (
              <div className={styles.savedQueryDate}>
                Updated {new Date(query.updated_at).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

**Then modify the layout section to conditionally show either the builder or my builds:**
```typescript
{activeSection === 'builder' && (
  <div className={styles.layout}>
    {/* All the existing builder panel code stays here */}
    ...
  </div>
)}
```

### Step 3.9: Add CSS Styles

**Location:** `app/sports-engine/sports-engine.module.css`

**Add these styles at the end of the file:**
```css
/* Save Button */
.saveBtn {
  background: #2a2a3a;
  border: 1px solid #3a3a4a;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.saveBtn:hover:not(:disabled) {
  background: #3a3a4a;
  border-color: #4a4a5a;
}

.saveBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal */
.modalOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #1a1a24;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modalHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #2a2a3a;
}

.modalHeader h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #fff;
}

.modalClose {
  background: none;
  border: none;
  color: #888;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.modalClose:hover {
  background: #2a2a3a;
  color: #fff;
}

.modalBody {
  padding: 1.5rem;
}

.modalField {
  margin-bottom: 1.5rem;
}

.modalField label {
  display: block;
  margin-bottom: 0.5rem;
  color: #ccc;
  font-size: 0.875rem;
}

.modalField input,
.modalField textarea {
  width: 100%;
  padding: 0.75rem;
  background: #0a0a14;
  border: 1px solid #2a2a3a;
  border-radius: 4px;
  color: #fff;
  font-size: 0.875rem;
  font-family: inherit;
}

.modalField input:focus,
.modalField textarea:focus {
  outline: none;
  border-color: #4a9eff;
}

.modalField textarea {
  resize: vertical;
  min-height: 80px;
}

.modalFooter {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #2a2a3a;
}

.modalCancel,
.modalSave {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.modalCancel {
  background: #2a2a3a;
  color: #ccc;
}

.modalCancel:hover {
  background: #3a3a4a;
  color: #fff;
}

.modalSave {
  background: #4a9eff;
  color: #fff;
}

.modalSave:hover:not(:disabled) {
  background: #5aaeff;
}

.modalSave:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* My Builds Section */
.myBuildsSection {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
}

.myBuildsHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.myBuildsHeader h2 {
  margin: 0;
  color: #fff;
  font-size: 1.5rem;
}

.closeMyBuilds {
  background: #2a2a3a;
  border: 1px solid #3a3a4a;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.closeMyBuilds:hover {
  background: #3a3a4a;
}

.myBuildsEmpty {
  text-align: center;
  padding: 4rem 2rem;
  color: #888;
}

.savedQueriesList {
  display: grid;
  gap: 1rem;
}

.savedQueryItem {
  background: #1a1a24;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.savedQueryItem:hover {
  border-color: #3a3a4a;
  background: #1f1f2a;
}

.savedQueryHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.savedQueryHeader h3 {
  margin: 0;
  color: #fff;
  font-size: 1.125rem;
}

.savedQueryActions {
  display: flex;
  gap: 0.5rem;
}

.loadQueryBtn,
.deleteQueryBtn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.loadQueryBtn {
  background: #4a9eff;
  color: #fff;
}

.loadQueryBtn:hover {
  background: #5aaeff;
}

.deleteQueryBtn {
  background: #3a2a2a;
  color: #ff6b6b;
}

.deleteQueryBtn:hover:not(:disabled) {
  background: #4a3a3a;
}

.deleteQueryBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.savedQueryDescription {
  color: #aaa;
  font-size: 0.875rem;
  margin: 0.5rem 0;
}

.savedQueryMeta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: #888;
}

.savedQueryDate {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #666;
}

.badge {
  background: #4a9eff;
  color: #fff;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  margin-left: 0.5rem;
}
```

---

## Step 4: Test the Feature

### 4.1: Start Your Dev Server
```bash
npm run dev
```

### 4.2: Test the Flow

1. **Sign In**
   - Go to `/sports-engine`
   - Make sure you're signed in

2. **Create a Build**
   - Set up some filters (query type, bet type, etc.)
   - Click "Run Build" to test it works

3. **Save a Build**
   - Click "Save Build"
   - Enter a name (e.g., "Test Build")
   - Optionally add a description
   - Click "Save"
   - You should see a success message

4. **View Saved Builds**
   - Click "My Builds" in the sidebar
   - You should see your saved build listed

5. **Load a Build**
   - Click "Load" on a saved build
   - The builder should populate with all the saved filters

6. **Delete a Build**
   - Click "Delete" on a saved build
   - Confirm deletion
   - The build should disappear

---

## Troubleshooting

### Issue: "Failed to save query"
- **Check:** Are you signed in?
- **Check:** Did you run the SQL setup?
- **Check:** Browser console for error messages

### Issue: Modal doesn't appear
- **Check:** Did you add the modal JSX?
- **Check:** Is `showSaveModal` state being set?

### Issue: Saved queries don't load
- **Check:** Browser console for API errors
- **Check:** Network tab to see if the API call is being made
- **Check:** Are you signed in?

### Issue: Loading a query doesn't work
- **Check:** Browser console for errors
- **Check:** Make sure all state setters are being called

---

## What Each Part Does

- **Database Table**: Stores the saved queries with all their configuration
- **API Routes**: Handle creating, reading, updating, and deleting saved queries
- **Serialization**: Converts the current query state into a format that can be saved
- **Deserialization**: Converts saved data back into the format needed to restore state
- **UI Components**: The buttons, modals, and lists that users interact with

---

## Next Steps After Implementation

Once everything is working:
1. Test with different query types (prop, team, referee, trend)
2. Test saving complex queries with many filters
3. Test loading and running saved queries
4. Consider adding features like:
   - Renaming saved queries
   - Duplicating saved queries
   - Sharing saved queries (if desired)

---

## Need Help?

If you get stuck at any step:
1. Check the browser console for errors
2. Check the terminal where your dev server is running
3. Let me know which step you're on and what error you're seeing

Good luck! 🚀

