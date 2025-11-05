'use client'

import { useState, useEffect } from 'react'
import { useSubscription } from '../lib/hooks/useSubscription'
import { useUser, SignInButton } from '@clerk/nextjs'
import LockedWidget from '../components/LockedWidget'
import TopInsiderPicks from '../components/TopInsiderPicks'
import StatsWidget from '../components/StatsWidget'
import MatchupWidget from '../components/MatchupWidget'
import FantasyWidget from '../components/FantasyWidget'
import TDWidget from '../components/TDWidget'
import NewsWidget from '../components/NewsWidget'
import PropParlayWidget from '../components/PropParlayWidget'
import DiscordWidget from '../components/DiscordWidget'
import MaximizeProfitWidget from '../components/MaximizeProfitWidget'
import AffiliateWidget from '../components/AffiliateWidget'
import TopPropsWidget from '../components/TopPropsWidget'
import GameCard from '../components/GameCard'
import GameScriptModal from '../components/GameScriptModal'
import LoadingSpinner from '../components/LoadingSpinner'
import AICreditBadge from '../components/AICreditBadge'
import UnlockModal from '../components/UnlockModal'
import CreditConfirmModal from '../components/CreditConfirmModal'
import { ListTodo, UserRoundSearch, ScrollText } from 'lucide-react'
import { GoPlusCircle } from 'react-icons/go'
import { TiMinusOutline } from 'react-icons/ti'
import { FaWandMagicSparkles } from 'react-icons/fa6'
import { GiTwoCoins } from 'react-icons/gi'

interface GameSummary {
  gameId: string
  sport: string
  awayTeam: string
  homeTeam: string
  gameTime: string
  awayTeamLogo?: string
  homeTeamLogo?: string
  dataStrength?: 1 | 2 | 3 // Actual data strength from API
}

export default function Home() {
  const { isSignedIn, user } = useUser()
  const [triggerSignIn, setTriggerSignIn] = useState(false)
  
  // Track which SECTIONS are open (not individual widgets)
  // AI Game Intelligence is open by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['ai-intelligence', 'ai-intelligence-desktop']))
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [games, setGames] = useState<GameSummary[]>([])
  const [loadingGames, setLoadingGames] = useState(true)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [selectedGameSport, setSelectedGameSport] = useState<string>('NFL')
  const [scriptModalOpen, setScriptModalOpen] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [pendingGame, setPendingGame] = useState<{ id: string, sport: string, dataStrength: 1 | 2 | 3, matchup: string } | null>(null)
  const [selectedSport, setSelectedSport] = useState<'NFL' | 'NBA' | 'CFB' | 'NHL' | 'MLB'>('NFL')
  const [generatingGameId, setGeneratingGameId] = useState<string | null>(null)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [creditsRemaining, setCreditsRemaining] = useState<number | 'unlimited'>(0)
  const { isLoading, isSubscribed, firstName: subFirstName } = useSubscription()
  
  // For signed-in users without subscription, show "friend" instead of their name
  const firstName = (isSignedIn && !isSubscribed) ? 'friend' : (user?.firstName || subFirstName || null)

  useEffect(() => {
    // Set welcome message immediately, update when firstName or user changes
      setWelcomeMessage(getWelcomeMessage(firstName))
  }, [firstName, user])
  
  // Fetch credit status
  useEffect(() => {
    async function fetchCredits() {
      if (!isSignedIn) {
        setCreditsRemaining(0)
        return
      }
      
      try {
        const response = await fetch('/api/ai-credits/check')
        const data = await response.json()
        
        if (data.isPremium || data.creditsRemaining === 'unlimited') {
          setCreditsRemaining('unlimited')
    } else {
          setCreditsRemaining(data.creditsRemaining || 0)
        }
      } catch (error) {
        console.error('Error fetching credits:', error)
        setCreditsRemaining(0)
      }
    }
    
    fetchCredits()
  }, [isSignedIn, scriptModalOpen]) // Refetch when modal closes
  
  // Set a default message on mount
  useEffect(() => {
    if (!welcomeMessage) {
      setWelcomeMessage(getWelcomeMessage(null))
    }
  }, [])

  useEffect(() => {
    fetchTodaysGames()
  }, [])

  // Expose showUnlockModal globally so AICreditBadge can trigger it
  useEffect(() => {
    ;(window as any).showUnlockModal = () => {
      console.log('🚀 showUnlockModal called! Setting state to true')
      setShowUnlockModal(true)
    }
    console.log('✅ window.showUnlockModal exposed')
    return () => {
      delete (window as any).showUnlockModal
    }
  }, [])

  async function fetchTodaysGames() {
    try {
      console.log('🎮 Fetching today\'s games...')
      const response = await fetch('/api/games/today')
      console.log('📡 Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📊 Games data:', data)
      console.log('🎯 Total games:', data.games?.length || 0)
      
      // Transform API response to match GameSummary interface
      const transformedGames: GameSummary[] = (data.games || []).map((game: any) => {
        // Strip city names from team names - take the last word
        const awayTeamParts = game.away_team.split(' ')
        const homeTeamParts = game.home_team.split(' ')
        const awayNickname = awayTeamParts[awayTeamParts.length - 1]
        const homeNickname = homeTeamParts[homeTeamParts.length - 1]
        
        return {
          gameId: game.game_id, // Changed from game.id to match API format
          sport: game.sport,
          awayTeam: awayNickname,
          homeTeam: homeNickname,
          gameTime: game.game_date,
          dataStrength: 1 // Default strength, will be updated below
        }
      })
      
      setGames(transformedGames)
      
      // Fetch data strength for each game in parallel
      console.log('📊 Fetching data strength for all games...')
      const strengthPromises = transformedGames.map(async (game) => {
        try {
          const strengthRes = await fetch(
            `/api/game-intelligence/strength?gameId=${game.gameId}&league=${game.sport.toLowerCase()}`
          )
          if (strengthRes.ok) {
            const strengthData = await strengthRes.json()
            return { gameId: game.gameId, strength: strengthData.strength }
          }
        } catch (error) {
          console.error(`Error fetching strength for ${game.gameId}:`, error)
        }
        return { gameId: game.gameId, strength: 1 }
      })
      
      const strengthResults = await Promise.all(strengthPromises)
      
      // Update games with their actual strength
      const gamesWithStrength = transformedGames.map(game => {
        const strengthResult = strengthResults.find(s => s.gameId === game.gameId)
        return {
          ...game,
          dataStrength: (strengthResult?.strength || 1) as 1 | 2 | 3
        }
      })
      
      console.log('✅ Games with strength:', gamesWithStrength.map(g => `${g.gameId}: ${g.dataStrength}`))
      setGames(gamesWithStrength)
      
    } catch (error) {
      console.error('❌ Error fetching games:', error)
    } finally {
      setLoadingGames(false)
    }
  }

  async function handleAnalyzeGame(gameId: string, sport: string, dataStrength?: 1 | 2 | 3, matchup?: string) {
    console.log('🎮 GAME CLICKED:', gameId, sport)
    console.log('👤 User signed in?', isSignedIn, 'Type:', typeof isSignedIn)
    
    // Check if user is signed in - if not, trigger Clerk sign-in
    if (!isSignedIn) {
      console.log('❌ User not signed in - triggering sign-in modal')
      setTriggerSignIn(true)
      return
    }
    
    // Find the game to get its data strength and matchup
    const game = games.find(g => g.gameId === gameId)
    const strength = dataStrength || game?.dataStrength || 1
    const gameMatchup = matchup || (game ? `${game.awayTeam} @ ${game.homeTeam}` : '')
    
    // Store pending game info and show confirmation modal
    setPendingGame({ id: gameId, sport, dataStrength: strength, matchup: gameMatchup })
    setConfirmModalOpen(true)
  }
  
  function handleConfirmGeneration() {
    if (!pendingGame) return
    
    console.log('✅ Confirmed - Opening script modal for', pendingGame.id)
    setConfirmModalOpen(false)
    setGeneratingGameId(pendingGame.id)
    setSelectedGameId(pendingGame.id)
    setSelectedGameSport(pendingGame.sport)
    
    // Small delay to show "generating" state
    setTimeout(() => {
      setScriptModalOpen(true)
      setPendingGame(null)
    }, 300)
  }
  
  function handleCancelGeneration() {
    setConfirmModalOpen(false)
    setPendingGame(null)
  }

  function closeScriptModal() {
    setScriptModalOpen(false)
    setSelectedGameId(null)
    setGeneratingGameId(null)
  }

  // Filter and sort games by selected sport
  // Sort by: 1) Data strength (highest first), 2) Game time (earliest first)
  const filteredGames = games
    .filter(game => game.sport === selectedSport)
    .sort((a, b) => {
      // First, sort by data strength (highest to lowest: 3 > 2 > 1)
      const strengthDiff = (b.dataStrength || 1) - (a.dataStrength || 1)
      if (strengthDiff !== 0) return strengthDiff
      
      // If same strength, sort by game time (earliest first)
      return new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime()
    })

  function toggleSection(sectionId: string) {
    console.log('🔄 Toggle section:', sectionId, 'Current expanded:', Array.from(expandedSections))
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
      console.log('➖ Closing section:', sectionId)
    } else {
      newExpanded.add(sectionId)
      console.log('➕ Opening section:', sectionId)
    }
    setExpandedSections(newExpanded)
  }

  // If still loading, show a loading state
  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'white', opacity: 0.7 }}>Loading...</p>
      </div>
    )
  }

  const row1Widgets = [
    { 
      id: 'stats', 
      title: 'Public Betting', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de02c7e090d456d83b06c6_2.svg',
      borderColor: 'rgba(24, 118, 53, 0.6)',
      background: 'linear-gradient(135deg, rgba(24, 118, 53, 0.15) 0%, rgba(24, 118, 53, 0.08) 100%)',
      component: <StatsWidget /> 
    },
    { 
      id: 'matchup', 
      title: 'Matchup Data', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68ee51165777fa2c334aa52b_NEW%20WIDGET%20SVG%27S-4.svg',
      borderColor: 'rgba(217, 217, 217, 0.6)',
      background: 'linear-gradient(135deg, rgba(217, 217, 217, 0.15) 0%, rgba(217, 217, 217, 0.08) 100%)',
      component: <MatchupWidget /> 
    },
    { 
      id: 'news', 
      title: 'The Weekly Report', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0a1f1cd5677fd1b26751_NEW%20WIDGET%20SVG%27S-2.svg',
      borderColor: 'rgba(56, 182, 255, 0.6)',
      background: 'linear-gradient(135deg, rgba(56, 182, 255, 0.15) 0%, rgba(56, 182, 255, 0.08) 100%)',
      component: <NewsWidget /> 
    }
  ]

  const row2Widgets = [
    { 
      id: 'topprops', 
      title: 'Top Props', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68fbb24eb95da62bd1a77da7_3.svg',
      borderColor: 'rgba(139, 92, 246, 0.6)',
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)',
      component: <TopPropsWidget /> 
    },
    { 
      id: 'propparlay', 
      title: 'Prop Parlay Tool', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e144f04701a7e18985bc19_TICKET-5.svg',
      borderColor: 'rgba(94, 23, 235, 0.6)',
      background: 'linear-gradient(135deg, rgba(94, 23, 235, 0.15) 0%, rgba(94, 23, 235, 0.08) 100%)',
      component: <PropParlayWidget /> 
    },
    { 
      id: 'fantasy', 
      title: 'Weekly Fantasy Data', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68ddef5da02a4861948acc74_3.svg',
      borderColor: 'rgba(186, 19, 47, 0.6)',
      background: 'linear-gradient(135deg, rgba(186, 19, 47, 0.15) 0%, rgba(186, 19, 47, 0.08) 100%)',
      component: <FantasyWidget /> 
    },
    { 
      id: 'td', 
      title: 'Top TD Scorers', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68ddef5dd3c882be50e10645_4.svg',
      borderColor: 'rgba(255, 117, 31, 0.6)',
      background: 'linear-gradient(135deg, rgba(255, 117, 31, 0.15) 0%, rgba(255, 117, 31, 0.08) 100%)',
      component: <TDWidget /> 
    }
  ]

  const row3Widgets = [
    { 
      id: 'maximize', 
      title: 'Maximize Profit', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f5587d5070371cf5332631_MAXIMIZE%20PROFIT!.svg',
      borderColor: 'rgba(0, 87, 45, 0.6)',
      background: 'linear-gradient(135deg, rgba(0, 87, 45, 0.15) 0%, rgba(0, 87, 45, 0.08) 100%)',
      component: <MaximizeProfitWidget /> 
    },
    { 
      id: 'discord', 
      title: 'Connect Discord', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f51e56d751135b7de32426_9.svg',
      borderColor: 'rgba(88, 100, 241, 0.6)',
      background: 'linear-gradient(135deg, rgba(88, 100, 241, 0.15) 0%, rgba(88, 100, 241, 0.08) 100%)',
      component: <DiscordWidget /> 
    },
    { 
      id: 'affiliate', 
      title: 'Affiliate Program', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68fbb24e7da2cde41db44d4b_2.svg',
      borderColor: 'rgba(16, 185, 129, 0.6)',
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)',
      component: <AffiliateWidget /> 
    }
  ]

  return (
    <>
      <div className="dashboard-orbs" style={{ minHeight: '100vh', position: 'relative' }}>
        {/* Floating orbs - can be removed if DarkVeil replaces them */}
        <div className="orb-3"></div>
        <div className="orb-4"></div>
        <div className="orb-5"></div>


      <div style={{ padding: '120px 1rem 1.5rem 1rem', maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
      <div style={{ 
        marginBottom: '2rem',
        padding: '0.5rem 0', // Only vertical padding, horizontal is inherited from parent
        textAlign: 'left' as const,
        position: 'relative',
        zIndex: 1
      }}>
          <p style={{ fontSize: '1.3rem', color: '#ffffff', marginBottom: '0.75rem', fontWeight: '600' }}>
            {welcomeMessage}
          </p>
          {/* Credits Badge - directly under personalized headline */}
          <AICreditBadge onShowModal={() => setShowUnlockModal(true)} />
        </div>

        {/* Divider line above AI section */}
        <div style={{ 
          width: '100%', 
          height: '1px', 
          background: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
          marginBottom: '2rem'
        }} />

        {/* AI GAME INTELLIGENCE SECTION - MOBILE */}
        <div className="mobile-view" style={{ marginBottom: '2.5rem', position: 'relative' }}>
          <h3 
            onClick={() => toggleSection('ai-intelligence')}
            style={{ 
              fontSize: '1.2rem', 
              marginBottom: '0.5rem', 
              opacity: 0.9, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <FaWandMagicSparkles size={18} style={{ color: '#ffffff', opacity: 1 }} />
            AI Game Scripts
            <span style={{
              fontSize: '0.6rem',
              fontWeight: '600',
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '4px',
              padding: '2px 6px',
              marginLeft: '0.25rem'
            }}>
              BETA
            </span>
            <span style={{ marginLeft: 'auto' }}>
              {expandedSections.has('ai-intelligence') ? <TiMinusOutline size={24} /> : <GoPlusCircle size={24} />}
            </span>
          </h3>
          {expandedSections.has('ai-intelligence') && (
            <>
              <p style={{ 
                fontSize: '0.85rem', 
                color: 'rgba(255, 255, 255, 0.6)', 
                marginBottom: '0.75rem',
                lineHeight: '1.5'
              }}>
                Select a sport, pick a game, and get an AI powered script with real Insider picks and data
              </p>

              {/* Sport Tabs */}
              <div style={{ 
                display: 'flex', 
                gap: '0.4rem', 
                marginBottom: '0.75rem',
                justifyContent: 'flex-start', // Left-aligned
                flexWrap: 'wrap' // Allow wrapping if needed
              }}>
                {[
                  { id: 'NFL', label: 'NFL', active: true },
                  { id: 'NBA', label: 'NBA', active: true },
                  { id: 'CFB', label: 'CFB', active: false },
                  { id: 'NHL', label: 'NHL', active: false },
                  { id: 'MLB', label: 'MLB', active: false }
                ].map(sport => (
                  <button
                    key={sport.id}
                    onClick={() => sport.active && setSelectedSport(sport.id as any)}
                    style={{
                      padding: '0.4rem 0.8rem', // Smaller, compact
                      borderRadius: '6px',
                      border: selectedSport === sport.id 
                        ? '1px solid rgba(139, 92, 246, 0.4)' 
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      background: selectedSport === sport.id
                        ? 'rgba(139, 92, 246, 0.15)'
                        : 'rgba(255, 255, 255, 0.02)',
                      color: !sport.active 
                        ? 'rgba(255, 255, 255, 0.3)'
                        : selectedSport === sport.id 
                          ? '#a78bfa' 
                          : 'rgba(255, 255, 255, 0.65)',
                      fontSize: '0.75rem', // Slightly larger for readability
                      fontWeight: selectedSport === sport.id ? '600' : '500',
                      cursor: sport.active ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      opacity: !sport.active ? 0.4 : 1
                    }}
                  >
                    {sport.label}
                  </button>
                ))}
        </div>
        
              {/* Game Cards - Horizontal Scroll */}
              {loadingGames ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem'
                }}>
                  <LoadingSpinner size="large" text="Loading games..." />
                </div>
              ) : filteredGames.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem',
                  color: 'rgba(255, 255, 255, 0.5)'
                }}>
                  No {selectedSport} games today
                </div>
              ) : (
                <div style={{ 
                  display: 'flex',
                  gap: '0.75rem',
                  overflowX: 'auto',
                  paddingBottom: '0.75rem',
                  scrollbarWidth: 'thin' as const,
                  scrollbarColor: 'rgba(139, 92, 246, 0.5) rgba(255, 255, 255, 0.1)'
                }}>
                  {filteredGames.map((game, index) => {
                    // Parse game time - API returns military time (24-hour) in EST
                    const gameDate = new Date(game.gameTime)
                    
                    // Extract hours and minutes (already in EST from API)
                    const hours24 = gameDate.getUTCHours()
                    const minutes = gameDate.getUTCMinutes()
                    
                    // Convert military time to 12-hour format
                    const ampm = hours24 >= 12 ? 'PM' : 'AM'
                    const displayHour = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24
                    const displayMinutes = minutes.toString().padStart(2, '0')
                    const time = `${displayHour}:${displayMinutes} ${ampm}`
                    
                    // Format date
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                    const formattedDate = `${monthNames[gameDate.getUTCMonth()]} ${gameDate.getUTCDate()}`
                    
                    const isGenerating = generatingGameId === game.gameId

                    // Active data strength from API (defaults to 1 if not available)
                    const scriptStrength = game.dataStrength || 1
                    const strengthLabel = scriptStrength === 1 ? 'Minimal' : scriptStrength === 2 ? 'Above Avg' : 'Strong'

                    return (
                      <div
                        key={game.gameId}
                        onClick={() => !isGenerating && handleAnalyzeGame(game.gameId, game.sport)}
                        style={{
                          minWidth: '220px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          backdropFilter: 'blur(20px)',
                          border: '0.5px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          padding: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column' as const,
                          gap: '0.5rem',
                          transition: 'all 0.3s',
                          cursor: isGenerating ? 'wait' : 'pointer',
                          opacity: isGenerating ? 0.7 : 1
                        }}
                      >
                        {/* Top Row: Team names + Strength Indicator or Credit Cost */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem'
                        }}>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: '600', 
                            color: '#fff',
                            lineHeight: '1.2'
                          }}>
                            {game.awayTeam} @ {game.homeTeam}
                          </div>
                          
                          {/* Show credit cost for non-premium users, bar graph for premium */}
                          {isSubscribed ? (
                            /* Horizontal Bar Chart - Red, Yellow, Green (Premium Users) */
                            <div style={{
                              display: 'flex',
                              gap: '3px',
                              alignItems: 'flex-end',
                              flexShrink: 0
                            }}>
                              {/* Red bar (smallest) */}
                              <div style={{
                                width: '6px',
                                height: '8px',
                                borderRadius: '2px',
                                background: scriptStrength >= 1 ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
                                boxShadow: scriptStrength >= 1 ? '0 0 6px rgba(239, 68, 68, 0.4)' : 'none',
                                transition: 'all 0.3s'
                              }} />
                              
                              {/* Yellow bar (medium) */}
                              <div style={{
                                width: '6px',
                                height: '12px',
                                borderRadius: '2px',
                                background: scriptStrength >= 2 ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)',
                                boxShadow: scriptStrength >= 2 ? '0 0 6px rgba(245, 158, 11, 0.4)' : 'none',
                                transition: 'all 0.3s'
                              }} />
                              
                              {/* Green bar (tallest) */}
                              <div style={{
                                width: '6px',
                                height: '16px',
                                borderRadius: '2px',
                                background: scriptStrength >= 3 ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                                boxShadow: scriptStrength >= 3 ? '0 0 6px rgba(16, 185, 129, 0.4)' : 'none',
                                transition: 'all 0.3s'
                              }} />
                            </div>
                          ) : (
                            /* Credit Cost Badge (Non-Premium Users) - Orange (1), Yellow (2), Green (3) */
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.25rem 0.5rem',
                              background: scriptStrength === 3 
                                ? 'rgba(16, 185, 129, 0.1)' 
                                : scriptStrength === 2 
                                ? 'rgba(251, 191, 36, 0.1)' 
                                : 'rgba(249, 115, 22, 0.1)',
                              border: scriptStrength === 3 
                                ? '1px solid rgba(16, 185, 129, 0.3)' 
                                : scriptStrength === 2 
                                ? '1px solid rgba(251, 191, 36, 0.3)' 
                                : '1px solid rgba(249, 115, 22, 0.3)',
                              borderRadius: '6px',
                              flexShrink: 0
                            }}>
                              <GiTwoCoins style={{ 
                                color: scriptStrength === 3 
                                  ? '#10b981' 
                                  : scriptStrength === 2 
                                  ? '#fbbf24' 
                                  : '#f97316', 
                                fontSize: '0.85rem' 
                              }} />
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                color: scriptStrength === 3 
                                  ? '#10b981' 
                                  : scriptStrength === 2 
                                  ? '#fbbf24' 
                                  : '#f97316'
                              }}>
                                {scriptStrength}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Active Data Label */}
                        <div style={{ 
                          fontSize: '0.65rem', 
                          color: 'rgba(255, 255, 255, 0.5)',
                          lineHeight: '1'
                        }}>
                          Active Data: {strengthLabel}
                        </div>

                        {/* Bottom Row: Date + Time + AI Icon + Generate Text */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          {/* Date + Time */}
                          <div style={{ 
                            fontSize: '0.6rem', 
                            color: 'rgba(255, 255, 255, 0.5)',
                            display: 'flex',
                            flexDirection: 'column' as const,
                            gap: '0.1rem'
                          }}>
                            <div style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.6)' }}>{formattedDate}</div>
                            <div>{time} EST</div>
                          </div>

                          {/* AI Icon + Generate Text */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            <FaWandMagicSparkles size={12} style={{ color: '#a78bfa' }} />
                            <span style={{
                              color: '#a78bfa',
                              fontSize: '0.7rem',
                              fontWeight: '600'
                            }}>
                              {isGenerating ? 'Generating...' : 'Generate...'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* TOP INSIDER PICKS SECTION - MOBILE */}
        <div className="mobile-view" style={{ marginBottom: '2.5rem' }}>
          <TopInsiderPicks isCollapsible={true} defaultExpanded={true} />
        </div>

        {/* AI GAME INTELLIGENCE SECTION - DESKTOP */}
        <div className="desktop-view" style={{ marginBottom: '2.5rem', position: 'relative' }}>
          <h3 
            onClick={() => toggleSection('ai-intelligence-desktop')}
            style={{ 
              fontSize: '1.2rem', 
              marginBottom: '0.5rem', 
              opacity: 0.9, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <FaWandMagicSparkles size={18} style={{ color: '#ffffff', opacity: 1 }} />
            AI Game Scripts
            <span style={{
              fontSize: '0.6rem',
              fontWeight: '600',
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '4px',
              padding: '2px 6px',
              marginLeft: '0.25rem'
            }}>
              BETA
            </span>
            <span style={{ marginLeft: 'auto' }}>
              {expandedSections.has('ai-intelligence-desktop') ? <TiMinusOutline size={24} /> : <GoPlusCircle size={24} />}
            </span>
          </h3>
          {expandedSections.has('ai-intelligence-desktop') && (
            <>
              <p style={{ 
                fontSize: '0.85rem', 
                color: 'rgba(255, 255, 255, 0.6)', 
                marginBottom: '0.75rem',
                lineHeight: '1.5'
              }}>
                Select a sport, pick a game, and get an AI powered script with real Insider picks and data
              </p>

              {/* Sport Tabs */}
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                marginBottom: '0.75rem',
                justifyContent: 'flex-start', // Left-aligned
                flexWrap: 'wrap' // Allow wrapping if needed
              }}>
                {[
                  { id: 'NFL', label: 'NFL', active: true },
                  { id: 'NBA', label: 'NBA', active: true },
                  { id: 'CFB', label: 'CFB', active: false },
                  { id: 'NHL', label: 'NHL', active: false },
                  { id: 'MLB', label: 'MLB', active: false }
                ].map(sport => (
                  <button
                    key={sport.id}
                    onClick={() => sport.active && setSelectedSport(sport.id as any)}
                    style={{
                      padding: '0.5rem 1.25rem', // Compact, not full-width
                      borderRadius: '6px',
                      border: selectedSport === sport.id 
                        ? '1px solid rgba(139, 92, 246, 0.4)' 
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      background: selectedSport === sport.id
                        ? 'rgba(139, 92, 246, 0.15)'
                        : 'rgba(255, 255, 255, 0.02)',
                      color: !sport.active 
                        ? 'rgba(255, 255, 255, 0.3)'
                        : selectedSport === sport.id 
                          ? '#a78bfa' 
                          : 'rgba(255, 255, 255, 0.65)',
                      fontSize: '0.85rem', // Slightly larger for desktop
                      fontWeight: selectedSport === sport.id ? '600' : '500',
                      cursor: sport.active ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      opacity: !sport.active ? 0.4 : 1
                    }}
                  >
                    {sport.label}
                  </button>
                ))}
              </div>

              {/* Game Cards - Horizontal Scroll */}
              {loadingGames ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem'
                }}>
                  <LoadingSpinner size="large" text="Loading games..." />
                </div>
              ) : filteredGames.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem',
                  color: 'rgba(255, 255, 255, 0.5)'
                }}>
                  No {selectedSport} games today
                </div>
              ) : (
                <div style={{ 
                  display: 'flex',
                  gap: '0.75rem',
                  overflowX: 'auto',
                  paddingBottom: '0.75rem',
                  scrollbarWidth: 'thin' as const,
                  scrollbarColor: 'rgba(139, 92, 246, 0.5) rgba(255, 255, 255, 0.1)'
                }}>
                  {filteredGames.map((game, index) => {
                    // Parse game time - API returns military time (24-hour) in EST
                    const gameDate = new Date(game.gameTime)
                    
                    // Extract hours and minutes (already in EST from API)
                    const hours24 = gameDate.getUTCHours()
                    const minutes = gameDate.getUTCMinutes()
                    
                    // Convert military time to 12-hour format
                    const ampm = hours24 >= 12 ? 'PM' : 'AM'
                    const displayHour = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24
                    const displayMinutes = minutes.toString().padStart(2, '0')
                    const time = `${displayHour}:${displayMinutes} ${ampm}`
                    
                    // Format date
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                    const formattedDate = `${monthNames[gameDate.getUTCMonth()]} ${gameDate.getUTCDate()}`
                    
                    const isGenerating = generatingGameId === game.gameId

                    // Active data strength from API (defaults to 1 if not available)
                    const scriptStrength = game.dataStrength || 1
                    const strengthLabel = scriptStrength === 1 ? 'Minimal' : scriptStrength === 2 ? 'Above Avg' : 'Strong'

                    return (
                      <div
                        key={game.gameId}
                        onClick={() => !isGenerating && handleAnalyzeGame(game.gameId, game.sport)}
                  style={{ 
                          minWidth: '220px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          backdropFilter: 'blur(20px)',
                          border: '0.5px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          padding: '0.75rem',
                    display: 'flex',
                          flexDirection: 'column' as const,
                          gap: '0.5rem',
                          transition: 'all 0.3s',
                          cursor: isGenerating ? 'wait' : 'pointer',
                          opacity: isGenerating ? 0.7 : 1
                        }}
                      >
                        {/* Top Row: Team names + Strength Indicator or Credit Cost */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                    justifyContent: 'space-between',
                          gap: '0.5rem'
                        }}>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: '600', 
                            color: '#fff',
                            lineHeight: '1.2'
                          }}>
                            {game.awayTeam} @ {game.homeTeam}
                          </div>
                          
                          {/* Show credit cost for non-premium users, bar graph for premium */}
                          {isSubscribed ? (
                            /* Horizontal Bar Chart - Red, Yellow, Green (Premium Users) */
                            <div style={{
                              display: 'flex',
                              gap: '3px',
                              alignItems: 'flex-end',
                              flexShrink: 0
                            }}>
                              {/* Red bar (smallest) */}
                              <div style={{
                                width: '6px',
                                height: '8px',
                                borderRadius: '2px',
                                background: scriptStrength >= 1 ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
                                boxShadow: scriptStrength >= 1 ? '0 0 6px rgba(239, 68, 68, 0.4)' : 'none',
                                transition: 'all 0.3s'
                              }} />
                              
                              {/* Yellow bar (medium) */}
                              <div style={{
                                width: '6px',
                                height: '12px',
                                borderRadius: '2px',
                                background: scriptStrength >= 2 ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)',
                                boxShadow: scriptStrength >= 2 ? '0 0 6px rgba(245, 158, 11, 0.4)' : 'none',
                                transition: 'all 0.3s'
                              }} />
                              
                              {/* Green bar (tallest) */}
                              <div style={{
                                width: '6px',
                                height: '16px',
                                borderRadius: '2px',
                                background: scriptStrength >= 3 ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                                boxShadow: scriptStrength >= 3 ? '0 0 6px rgba(16, 185, 129, 0.4)' : 'none',
                                transition: 'all 0.3s'
                              }} />
                            </div>
                          ) : (
                            /* Credit Cost Badge (Non-Premium Users) - Orange (1), Yellow (2), Green (3) */
                            <div style={{
                              display: 'flex',
                    alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.25rem 0.5rem',
                              background: scriptStrength === 3 
                                ? 'rgba(16, 185, 129, 0.1)' 
                                : scriptStrength === 2 
                                ? 'rgba(251, 191, 36, 0.1)' 
                                : 'rgba(249, 115, 22, 0.1)',
                              border: scriptStrength === 3 
                                ? '1px solid rgba(16, 185, 129, 0.3)' 
                                : scriptStrength === 2 
                                ? '1px solid rgba(251, 191, 36, 0.3)' 
                                : '1px solid rgba(249, 115, 22, 0.3)',
                              borderRadius: '6px',
                              flexShrink: 0
                            }}>
                              <GiTwoCoins style={{ 
                                color: scriptStrength === 3 
                                  ? '#10b981' 
                                  : scriptStrength === 2 
                                  ? '#fbbf24' 
                                  : '#f97316', 
                                fontSize: '0.85rem' 
                              }} />
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                color: scriptStrength === 3 
                                  ? '#10b981' 
                                  : scriptStrength === 2 
                                  ? '#fbbf24' 
                                  : '#f97316'
                              }}>
                                {scriptStrength}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Active Data Label */}
                        <div style={{ 
                          fontSize: '0.65rem', 
                          color: 'rgba(255, 255, 255, 0.5)',
                          lineHeight: '1'
                        }}>
                          Active Data: {strengthLabel}
                        </div>

                        {/* Bottom Row: Date + Time + AI Icon + Generate Text */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          {/* Date + Time */}
                          <div style={{ 
                            fontSize: '0.6rem', 
                            color: 'rgba(255, 255, 255, 0.5)',
                            display: 'flex',
                            flexDirection: 'column' as const,
                            gap: '0.1rem'
                          }}>
                            <div style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.6)' }}>{formattedDate}</div>
                            <div>{time} EST</div>
                          </div>

                          {/* AI Icon + Generate Text */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            <FaWandMagicSparkles size={12} style={{ color: '#a78bfa' }} />
                            <span style={{
                              color: '#a78bfa',
                              fontSize: '0.7rem',
                              fontWeight: '600'
                            }}>
                              {isGenerating ? 'Generating...' : 'Generate...'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* TOP INSIDER PICKS SECTION - DESKTOP */}
        <div className="desktop-view" style={{ marginBottom: '2.5rem' }}>
          <TopInsiderPicks isCollapsible={true} defaultExpanded={true} />
        </div>
        
        {/* MOBILE VIEW - Accordion */}
        <div className="mobile-view">
          {/* Quick Data Section - COLLAPSIBLE */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 
              onClick={() => toggleSection('quickdata')}
                  style={{ 
                fontSize: '1.2rem', 
                marginBottom: '1rem', 
                opacity: 0.9, 
                    display: 'flex',
                    alignItems: 'center',
                gap: '0.5rem',
                    cursor: 'pointer',
                color: '#fff'
              }}
            >
              <ListTodo size={18} strokeWidth={2} style={{ color: '#ffffff', opacity: 1 }} />
              Quick Data
              <span style={{ marginLeft: 'auto' }}>
                {expandedSections.has('quickdata') ? <TiMinusOutline size={24} /> : <GoPlusCircle size={24} />}
              </span>
            </h3>
            {expandedSections.has('quickdata') && (
              <div>
                {row1Widgets.map(widget => (
                  <div key={widget.id} style={{ marginBottom: '0.75rem' }}>
                    <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                      {widget.component}
                    </LockedWidget>
              </div>
            ))}
              </div>
            )}
          </div>

          {/* Prop Tools Section - COLLAPSIBLE */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 
              onClick={() => toggleSection('proptools')}
                  style={{ 
                fontSize: '1.2rem', 
                marginBottom: '1rem', 
                opacity: 0.9, 
                    display: 'flex',
                    alignItems: 'center',
                gap: '0.5rem',
                    cursor: 'pointer',
                color: '#fff'
              }}
            >
              <UserRoundSearch size={18} strokeWidth={2} style={{ color: '#ffffff', opacity: 1 }} />
              Prop Tools
              <span style={{ marginLeft: 'auto' }}>
                {expandedSections.has('proptools') ? <TiMinusOutline size={24} /> : <GoPlusCircle size={24} />}
              </span>
            </h3>
            {expandedSections.has('proptools') && (
              <div>
                {row2Widgets.map(widget => (
                  <div key={widget.id} style={{ marginBottom: '0.75rem' }}>
                    <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                      {widget.component}
                    </LockedWidget>
                  </div>
                ))}
                  </div>
                )}
          </div>

          {/* Resources Section - COLLAPSIBLE */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 
              onClick={() => toggleSection('resources')}
              style={{ 
                fontSize: '1.2rem', 
                marginBottom: '1rem', 
                opacity: 0.9, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                cursor: 'pointer',
                color: '#fff'
              }}
            >
              <ScrollText size={18} strokeWidth={2} style={{ color: '#ffffff', opacity: 1 }} />
              Resources
              <span style={{ marginLeft: 'auto' }}>
                {expandedSections.has('resources') ? <TiMinusOutline size={24} /> : <GoPlusCircle size={24} />}
              </span>
            </h3>
            {expandedSections.has('resources') && (
              <div>
                {row3Widgets.map(widget => (
                  <div key={widget.id} style={{ marginBottom: '0.75rem' }}>
                    {widget.component}
              </div>
            ))}
              </div>
            )}
          </div>
        </div>

        {/* DESKTOP VIEW - Collapsible Sections */}
        <div className="desktop-view">
          {/* Quick Data Section - COLLAPSIBLE */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 
              onClick={() => toggleSection('quickdata-desktop')}
              style={{ 
                fontSize: '1.2rem', 
                marginBottom: '2rem', 
                opacity: 0.9, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                cursor: 'pointer',
                color: '#fff'
              }}
            >
              <ListTodo size={18} strokeWidth={2} style={{ color: '#ffffff', opacity: 1 }} />
              Quick Data
              <span style={{ marginLeft: 'auto' }}>
                {expandedSections.has('quickdata-desktop') ? <TiMinusOutline size={24} /> : <GoPlusCircle size={24} />}
              </span>
          </h3>
            {expandedSections.has('quickdata-desktop') && (
          <div style={{ 
            display: 'flex', 
            gap: '1.5rem', 
            overflowX: 'auto', 
            paddingBottom: '1rem',
            marginBottom: '1.5rem',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.2) transparent'
          }}>
            <div style={{ minWidth: '380px' }}>
              <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                <StatsWidget />
              </LockedWidget>
            </div>
            <div style={{ minWidth: '380px' }}>
              <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                <MatchupWidget />
              </LockedWidget>
            </div>
            <div style={{ minWidth: '380px' }}>
              <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                <NewsWidget />
              </LockedWidget>
            </div>
              </div>
            )}
          </div>

          {/* Prop Tools Section - COLLAPSIBLE */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 
              onClick={() => toggleSection('proptools-desktop')}
              style={{ 
                fontSize: '1.2rem', 
                marginBottom: '2rem', 
                opacity: 0.9, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                cursor: 'pointer',
                color: '#fff'
              }}
            >
              <UserRoundSearch size={18} strokeWidth={2} style={{ color: '#ffffff', opacity: 1 }} />
              Prop Tools
              <span style={{ marginLeft: 'auto' }}>
                {expandedSections.has('proptools-desktop') ? <TiMinusOutline size={24} /> : <GoPlusCircle size={24} />}
              </span>
          </h3>
            {expandedSections.has('proptools-desktop') && (
          <div style={{ 
            display: 'flex', 
            gap: '1.5rem', 
            overflowX: 'auto', 
            paddingBottom: '1rem',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.2) transparent'
          }}>
                <div style={{ minWidth: '380px' }}>
                  <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                    <TopPropsWidget />
                  </LockedWidget>
                </div>
            <div style={{ minWidth: '380px' }}>
              <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                <PropParlayWidget />
              </LockedWidget>
            </div>
            <div style={{ minWidth: '380px' }}>
              <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                <FantasyWidget />
              </LockedWidget>
            </div>
            <div style={{ minWidth: '380px' }}>
              <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                <TDWidget />
              </LockedWidget>
            </div>
              </div>
            )}
          </div>

          {/* Resources Section - COLLAPSIBLE */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 
              onClick={() => toggleSection('resources-desktop')}
              style={{ 
                fontSize: '1.2rem', 
                marginBottom: '2rem', 
                opacity: 0.9, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                cursor: 'pointer',
                color: '#fff'
              }}
            >
              <ScrollText size={18} strokeWidth={2} style={{ color: '#ffffff', opacity: 1 }} />
              Resources
              <span style={{ marginLeft: 'auto' }}>
                {expandedSections.has('resources-desktop') ? <TiMinusOutline size={24} /> : <GoPlusCircle size={24} />}
              </span>
            </h3>
            {expandedSections.has('resources-desktop') && (
              <div style={{ 
                display: 'flex', 
                gap: '1.5rem', 
                overflowX: 'auto', 
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.2) transparent'
              }}>
                <div style={{ minWidth: '380px' }}>
                  <MaximizeProfitWidget />
                </div>
                <div style={{ minWidth: '380px' }}>
                  <DiscordWidget />
                </div>
                <div style={{ minWidth: '380px' }}>
                  <AffiliateWidget />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rest of your existing code */}
        {/* Divider line after Premium Prop tools */}
        <div style={{ 
          width: '100%', 
          height: '1px', 
          background: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
          margin: '2rem 0'
        }} />

        <div style={{ 
          marginTop: '2rem',
          padding: '1rem 0',
          textAlign: 'left' as const,
          position: 'relative',
          zIndex: 1
        }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#ffffff', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Try our FREE mini betting tools
            <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0f9c3ea0594da2784e87_6.svg" 
                 style={{ width: '28px', height: '28px', opacity: 0.7 }} alt="" />
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <a href="https://www.thebettinginsider.com/tools/bankroll-builder" style={toolLinkStyle}>
              <span style={topTagStyle}>TOP</span>
              Bankroll Builder
            </a>
            <a href="https://www.thebettinginsider.com/tools/insider-betting-guide" style={toolLinkStyle}>
              <span style={favTagStyle}>FAV</span>
              Betting Guide
            </a>
            <a href="https://www.thebettinginsider.com/daily-mlb-game-stats" style={toolLinkStyle}>
              Batter v Pitcher
            </a>
            <a href="https://www.thebettinginsider.com/tools/roi-calculator" style={toolLinkStyle}>
              ROI Calculator
            </a>
            <a href="https://www.thebettinginsider.com/tools/parlay-calculator" style={toolLinkStyle}>
              Parlay Calculator
            </a>
            <a href="https://www.thebettinginsider.com/action-systems" style={toolLinkStyle}>
              About Systems
            </a>
          </div>
        </div>

        <div style={{ 
          marginTop: '2rem',
          padding: '1rem 0',
          textAlign: 'left' as const,
          position: 'relative',
          zIndex: 1
        }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#ffffff', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Get Help
            <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0f9c5a2af4dfb7b59b39_7.svg" 
                 style={{ width: '28px', height: '28px', opacity: 0.7 }} alt="" />
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
            <a href="https://billing.stripe.com/p/login/cN2eYg15W3W77rW288" style={helpLinkStyle}>
              Manage Subscription
            </a>
            <a href="https://www.thebettinginsider.com/insider-faqs" style={helpLinkStyle}>
              Common Questions
            </a>
            <a href="https://www.thebettinginsider.com/contact-us" style={helpLinkStyle}>
              Contact Us
            </a>
            <a href="https://www.thebettinginsider.com/contact-us" style={helpLinkStyle}>
              About Company
            </a>
            <a href="https://www.thebettinginsider.com/policies/terms-of-service" style={helpLinkStyle}>
              Terms of Service
            </a>
            <a href="https://www.thebettinginsider.com/policies/refund-policy" style={helpLinkStyle}>
              Refund Policy
            </a>
            <a href="https://www.thebettinginsider.com/policies/privacy-policy" style={helpLinkStyle}>
              Privacy
            </a>
          </div>
        </div>
      </div>
    </div>

    {/* Game Script Modal */}
    <GameScriptModal
      isOpen={scriptModalOpen}
      gameId={selectedGameId}
      sport={selectedGameSport}
      onClose={closeScriptModal}
    />

    {/* Unlock/Purchase Modal */}
    {console.log('📦 Page render - showUnlockModal state:', showUnlockModal)}
    <UnlockModal 
      isOpen={showUnlockModal}
      onClose={() => {
        console.log('❌ Closing UnlockModal')
        setShowUnlockModal(false)
      }}
    />
    
    {/* Credit Confirmation Modal */}
    {pendingGame && (
      <CreditConfirmModal 
        isOpen={confirmModalOpen}
        onClose={handleCancelGeneration}
        onConfirm={handleConfirmGeneration}
        creditCost={pendingGame.dataStrength}
        dataStrength={pendingGame.dataStrength === 1 ? 'Minimal' : pendingGame.dataStrength === 2 ? 'Above Avg' : 'Strong'}
        gameMatchup={pendingGame.matchup}
        creditsRemaining={creditsRemaining}
      />
    )}

    {/* Hidden SignInButton for triggering Clerk modal */}
    <SignInButton mode="modal">
      <button 
        data-clerk-trigger
        ref={(el) => {
          if (el && triggerSignIn) {
            el.click()
            setTriggerSignIn(false)
          }
        }}
        style={{ display: 'none' }}
      />
    </SignInButton>
    </>
  )
}

// Welcome message generator
function getWelcomeMessage(firstName: string | null): string {
  const name = firstName || 'friend'
  
  // If no firstName (not logged in), return special message
  if (!firstName) {
    return 'Welcome to Insider Sports, please login to access our tools!'
  }

  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.

  // Time-based messages (70% of the time)
  const timeMessages = [
    { condition: hour >= 5 && hour < 12, message: `Good morning, ${name}! Let's start hot` },
    { condition: hour >= 12 && hour < 17, message: `Good afternoon, ${name}! Lines are moving` },
    { condition: hour >= 18 && hour < 23, message: `Evening action incoming, ${name}` },
    { condition: hour >= 0 && hour < 5, message: `Burning the midnight oil, ${name}?` }
  ]

  // Day-based messages - FIXED INDEX (0 = Sunday, 6 = Saturday)
  const dayMessages = [
    `Sunday slate domination, ${name}`, // Sunday (0)
    `Let's start the week strong, ${name}`, // Monday (1)
    `Let's keep the momentum going, ${name}`, // Tuesday (2)
    `Midweek magic time, ${name}`, // Wednesday (3)
    `Let's have a great Thursday, ${name}`, // Thursday (4)
    `Let's finish the week hot, ${name}`, // Friday (5)
    `Weekend action awaits, ${name}`, // Saturday (6)
  ]

  // Basic messages
  const basicMessages = [
    `Welcome back, ${name}!`,
    `Let's dominate today, ${name}`,
    `Ready to win big, ${name}?`,
    `Let's make some money, ${name}`,
    `Time to cash in, ${name}`,
    `Let's have a great day, ${name}`,
    `Welcome to the edge, ${name}`,
    `Let's get after it, ${name}`,
    `Time to find the value, ${name}`,
    `Sharp plays incoming, ${name}`
  ]

  const random = Math.random()

  // 70% time-based
  if (random < 0.7) {
    const timeMessage = timeMessages.find(m => m.condition)
    if (timeMessage) return timeMessage.message
  }

  // 20% day-based
  if (random < 0.9) {
    return dayMessages[day]
  }

  // 10% random basic
  return basicMessages[Math.floor(Math.random() * basicMessages.length)]
}

const toolLinkStyle = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  padding: '1rem',
  color: 'white',
  textDecoration: 'none',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.9rem',
  boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.2)'
}

const helpLinkStyle = {
  color: '#ffffff',
  textDecoration: 'none',
  fontSize: '0.85rem',
  transition: 'color 0.2s'
}

const topTagStyle = {
  background: '#ef4444',
  color: 'white',
  padding: '0.2rem 0.4rem',
  borderRadius: '4px',
  fontSize: '0.65rem',
  fontWeight: '700'
}

const favTagStyle = {
  background: '#f59e0b',
  color: 'white',
  padding: '0.2rem 0.4rem',
  borderRadius: '4px',
  fontSize: '0.65rem',
  fontWeight: '700'
}