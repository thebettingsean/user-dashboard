'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FaArrowLeft } from 'react-icons/fa'
import styles from './sportsbooks.module.css'

const API_BASE_URL = 'https://sportsbookbonus.onrender.com/api'

interface State {
  state_code: string
  state_name: string
}

interface Sportsbook {
  id: number
  book_name: string
  logo_url: string | null
  book_bonus_info: string
  minimum_deposit: number
  insider_rating: number | null
  insider_bonus_info: string
  promo_code: string | null
  affiliate_link: string
}

export default function SportsbooksPage() {
  const router = useRouter()
  const [states, setStates] = useState<State[]>([])
  const [sportsbooks, setSportsbooks] = useState<Sportsbook[]>([])
  const [selectedState, setSelectedState] = useState<State | null>(null)
  const [selectedOffer, setSelectedOffer] = useState<Sportsbook | null>(null)
  const [isSortedByRating, setIsSortedByRating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStates()
  }, [])

  async function loadStates() {
    try {
      const response = await fetch(`${API_BASE_URL}/states`)
      if (!response.ok) throw new Error('Failed to fetch states')
      const data = await response.json()
      setStates(data)
    } catch (error) {
      console.error('Error loading states:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadSportsbooks(stateCode: string) {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/sportsbooks?state=${stateCode}`)
      if (!response.ok) throw new Error('Failed to fetch sportsbooks')
      const data = await response.json()
      setSportsbooks(data)
      setIsSortedByRating(false)
    } catch (error) {
      console.error('Error loading sportsbooks:', error)
      setSportsbooks([])
    } finally {
      setIsLoading(false)
    }
  }

  function handleStateChange(stateCode: string) {
    if (!stateCode) {
      setSelectedState(null)
      setSportsbooks([])
      return
    }

    const state = states.find(s => s.state_code === stateCode)
    setSelectedState(state || null)
    if (state) {
      loadSportsbooks(stateCode)
    }
  }

  function toggleSortByRating() {
    if (isSortedByRating) {
      // Reset to default order
      if (selectedState) {
        loadSportsbooks(selectedState.state_code)
      }
    } else {
      // Sort by rating
      const sorted = [...sportsbooks].sort((a, b) => {
        const ratingA = a.insider_rating || 0
        const ratingB = b.insider_rating || 0
        return ratingB - ratingA
      })
      setSportsbooks(sorted)
      setIsSortedByRating(true)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      {/* Back Button */}
      <button onClick={() => router.push('/')} className={styles.backButton}>
        <FaArrowLeft /> Back to Dashboard
      </button>

      <div className={styles.content}>
        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.badge}>Top Rated Sportsbooks</div>
          <h1 className={styles.heroTitle}>Join & Get Free Access</h1>

          {/* State Selector */}
          <div className={styles.selectorWrapper}>
            <select
              className={styles.stateSelector}
              onChange={(e) => handleStateChange(e.target.value)}
              value={selectedState?.state_code || ''}
              disabled={isLoading && states.length === 0}
            >
              <option value="">Select Your State</option>
              {states.map(state => (
                <option key={state.state_code} value={state.state_code}>
                  {state.state_name}
                </option>
              ))}
            </select>
          </div>

          {/* Value Flow (shown when no state selected) */}
          {!selectedState && (
            <div className={styles.valueFlowWrapper}>
              <ValueFlow compact={false} />
            </div>
          )}
        </div>

        {/* Sportsbooks Section */}
        {selectedState && (
          <div className={styles.offersSection}>
            <div className={styles.offersHeader}>
              <h2 className={styles.sectionTitle}>
                Available in {selectedState.state_name}
              </h2>
              <p className={styles.sectionSubtitle}>
                {sportsbooks.length} sportsbook{sportsbooks.length !== 1 ? 's' : ''} available
              </p>
              <button
                className={`${styles.sortButton} ${isSortedByRating ? styles.sortButtonActive : ''}`}
                onClick={toggleSortByRating}
              >
                {isSortedByRating ? 'sorted by rating ✓' : 'by rating ↑'}
              </button>
            </div>

            {isLoading ? (
              <div className={styles.loading}>Loading sportsbooks...</div>
            ) : sportsbooks.length === 0 ? (
              <div className={styles.empty}>
                No sportsbooks available in {selectedState.state_name}
              </div>
            ) : (
              <div className={styles.grid}>
                {sportsbooks.map(sportsbook => (
                  <SportsbookCard
                    key={sportsbook.id}
                    sportsbook={sportsbook}
                    onClaim={() => setSelectedOffer(sportsbook)}
                  />
                ))}
              </div>
            )}

            {/* How It Works (bottom) */}
            <div className={styles.howItWorks}>
              <h3 className={styles.howItWorksTitle}>How It Works</h3>
              <ValueFlow compact={true} />
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedOffer && (
        <SportsbookModal
          sportsbook={selectedOffer}
          onClose={() => setSelectedOffer(null)}
        />
      )}
    </div>
  )
}

function ValueFlow({ compact }: { compact: boolean }) {
  return (
    <div className={styles.valueFlow}>
      <div className={`${styles.valueCard} ${compact ? styles.valueCardCompact : ''}`}>
        <div className={styles.valueIcon} style={{ color: '#60a5fa' }}>
          <svg width="32" height="32" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
          </svg>
        </div>
        <div className={styles.valueTitle}>Join a New Book</div>
        {!compact && <div className={styles.valueSubtitle}>Select your state</div>}
      </div>

      <div className={styles.arrow}>→</div>

      <div className={`${styles.valueCard} ${compact ? styles.valueCardCompact : ''}`}>
        <div className={styles.valueIcon} style={{ color: '#34d399' }}>
          <svg width="32" height="32" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
        </div>
        <div className={styles.valueTitle}>Claim Your Bonus</div>
        {!compact && <div className={styles.valueSubtitle}>Offers vary</div>}
      </div>

      <div className={styles.arrow}>→</div>

      <div className={`${styles.valueCard} ${compact ? styles.valueCardCompact : ''}`}>
        <div className={styles.valueIcon} style={{ color: '#a78bfa' }}>
          <svg width="32" height="32" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/>
          </svg>
        </div>
        <div className={styles.valueTitle}>Take our Best Bets</div>
        {!compact && <div className={styles.valueSubtitle}>30 days free!</div>}
      </div>

      <div className={styles.arrow}>→</div>

      <div className={`${styles.valueCard} ${styles.valueCardHighlight} ${compact ? styles.valueCardCompact : ''}`}>
        <div className={styles.valueIcon} style={{ color: '#34d399' }}>
          <svg width="32" height="32" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
          </svg>
        </div>
        <div className={styles.valueTitle}>Enjoy Your Profits</div>
        {!compact && <div className={styles.valueSubtitle}>Minimal risk involved</div>}
      </div>
    </div>
  )
}

function SportsbookCard({ sportsbook, onClaim }: { sportsbook: Sportsbook; onClaim: () => void }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <div className={styles.logo}>
            {sportsbook.logo_url ? (
              <img
                src={sportsbook.logo_url}
                alt={`${sportsbook.book_name} logo`}
                className={styles.logoImage}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.style.backgroundColor = '#2563eb'
                    e.currentTarget.parentElement.innerHTML = `<span style="color: white; font-weight: bold; font-size: 0.875rem;">${sportsbook.book_name.slice(0, 2).toUpperCase()}</span>`
                  }
                }}
              />
            ) : (
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>
                {sportsbook.book_name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h3 className={styles.cardTitle}>{sportsbook.book_name}</h3>
            <div className={styles.activeBadge}>
              <span className={styles.activeDot}></span>
              Active Bonus
            </div>
          </div>
        </div>
        <div className={styles.rating}>
          {sportsbook.insider_rating !== null && sportsbook.insider_rating !== undefined
            ? `${sportsbook.insider_rating}/10`
            : 'N/A'}
        </div>
      </div>

      <div className={styles.cardSection}>
        <div className={styles.cardLabel}>Bonus Offer:</div>
        <div className={styles.cardValue}>{sportsbook.book_bonus_info}</div>
      </div>

      <div className={styles.cardSection}>
        <div className={styles.cardLabel}>Minimum Deposit:</div>
        <div className={styles.cardValue}>${(sportsbook.minimum_deposit / 100).toFixed(0)}</div>
      </div>

      <div className={styles.cardSection}>
        <div className={styles.cardLabel}>Insider Bonus:</div>
        <div className={styles.cardValue}>
          Sign up and get a <span className={styles.highlight}>free 30 days</span> of our best bets
        </div>
      </div>

      <button className={styles.claimButton} onClick={onClaim}>
        Claim Bonus + Picks
      </button>
    </div>
  )
}

function SportsbookModal({ sportsbook, onClose }: { sportsbook: Sportsbook; onClose: () => void }) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{sportsbook.book_name}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalDetails}>
          <h3 className={styles.modalDetailsTitle}>Complete Bonus Details</h3>
          <div className={styles.modalDetailRow}>
            <span className={styles.modalDetailLabel}>Sportsbook Bonus:</span>
            <div className={styles.modalDetailValue}>{sportsbook.book_bonus_info}</div>
          </div>
          <div className={styles.modalDetailRow}>
            <span className={styles.modalDetailLabel}>Min Deposit:</span>
            <div className={styles.modalDetailValue}>${(sportsbook.minimum_deposit / 100).toFixed(0)}</div>
          </div>
          <div className={styles.modalDetailRow}>
            <span className={styles.modalDetailLabel}>Insider Bonus:</span>
            <div className={styles.modalDetailValueHighlight}>{sportsbook.insider_bonus_info}</div>
          </div>
        </div>

        {sportsbook.promo_code && (
          <div className={styles.promoCode}>
            <div className={styles.promoCodeLabel}>Required Promo Code:</div>
            <div className={styles.promoCodeText}>{sportsbook.promo_code}</div>
          </div>
        )}

        <div className={styles.instructions}>
          <div className={styles.instructionsTitle}>How to claim your insider bonus:</div>
          <div className={styles.instructionsText}>
            1. Sign up using the link below<br/>
            2. Make your deposit{sportsbook.promo_code ? ' with the promo code' : ''}<br/>
            3. Email a screenshot to{' '}
            <span className={styles.email}>sportsbook@thebettinginsider.com</span>
          </div>
        </div>

        <a
          href={sportsbook.affiliate_link}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.modalClaimButton}
        >
          Claim Bonus + Picks
        </a>
      </div>
    </div>
  )
}

