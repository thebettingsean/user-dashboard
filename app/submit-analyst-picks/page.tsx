'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseClient = createClient(
  'https://cmulndosilihjhlurbth.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMzAwMDAsImV4cCI6MjA2MTgwNjAwMH0.gIsjMoK0-ItRhE8F8Fbupwd-U3D0WInwFjdTt9_Ztr0'
)

const sportEmojis: Record<string, string> = {
  NFL: '🏈',
  NBA: '🏀',
  MLB: '⚾',
  NHL: '🏒',
  CFL: '🏈',
  NCAAF: '🏈',
  NCAAB: '🏀',
  WNBA: '🏀',
  Soccer: '⚽',
  UFC: '🥊',
  Tennis: '🎾',
  Golf: '⛳'
}

interface Bettor {
  id: string
  name: string
  discord_webhook_url?: string
}

interface Pick {
  bettor_id: string
  sport: string
  sport_emoji: string
  bet_type: string
  units: number
  bet_title: string
  odds: string
  sportsbook: string
  analysis: string
  game_time: string
  posted_at: string
  result: string
  recap_status: string
  is_free: boolean
  game_id?: string // NEW!
}

interface Game {
  id: string
  away_team: string
  home_team: string
  game_date: string
  sport: string
}

interface ConsensusPick {
  id: string
  bettor_id: string
  bettor_name: string
  sport: string
  sport_emoji: string
  bet_type: string
  units: number
  bet_title: string
  odds: string
  sportsbook: string
  analysis: string
  game_time: string
  is_active: boolean
}

interface RecapData {
  pickId: string
  outcome: 'win' | 'loss' | 'push'
  unitsResult: number
}

const roleIdByName: Record<string, string> = {
  'Insider Don': '1418209141578793030',
  'Invisible Insider': '1418209454406762496',
  'Insider Mike': '1418209738944151552',
  'Mike 2.0': '1418209738944151552',
  'Insider Sawyer': '1418209952140365996',
  'Insider Mark': '1418210099154915460'
}

// Add spinner animation styles
const spinnerStyles = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

// Rich Text Editor Component
function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = React.useRef<HTMLDivElement>(null)

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        padding: '0.5rem',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderBottom: 'none',
        borderRadius: '8px 8px 0 0',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => execCommand('bold')}
          style={toolbarButtonStyle}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          style={toolbarButtonStyle}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          style={toolbarButtonStyle}
          title="Underline"
        >
          <u>U</u>
        </button>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 0.25rem' }} />
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          style={toolbarButtonStyle}
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          style={toolbarButtonStyle}
          title="Numbered List"
        >
          1. List
        </button>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 0.25rem' }} />
        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter URL:')
            if (url) execCommand('createLink', url)
          }}
          style={toolbarButtonStyle}
          title="Insert Link"
        >
          🔗 Link
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '0 0 8px 8px',
          color: '#fff',
          fontSize: '0.85rem',
          minHeight: '100px',
          maxHeight: '300px',
          overflowY: 'auto',
          outline: 'none'
        }}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </div>
  )
}

const toolbarButtonStyle: React.CSSProperties = {
  padding: '0.25rem 0.5rem',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '4px',
  color: 'rgba(255,255,255,0.8)',
  fontSize: '0.75rem',
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontWeight: 500
}

export default function SubmitAnalystPicks() {
  const [bettors, setBettors] = useState<Bettor[]>([])
  const [currentBettorId, setCurrentBettorId] = useState<string | null>(null)
  const [currentWinStreak, setCurrentWinStreak] = useState<number>(0)
  const [unrecappedPicks, setUnrecappedPicks] = useState<any[]>([])
  const [recapData, setRecapData] = useState<Record<string, RecapData>>({})
  const [availableConsensusPicks, setAvailableConsensusPicks] = useState<ConsensusPick[]>([])
  const [selectedConsensusPicks, setSelectedConsensusPicks] = useState<Set<string>>(new Set())
  const [pickCounter, setPickCounter] = useState<number>(1)
  const [picks, setPicks] = useState<Record<number, any>>({})
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([])
  const [selectedPerformance, setSelectedPerformance] = useState<string>('')
  
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  
  const [showRecapSection, setShowRecapSection] = useState<boolean>(false)
  const [showConsensusSection, setShowConsensusSection] = useState<boolean>(false)
  const [showMainForm, setShowMainForm] = useState<boolean>(false)

  // NEW: Game selection state
  const [availableGames, setAvailableGames] = useState<Record<number, Game[]>>({})
  const [loadingGames, setLoadingGames] = useState<Record<number, boolean>>({})

  // Load bettors on mount
  useEffect(() => {
    loadBettors()
  }, [])

  // Timezone utilities
  const getEasternDate = (): string => {
    const now = new Date()
    const easternTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now)
    return easternTime
  }

  const getGameDateEastern = (timestamp: string): string => {
    const gameTime = new Date(timestamp)
    const easternDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(gameTime)
    return easternDate
  }

  const shouldRecapPick = (pick: any): boolean => {
    const todayEastern = getEasternDate()
    const gameDate = getGameDateEastern(pick.game_time)
    return todayEastern > gameDate
  }

  const loadBettors = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('bettors')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setBettors(data || [])
    } catch (error) {
      showError('Failed to load bettors. Please refresh the page.')
    }
  }

  const loadUnrecappedPicks = async (bettorId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('picks')
        .select('*')
        .eq('bettor_id', bettorId)
        .eq('recap_status', 'pending')
        .order('posted_at', { ascending: false })
      
      if (error) throw error
      
      const filteredPicks = (data || []).filter(pick => shouldRecapPick(pick))
      setUnrecappedPicks(filteredPicks)
      return filteredPicks
    } catch (error) {
      showError('Failed to load picks for recap.')
      return []
    }
  }

  const loadWinStreak = async (bettorId: string) => {
    try {
      const { data, error } = await supabaseClient.rpc('calculate_win_streak', {
        bettor_uuid: bettorId
      })
      
      if (error) throw error
      setCurrentWinStreak(data || 0)
    } catch (error) {
      setCurrentWinStreak(0)
    }
  }

  const loadPerformanceMetrics = async (bettorId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('performance_summary')
        .select('*')
        .eq('bettor_id', bettorId)
        .order('time_period')
      
      if (error) throw error
      
      if (data && data.length > 0) {
        const timeOrderMap: Record<string, number> = {
          yesterday: 1, L3: 2, L5: 3, L7: 4, L14: 5, L30: 6, L6M: 7, year: 8, all_time: 9
        }
        data.sort((a, b) => {
          const aOrder = timeOrderMap[a.time_period] || 99
          const bOrder = timeOrderMap[b.time_period] || 99
          if (aOrder !== bOrder) return aOrder - bOrder
          return a.sport.localeCompare(b.sport)
        })
      }
      
      setPerformanceMetrics(data || [])
    } catch (error) {
      setPerformanceMetrics([])
    }
  }

  const loadAvailableConsensusPicks = async (excludeBettorId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('active_picks')
        .select('*')
        .neq('bettor_id', excludeBettorId)
        .eq('is_active', true)
      
      if (error) throw error
      setAvailableConsensusPicks(data || [])
    } catch (error) {
      showError('Failed to load available consensus picks.')
    }
  }

  // NEW: Load available games for a sport
  const loadGamesForSport = async (pickId: number, sport: string) => {
    setLoadingGames(prev => ({ ...prev, [pickId]: true }))
    
    try {
      const response = await fetch(`/api/games/today?sport=${sport.toLowerCase()}`)
      if (!response.ok) throw new Error('Failed to fetch games')
      
      const data = await response.json()
      const games = data.games || []
      setAvailableGames(prev => ({ ...prev, [pickId]: games }))
    } catch (error) {
      console.error('Error loading games:', error)
      setAvailableGames(prev => ({ ...prev, [pickId]: [] }))
    } finally {
      setLoadingGames(prev => ({ ...prev, [pickId]: false }))
    }
  }

  const handleBettorSelect = async (bettorId: string) => {
    setCurrentBettorId(bettorId)
    
    if (!bettorId) {
      setShowRecapSection(false)
      setShowConsensusSection(false)
      setShowMainForm(false)
      return
    }
    
    setLoading(true)
    
    try {
      const picks = await loadUnrecappedPicks(bettorId)
      
      if (picks.length > 0) {
        setShowRecapSection(true)
        setShowConsensusSection(false)
        setShowMainForm(false)
      } else {
        setShowRecapSection(false)
        setShowConsensusSection(true)
        setShowMainForm(true)
        await loadPerformanceMetrics(bettorId)
        await loadWinStreak(bettorId)
        await loadAvailableConsensusPicks(bettorId)
        
        if (Object.keys(picks).length === 0) {
          addPick()
        }
      }
    } catch (error) {
      showError('Error loading bettor data. Please try again.')
    }
    
    setLoading(false)
  }

  const addPick = () => {
    const newPickId = pickCounter
    setPicks(prev => ({
      ...prev,
      [newPickId]: {
        sport: '',
        betType: '',
        units: '',
        betTitle: '',
        odds: '',
        sportsbook: '',
        analysis: '',
        gameTime: '',
        isFree: false,
        gameId: '', // NEW!
        collapsed: false
      }
    }))
    setPickCounter(prev => prev + 1)
  }

  const deletePick = (pickId: number) => {
    setPicks(prev => {
      const newPicks = { ...prev }
      delete newPicks[pickId]
      return newPicks
    })
  }

  const updatePick = (pickId: number, field: string, value: any) => {
    setPicks(prev => ({
      ...prev,
      [pickId]: {
        ...prev[pickId],
        [field]: value
      }
    }))

    // NEW: When sport changes to NFL or NBA, load games
    if (field === 'sport' && (value === 'NFL' || value === 'NBA')) {
      loadGamesForSport(pickId, value)
    }
  }

  const togglePick = (pickId: number) => {
    setPicks(prev => ({
      ...prev,
      [pickId]: {
        ...prev[pickId],
        collapsed: !prev[pickId].collapsed
      }
    }))
  }

  const calculateUnitsResult = (unitsRisked: number, odds: string, result: 'win' | 'loss' | 'push'): number => {
    if (result === 'push') return 0
    
    let oddsNumeric: number
    if (odds.startsWith('+')) {
      oddsNumeric = parseInt(odds.substring(1))
      return result === 'win' ? parseFloat((unitsRisked * (oddsNumeric / 100)).toFixed(2)) : -unitsRisked
    } else if (odds.startsWith('-')) {
      oddsNumeric = parseInt(odds.substring(1))
      return result === 'win' ? parseFloat((unitsRisked * (100 / oddsNumeric)).toFixed(2)) : -unitsRisked
    } else {
      return result === 'win' ? parseFloat((unitsRisked * (100 / 110)).toFixed(2)) : -unitsRisked
    }
  }

  const handleRecapClick = (pickId: string, outcome: 'win' | 'loss' | 'push') => {
    const pick = unrecappedPicks.find(p => p.id === pickId)
    if (!pick) return
    
    const unitsResult = calculateUnitsResult(pick.units, pick.odds, outcome)
    setRecapData(prev => ({
      ...prev,
      [pickId]: { pickId, outcome, unitsResult }
    }))
  }

  const submitRecaps = async () => {
    if (Object.keys(recapData).length < unrecappedPicks.length) {
      showError('Please recap all picks before submitting.')
      return
    }
    
    setLoading(true)
    
    try {
      const pickOutcomes = Object.values(recapData).map(recap => ({
        pick_id: recap.pickId,
        result: recap.outcome,
        units_result: recap.unitsResult,
        recapped_by: currentBettorId
      }))
      
      const { error: outcomesError } = await supabaseClient
        .from('pick_outcomes')
        .insert(pickOutcomes)
      
      if (outcomesError) throw outcomesError
      
      const easternNow = new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
      const easternTimestamp = new Date(easternNow).toISOString()
      
      for (const [pickId, recapResult] of Object.entries(recapData)) {
        const correctResult = recapResult.outcome === 'win' ? 'won' : 
                            recapResult.outcome === 'loss' ? 'lost' : 
                            recapResult.outcome === 'push' ? 'push' : recapResult.outcome
        
        const { error: pickUpdateError } = await supabaseClient
          .from('picks')
          .update({
            result: correctResult,
            units_result: recapResult.unitsResult,
            recap_status: 'completed',
            recap_date: easternTimestamp
          })
          .eq('id', pickId)
        
        if (pickUpdateError) throw pickUpdateError
      }
      
      await supabaseClient.rpc('refresh_performance_metrics', {
        bettor_uuid: currentBettorId
      })
      
      showSuccess('Recaps submitted successfully! Performance metrics updated.')
      
      setShowRecapSection(false)
      setShowConsensusSection(true)
      setShowMainForm(true)
      
      await loadPerformanceMetrics(currentBettorId!)
      await loadWinStreak(currentBettorId!)
      await loadAvailableConsensusPicks(currentBettorId!)
      
      if (Object.keys(picks).length === 0) {
        addPick()
      }
    } catch (error: any) {
      showError(`Error submitting recaps: ${error.message}`)
    }
    
    setLoading(false)
  }

  const sendDiscordNotification = async (bettor: Bettor, picks: Pick[]) => {
    if (!bettor.discord_webhook_url) {
      console.log('No Discord webhook for this bettor')
      return
    }

    let description = ''
    for (const pick of picks) {
      const gameTime = new Date(pick.game_time).toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      description += `**${pick.units}u** | ${pick.bet_title} | ${pick.odds} ${pick.sportsbook}\n`
      description += `➡️ Live at ${gameTime} ET\n\n`
    }
    description += `Analysis: https://thebettinginsider.com/betting/dashboard`

    const roleId = roleIdByName[bettor.name]
    const roleMention = roleId ? `<@&${roleId}>` : ''

    const payload = {
      content: roleId ? `${roleMention} New picks posted!` : 'New picks posted!',
      allowed_mentions: roleId ? { parse: [], roles: [roleId], replied_user: false } : { parse: [], replied_user: false },
      embeds: [{
        title: `🎯 ${bettor.name}'s Picks`,
        description,
        color: 0x3b82f6,
        timestamp: new Date().toISOString()
      }]
    }

    try {
      const resp = await fetch(bettor.discord_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!resp.ok) {
        console.error('Discord webhook failed:', resp.status)
      } else {
        console.log('Discord notification sent successfully')
      }
    } catch (err) {
      console.error('Error sending Discord notification:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentBettorId) {
      showError('Please select your name')
      return
    }
    
    if (!selectedPerformance) {
      showError('Please select a performance metric to display')
      return
    }
    
    setLoading(true)
    
    try {
      const { data: performanceData, error: performanceError } = await supabaseClient
        .from('performance_summary')
        .select('*')
        .eq('id', selectedPerformance)
        .single()
      
      if (performanceError) throw performanceError
      
      const selectedMetric = performanceMetrics.find(m => m.id === selectedPerformance)
      const fullRecordText = selectedMetric?.formatted_record || performanceData.formatted_record
      
      const { error: updateError } = await supabaseClient
        .from('bettors')
        .update({
          record: fullRecordText,
          win_streak: currentWinStreak
        })
        .eq('id', currentBettorId)
      
      if (updateError) throw updateError
      
      const easternNow = new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
      const easternTimestamp = new Date(easternNow)
      
      const picksToInsert: Pick[] = []
      
      for (const [pickId, pickData] of Object.entries(picks)) {
        if (!pickData.sport) continue
        
        const pick: Pick = {
          bettor_id: currentBettorId,
          sport: pickData.sport,
          sport_emoji: sportEmojis[pickData.sport] || '',
          bet_type: pickData.betType,
          units: parseFloat(pickData.units),
          bet_title: pickData.betTitle,
          odds: pickData.odds,
          sportsbook: pickData.sportsbook,
          analysis: pickData.analysis,
          game_time: new Date(pickData.gameTime).toISOString(),
          posted_at: easternTimestamp.toISOString(),
          result: 'pending',
          recap_status: 'pending',
          is_free: pickData.isFree,
          game_id: pickData.gameId || null // NEW!
        }
        
        picksToInsert.push(pick)
      }
      
      if (picksToInsert.length > 0) {
        const { error: picksError } = await supabaseClient
          .from('picks')
          .insert(picksToInsert)
        
        if (picksError) throw picksError
        
        const bettor = bettors.find(b => b.id === currentBettorId)
        if (bettor) {
          await sendDiscordNotification(bettor, picksToInsert)
        }
      }
      
      showSuccess(`Successfully submitted ${picksToInsert.length} pick${picksToInsert.length > 1 ? 's' : ''}!`)
      
      // Reset form
      setPicks({})
      setPickCounter(1)
      setCurrentBettorId(null)
      setCurrentWinStreak(0)
      setSelectedPerformance('')
      setShowConsensusSection(false)
      setShowMainForm(false)
      
    } catch (error: any) {
      showError(`Error: ${error.message}`)
    }
    
    setLoading(false)
  }

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setErrorMessage('')
    setTimeout(() => setSuccessMessage(''), 5000)
  }

  const showError = (message: string) => {
    setErrorMessage(message)
    setSuccessMessage('')
  }

  return (
    <>
      <style>{spinnerStyles}</style>
      <div style={styles.container}>
        <h1 style={styles.title}>Submit Your Picks</h1>
      <p style={styles.subtitle}>All times are in Eastern Time (EST/EDT)</p>
      
      <div style={styles.card}>
        {successMessage && (
          <div style={styles.successMessage}>{successMessage}</div>
        )}
        
        {errorMessage && (
          <div style={styles.errorMessage}>{errorMessage}</div>
        )}
        
        {loading && (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <p style={{ fontSize: '1.1rem', color: 'var(--white)' }}>Processing...</p>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem' }}>
              Please wait
            </p>
          </div>
        )}
        
        {/* Bettor Selection */}
        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>Bettor Information</h2>
          <div style={styles.formGroup}>
            <label style={styles.label}>Select Your Name</label>
            <select 
              style={styles.select}
              value={currentBettorId || ''}
              onChange={(e) => handleBettorSelect(e.target.value)}
            >
              <option value="">-- Select Your Name --</option>
              {bettors.map(bettor => (
                <option key={bettor.id} value={bettor.id}>{bettor.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Recap Section */}
        {showRecapSection && (
          <div style={styles.recapContainer}>
            <div style={styles.recapHeader}>
              <h2 style={styles.recapTitle}>Recap Required</h2>
              <p style={styles.recapSubtitle}>
                You must recap your previous picks before submitting new ones
              </p>
            </div>
            
            <div style={styles.recapProgress}>
              <div style={styles.recapProgressText}>
                Progress: {Object.keys(recapData).length} of {unrecappedPicks.length} picks recapped
              </div>
              <div style={styles.recapProgressBar}>
                <div 
                  style={{
                    ...styles.recapProgressFill,
                    width: `${(Object.keys(recapData).length / unrecappedPicks.length) * 100}%`
                  }} 
                />
              </div>
            </div>
            
            <div>
              {unrecappedPicks.map(pick => {
                const gameDate = new Date(pick.game_time).toLocaleDateString('en-US', {
                  timeZone: 'America/New_York',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })
                const selected = recapData[pick.id]
                
                return (
                  <div key={pick.id} style={styles.recapPickCard}>
                    <div style={styles.recapPickInfo}>
                      <div style={styles.recapPickTitle}>
                        {pick.sport_emoji} {pick.bet_title}
                      </div>
                      <div style={styles.recapPickDetails}>
                        {pick.units}u at {pick.odds} • {pick.sportsbook} • {pick.bet_type}
                      </div>
                      <div style={styles.recapPickMeta}>
                        <span>Game: {gameDate}</span>
                        <span>{pick.sport}</span>
                      </div>
                    </div>
                    
                    <div style={styles.recapButtons}>
                      <button
                        style={{
                          ...styles.recapButton,
                          ...styles.recapButtonWin,
                          ...(selected?.outcome === 'win' ? styles.recapButtonSelected : {})
                        }}
                        onClick={() => handleRecapClick(pick.id, 'win')}
                      >
                        Win
                      </button>
                      <button
                        style={{
                          ...styles.recapButton,
                          ...styles.recapButtonLoss,
                          ...(selected?.outcome === 'loss' ? styles.recapButtonSelected : {})
                        }}
                        onClick={() => handleRecapClick(pick.id, 'loss')}
                      >
                        Loss
                      </button>
                      <button
                        style={{
                          ...styles.recapButton,
                          ...styles.recapButtonPush,
                          ...(selected?.outcome === 'push' ? styles.recapButtonSelected : {})
                        }}
                        onClick={() => handleRecapClick(pick.id, 'push')}
                      >
                        Push
                      </button>
                    </div>
                    
                    {selected && (
                      <div style={{
                        ...styles.recapUnitsResult,
                        color: selected.unitsResult >= 0 ? '#34d399' : '#ef4444'
                      }}>
                        {selected.unitsResult >= 0 ? '+' : ''}{selected.unitsResult.toFixed(2)}u
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            <div style={styles.formActions}>
              <button
                style={{
                  ...styles.button,
                  ...styles.buttonWarning,
                  opacity: Object.keys(recapData).length < unrecappedPicks.length ? 0.6 : 1
                }}
                onClick={submitRecaps}
                disabled={Object.keys(recapData).length < unrecappedPicks.length}
              >
                Submit Recaps
              </button>
            </div>
          </div>
        )}
        
        {/* Main Form */}
        {showMainForm && (
          <form onSubmit={handleSubmit}>
            <div style={styles.section}>
              <h2 style={styles.sectionHeader}>Today's Picks</h2>
              
              {Object.entries(picks).map(([pickIdStr, pickData]) => {
                const pickId = parseInt(pickIdStr)
                const isNFLorNBA = pickData.sport === 'NFL' || pickData.sport === 'NBA'
                const games = availableGames[pickId] || []
                const isLoadingGames = loadingGames[pickId]
                
                return (
                  <div key={pickId} style={styles.pickCard}>
                    <div style={styles.pickHeader} onClick={() => togglePick(pickId)}>
                      <span style={styles.pickNumber}>Pick #{pickId}</span>
                      <button
                        type="button"
                        style={styles.deletePick}
                        onClick={(e) => {
                          e.stopPropagation()
                          deletePick(pickId)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                    
                    {!pickData.collapsed && (
                      <div style={styles.pickContent}>
                        <div style={styles.formRow}>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Sport</label>
                            <select
                              style={styles.select}
                              value={pickData.sport}
                              onChange={(e) => updatePick(pickId, 'sport', e.target.value)}
                              required
                            >
                              <option value="">-- Select Sport --</option>
                              <option value="NFL">NFL</option>
                              <option value="NBA">NBA</option>
                              <option value="MLB">MLB</option>
                              <option value="NHL">NHL</option>
                              <option value="CFL">CFL</option>
                              <option value="NCAAF">NCAAF</option>
                              <option value="NCAAB">NCAAB</option>
                              <option value="WNBA">WNBA</option>
                              <option value="Soccer">Soccer</option>
                              <option value="UFC">UFC</option>
                              <option value="Tennis">Tennis</option>
                              <option value="Golf">Golf</option>
                            </select>
                          </div>
                          
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Bet Type</label>
                            <select
                              style={styles.select}
                              value={pickData.betType}
                              onChange={(e) => updatePick(pickId, 'betType', e.target.value)}
                              required
                            >
                              <option value="">-- Select Type --</option>
                              <option value="Systems">Systems</option>
                              <option value="Singles">Singles</option>
                              <option value="Parlays">Parlays</option>
                              <option value="Props">Props</option>
                              <option value="Futures">Futures</option>
                            </select>
                          </div>
                        </div>
                        
                        {/* NEW: Game Selection Dropdown (NFL/NBA only) */}
                        {isNFLorNBA && (
                          <div style={styles.formGroup}>
                            <label style={styles.label}>
                              Select Game {isLoadingGames && '(Loading...)'}
                            </label>
                            <select
                              style={styles.select}
                              value={pickData.gameId}
                              onChange={(e) => updatePick(pickId, 'gameId', e.target.value)}
                              disabled={isLoadingGames}
                            >
                              <option value="">-- Select Game (Optional) --</option>
                              {games.map((game: Game) => {
                                const gameTime = new Date(game.game_date).toLocaleString('en-US', {
                                  timeZone: 'America/New_York',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })
                                return (
                                  <option key={game.id} value={game.id}>
                                    {game.away_team} @ {game.home_team} ({gameTime})
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                        )}
                        
                        <div style={styles.formRow}>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Units at Risk</label>
                            <input
                              type="number"
                              style={styles.input}
                              value={pickData.units}
                              onChange={(e) => updatePick(pickId, 'units', e.target.value)}
                              step="0.01"
                              min="0.01"
                              max="10"
                              placeholder="1.5"
                              required
                            />
                          </div>
                          
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Bet Title</label>
                            <input
                              type="text"
                              style={styles.input}
                              value={pickData.betTitle}
                              onChange={(e) => updatePick(pickId, 'betTitle', e.target.value)}
                              placeholder="e.g. Ravens -5.5"
                              required
                            />
                          </div>
                        </div>
                        
                        <div style={styles.formRow}>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Odds</label>
                            <input
                              type="text"
                              style={styles.input}
                              value={pickData.odds}
                              onChange={(e) => updatePick(pickId, 'odds', e.target.value)}
                              placeholder="e.g. -110"
                              required
                            />
                          </div>
                          
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Sportsbook</label>
                            <input
                              type="text"
                              style={styles.input}
                              value={pickData.sportsbook}
                              onChange={(e) => updatePick(pickId, 'sportsbook', e.target.value)}
                              placeholder="e.g. DraftKings"
                              required
                            />
                          </div>
                        </div>
                        
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Analysis / Reasoning</label>
                          <RichTextEditor
                            value={pickData.analysis}
                            onChange={(value) => updatePick(pickId, 'analysis', value)}
                          />
                        </div>
                        
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Game Time (Eastern Time)</label>
                          <input
                            type="datetime-local"
                            style={styles.input}
                            value={pickData.gameTime}
                            onChange={(e) => updatePick(pickId, 'gameTime', e.target.value)}
                            required
                          />
                        </div>
                        
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Free Pick Option</label>
                          <div
                            style={{
                              ...styles.freePickToggle,
                              ...(pickData.isFree ? styles.freePickToggleActive : {})
                            }}
                            onClick={() => updatePick(pickId, 'isFree', !pickData.isFree)}
                          >
                            <div style={styles.toggleIndicator}>
                              {pickData.isFree && <span style={{ color: '#10b981' }}>✓</span>}
                            </div>
                            <span style={styles.toggleText}>Mark as Free Pick</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              
              <button
                type="button"
                style={styles.button}
                onClick={addPick}
              >
                + Add Another Pick
              </button>
            </div>
            
            <div style={styles.section}>
              <h2 style={styles.sectionHeader}>Select Your Display Record</h2>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Choose Performance Metric to Display</label>
                  <select
                    style={styles.select}
                    value={selectedPerformance}
                    onChange={(e) => setSelectedPerformance(e.target.value)}
                    required
                  >
                    <option value="">Select a performance metric...</option>
                    {performanceMetrics
                      .filter(m => m.total_picks > 0)
                      .map(metric => {
                        const timePeriodLabel: Record<string, string> = {
                          yesterday: 'Yesterday',
                          L3: 'Last 3 Days',
                          L5: 'Last 5 Days',
                          L7: 'Last 7 Days',
                          L14: 'Last 14 Days',
                          L30: 'Last 30 Days',
                          L6M: 'Last 6 Months',
                          year: 'Last Year',
                          all_time: 'All Time'
                        }
                        const label = timePeriodLabel[metric.time_period] || metric.time_period
                        const sportLabel = metric.sport === 'All Sports' ? 'All Sports' : metric.sport
                        return (
                          <option key={metric.id} value={metric.id}>
                            {label}: {metric.formatted_record} - {sportLabel}
                          </option>
                        )
                      })}
                  </select>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Current Win Streak</label>
                  <div style={styles.winStreakDisplay}>
                    {currentWinStreak} days
                  </div>
                </div>
              </div>
            </div>
            
            <div style={styles.formActions}>
              <button type="submit" style={{ ...styles.button, ...styles.buttonPrimary }}>
                Submit Picks
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '10rem 1rem 2rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: '0.25rem',
    background: 'linear-gradient(135deg, #1e3a8a, #60a5fa)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    textAlign: 'center',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '1.5rem'
  },
  card: {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px',
    padding: '1.25rem'
  },
  section: {
    marginBottom: '1.25rem',
    paddingBottom: '1.25rem',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  sectionHeader: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#60a5fa',
    marginBottom: '0.75rem'
  },
  formGroup: {
    marginBottom: '0.75rem'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.35rem',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.85)',
    fontSize: '0.8rem'
  },
  input: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.85rem'
  },
  select: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.85rem',
    cursor: 'pointer'
  },
  textarea: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.85rem',
    minHeight: '100px',
    resize: 'vertical' as const
  },
  pickCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '0.75rem'
  },
  pickHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
    cursor: 'pointer'
  },
  pickNumber: {
    fontWeight: 600,
    color: '#60a5fa',
    fontSize: '0.9rem'
  },
  pickContent: {
    marginTop: '0.75rem'
  },
  deletePick: {
    background: 'rgba(239,68,68,0.2)',
    border: 'none',
    color: '#ef4444',
    padding: '0.35rem 0.65rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    fontWeight: 600
  },
  freePickToggle: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    padding: '0.4rem 0.6rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  freePickToggleActive: {
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    borderColor: '#10b981'
  },
  toggleIndicator: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.7)',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  toggleText: {
    fontWeight: 500,
    color: 'rgba(255,255,255,0.8)'
  },
  winStreakDisplay: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    border: '1px solid #10b981',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 700,
    textAlign: 'center'
  },
  button: {
    background: 'linear-gradient(135deg, #1e2a47, #3b4a72)',
    color: '#fff',
    padding: '1rem 1.5rem',
    borderRadius: '12px',
    border: 'none',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer'
  },
  buttonPrimary: {
    background: 'linear-gradient(135deg, #3b82f6, #60a5fa)'
  },
  buttonWarning: {
    background: 'linear-gradient(135deg, #d97706, #f59e0b)'
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem',
    justifyContent: 'center'
  },
  successMessage: {
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    textAlign: 'center',
    fontWeight: 600,
    background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))',
    border: '1px solid rgba(16,185,129,0.3)',
    color: '#34d399'
  },
  errorMessage: {
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    textAlign: 'center',
    fontWeight: 600,
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#ef4444'
  },
  loadingState: {
    textAlign: 'center',
    padding: '2rem'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255,255,255,0.2)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 1rem'
  },
  recapContainer: {
    marginBottom: '2rem'
  },
  recapHeader: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  recapTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#d97706',
    marginBottom: '0.5rem'
  },
  recapSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.95rem'
  },
  recapProgress: {
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '1rem',
    margin: '1.5rem 0',
    textAlign: 'center'
  },
  recapProgressText: {
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: '0.5rem'
  },
  recapProgressBar: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '6px',
    height: '8px',
    overflow: 'hidden'
  },
  recapProgressFill: {
    background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
    height: '100%',
    transition: 'width 0.3s ease'
  },
  recapPickCard: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem'
  },
  recapPickInfo: {
    marginBottom: '1rem'
  },
  recapPickTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.95)',
    marginBottom: '0.5rem'
  },
  recapPickDetails: {
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '0.5rem'
  },
  recapPickMeta: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.7)',
    display: 'flex',
    gap: '1rem'
  },
  recapButtons: {
    display: 'flex',
    gap: '0.5rem'
  },
  recapButton: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    flex: 1
  },
  recapButtonWin: {
    background: '#10b981',
    color: '#fff'
  },
  recapButtonLoss: {
    background: '#ef4444',
    color: '#fff'
  },
  recapButtonPush: {
    background: '#d97706',
    color: '#fff'
  },
  recapButtonSelected: {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    border: '2px solid #fff'
  },
  recapUnitsResult: {
    marginTop: '0.5rem',
    padding: '0.5rem',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '6px',
    textAlign: 'center',
    fontSize: '0.9rem',
    fontWeight: 600
  }
}

