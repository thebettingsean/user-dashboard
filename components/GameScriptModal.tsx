'use client'

import { useState, useEffect } from 'react'
import { X, TrendingUp, Users, Trophy, Target, CheckCircle } from 'lucide-react'
import { FaWandMagicSparkles } from 'react-icons/fa6'
import { useUser, SignInButton } from '@clerk/nextjs'
import LoadingSpinner from './LoadingSpinner'

interface GameScriptModalProps {
  isOpen: boolean
  gameId: string | null
  sport: string
  onClose: () => void
}

interface ScriptData {
  script: string
  dataStrength: number
  generatedAt: string
  cached: boolean
}

export default function GameScriptModal({ isOpen, gameId, sport, onClose }: GameScriptModalProps) {
  const { isSignedIn, user } = useUser()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scriptData, setScriptData] = useState<ScriptData | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [textFading, setTextFading] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)

  const loadingSteps = [
    'Analyzing game data',
    'Finding Insider Picks',
    'Interpreting public betting',
    'Finding the ref',
    'Loading historical trends',
    'Comparing team stats',
    'Scanning for top props'
  ]

  useEffect(() => {
    if (isOpen && gameId) {
      checkCreditsAndGenerate()
    } else {
      // Reset when closed
      setScriptData(null)
      setError(null)
      setLoadingStep(0)
      setProgress(0)
      setShowAuthPrompt(false)
      setShowUpgradePrompt(false)
    }
  }, [isOpen, gameId])

  // Progress bar animation with fade transitions
  useEffect(() => {
    if (!loading) {
      setLoadingStep(0)
      setProgress(0)
      setTextFading(false)
      return
    }

    let currentStep = 0
    let currentProgress = 0
    
    // Change text every 1.5 seconds with fade
    const stepInterval = setInterval(() => {
      if (currentStep < loadingSteps.length - 1) {
        // Fade out current text
        setTextFading(true)
        
        // Wait 300ms for fade out, then change text and fade in
        setTimeout(() => {
          currentStep++
          setLoadingStep(currentStep)
          setTextFading(false)
        }, 300)
      }
    }, 1500)

    // Smooth progress animation - fills in ~10 seconds for new scripts, ~5 seconds for cached
    // We'll fill to 95%, then the API completion will jump to 100%
    const estimatedTime = 10000 // Assume 10 seconds for new generation
    const incrementInterval = 50 // Update every 50ms
    const incrementAmount = (95 / (estimatedTime / incrementInterval)) // How much to add each tick
    
    const progressInterval = setInterval(() => {
      if (currentProgress < 95) {
        currentProgress += incrementAmount
        if (currentProgress > 95) currentProgress = 95 // Cap at 95%
        setProgress(Math.round(currentProgress))
      }
    }, incrementInterval)

    return () => {
      clearInterval(stepInterval)
      clearInterval(progressInterval)
    }
  }, [loading])

  const checkCreditsAndGenerate = async () => {
    if (!gameId) return

    // Step 1: Check if user is authenticated
    if (!isSignedIn) {
      console.log('User not authenticated')
      onClose()
      return
    }

    // Step 2: Sync user to Supabase (creates if doesn't exist)
    try {
      await fetch('/api/users/sync', { method: 'POST' })
    } catch (err) {
      console.error('Error syncing user:', err)
    }

    // Step 3: Check credit status
    try {
      const creditResponse = await fetch('/api/ai-credits/check')
      
      if (!creditResponse.ok) {
        console.error('Credit check failed:', creditResponse.status)
        // Allow generation on API error (fail open for better UX)
        await generateScript()
        return
      }
      
      const creditStatus = await creditResponse.json()
      console.log('📊 Credit status:', creditStatus)

      // If user has no access AND is not premium, show upgrade prompt
      if (!creditStatus.hasAccess && !creditStatus.isPremium) {
        console.log('❌ User has no credits and no subscription')
        setShowUpgradePrompt(true)
        return
      }

      console.log('✅ User has access - generating script')
      // User has access - generate script
      await generateScript()

      // Decrement credits (only for free users with credits)
      if (!creditStatus.isPremium && creditStatus.hasAccess) {
        console.log('📉 Decrementing free user credits')
        await fetch('/api/ai-credits/use', { method: 'POST' })
        
        // Refresh credit badge
        if ((window as any).refreshAICredits) {
          (window as any).refreshAICredits()
        }
      }

    } catch (err) {
      console.error('Error checking credits:', err)
      // Allow generation on error (fail open for better UX)
      await generateScript()
    }
  }

  const generateScript = async () => {
    if (!gameId) return

    setLoading(true)
    setError(null)
    const startTime = Date.now()

    try {
      // Step 1: Fetch aggregated data
      console.log('Fetching game data...')
      const dataResponse = await fetch(`/api/game-intelligence/data?gameId=${gameId}&league=${sport.toLowerCase()}`)
      
      if (!dataResponse.ok) {
        throw new Error('Failed to fetch game data')
      }

      const gameData = await dataResponse.json()

      // Step 2: Generate AI script
      console.log('Generating AI script...')
      const scriptResponse = await fetch('/api/game-intelligence/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameId,
          league: sport.toLowerCase(),
          data: gameData
        })
      })

      if (!scriptResponse.ok) {
        const errorData = await scriptResponse.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Server error: ${scriptResponse.status}`)
      }

      const result = await scriptResponse.json()
      
      // Calculate how long the API call took
      const elapsedTime = Date.now() - startTime
      
      // If it's a cached script (result.cached === true), ensure we hit exactly 5 seconds
      if (result.cached && elapsedTime < 5000) {
        const remainingTime = 5000 - elapsedTime
        console.log(`Cached script - adding ${remainingTime}ms delay to reach 5 seconds`)
        await new Promise(resolve => setTimeout(resolve, remainingTime))
      }
      
      // Complete the progress bar
      setProgress(100)
      setLoadingStep(loadingSteps.length - 1)
      
      // Small delay to show 100% before displaying content
      await new Promise(resolve => setTimeout(resolve, 300))
      
      setScriptData(result)

    } catch (err) {
      console.error('Error generating script:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate script'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const strengthLabel = scriptData?.dataStrength === 3 ? 'Strong' : scriptData?.dataStrength === 2 ? 'Above Avg' : 'Minimal'
  const strengthColor = scriptData?.dataStrength === 3 ? '#10b981' : scriptData?.dataStrength === 2 ? '#f59e0b' : '#ef4444'

  // Don't show a custom auth prompt - the modal should just close and let Clerk handle it
  if (showAuthPrompt) {
    return null
  }

  // Removed the custom auth prompt modal below (lines 229-289 in original file)
  // The game card click now triggers Clerk modal directly via the page.tsx logic
  
  if (false) { // Keep this dead code path for now in case we want to reference the old auth prompt
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '16px',
          maxWidth: '500px',
          width: '100%',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
               <FaWandMagicSparkles size={48} style={{ color: '#8b5cf6', margin: '0 auto 1rem' }} />
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '0.75rem' }}>
            Sign Up for Free AI Scripts
          </h2>
          <p style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Create a free account to get <strong style={{ color: '#8b5cf6' }}>FREE game scripts every week</strong>. 
            Each script combines insider picks, public splits, ref trends, historical data, team stats and more.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <SignInButton mode="modal">
              <button style={{
                padding: '0.75rem 2rem',
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Sign Up Free
              </button>
            </SignInButton>
            <button 
              onClick={onClose}
              style={{
                padding: '0.75rem 2rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show upgrade prompt (no credits) - redirect to /upgrade page
  if (showUpgradePrompt) {
    // Just redirect to the upgrade page
    window.location.href = '/upgrade'
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                 <FaWandMagicSparkles size={24} style={{ color: '#a78bfa' }} />
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>
              AI Game Script
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          flex: 1
        }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              {/* Progress Text with Fade */}
              <p style={{ 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                color: '#fff', 
                marginBottom: '1.5rem',
                transition: 'opacity 0.3s ease-in-out',
                opacity: textFading ? 0 : 1
              }}>
                {loadingSteps[loadingStep]}
              </p>

              {/* Progress Bar Container */}
              <div style={{
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '999px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {/* Progress Bar Fill */}
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)',
                  borderRadius: '999px',
                  width: `${progress}%`,
                  transition: 'width 0.3s ease-out',
                  boxShadow: '0 0 10px rgba(167, 139, 250, 0.5)'
                }} />
              </div>

              {/* Progress Percentage */}
              <p style={{ 
                marginTop: '1rem', 
                color: 'rgba(255, 255, 255, 0.4)', 
                fontSize: '0.85rem',
                fontWeight: '500'
              }}>
                {progress}%
              </p>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: '#ef4444',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontWeight: '600' }}>Failed to Generate Script</p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', opacity: 0.8 }}>{error}</p>
            </div>
          )}

          {scriptData && !loading && !error && (
            <div>
              {/* Data Strength Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: `${strengthColor}15`,
                border: `1px solid ${strengthColor}40`,
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: strengthColor,
                  boxShadow: `0 0 8px ${strengthColor}`
                }} />
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: strengthColor }}>
                  Active Data: {strengthLabel}
                </span>
              </div>

              {/* AI Generated Script */}
              <div style={{
                color: '#fff',
                fontSize: '0.95rem',
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap'
              }}>
                {formatScript(scriptData.script)}
              </div>

              {/* Footer Info */}
              <div style={{
                marginTop: '2rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.4)',
                textAlign: 'center'
              }}>
                Generated {new Date(scriptData.generatedAt).toLocaleTimeString()} • 
                AI-powered analysis • Not financial advice
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Formats the AI script with better styling for sections
 */
function formatScript(script: string): React.ReactElement {
  // Split by paragraphs (double newlines)
  const paragraphs = script.split('\n\n').filter(p => p.trim())
  
  const formatted: React.ReactElement[] = []

  paragraphs.forEach((paragraph, pIndex) => {
    // Check if this is a section header (surrounded by **)
    if (paragraph.match(/^\*\*.*\*\*$/)) {
      const cleanLine = paragraph.replace(/\*\*/g, '')
      formatted.push(
        <div key={`header-${pIndex}`} style={{
          fontWeight: '700',
          fontSize: '1.1rem',
          color: '#a78bfa',
          marginTop: pIndex > 0 ? '1.5rem' : 0,
          marginBottom: '0.75rem'
        }}>
          {cleanLine}
        </div>
      )
      return
    }

    // Process inline bold text within paragraphs
    const parts = paragraph.split(/(\*\*[^*]+\*\*)/)
    const formattedParts = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // This is bold text
        const boldText = part.replace(/\*\*/g, '')
        return (
          <strong key={`bold-${pIndex}-${i}`} style={{
            fontWeight: '700',
            color: '#10b981', // Green for bets
            textShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
          }}>
            {boldText}
          </strong>
        )
      }
      return part
    })

    formatted.push(
      <p key={`p-${pIndex}`} style={{
        marginBottom: '1.25rem',
        color: 'rgba(255, 255, 255, 0.9)',
        lineHeight: '1.7'
      }}>
        {formattedParts}
      </p>
    )
  })

  return <>{formatted}</>
}
