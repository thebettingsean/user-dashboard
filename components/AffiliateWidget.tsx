'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

interface AffiliateData {
  id: string
  name: string
  email: string
  commissionRate: number
  link: string
  status: string
  detailsComplete: boolean
  payoutEmail: string | null
  paymentMethod: string | null
  totalCommissionEarned: number
  numberOfReferredUsers: number
  numberOfClicks: number
}

interface SalesData {
  thisMonthEarnings: number
  totalSales: number
  thisMonthSales: number
}

export default function AffiliateWidget() {
  const { user, isLoaded } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [isAffiliate, setIsAffiliate] = useState(false)
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null)
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLinksModal, setShowLinksModal] = useState(false)
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null)

  useEffect(() => {
    if (isLoaded && user) {
      checkAffiliateStatus()
    }
  }, [isLoaded, user])

  useEffect(() => {
    if (affiliateData?.id) {
      fetchSalesData()
    }
  }, [affiliateData])

  // Check for return from Pushlap setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('affiliate_setup') === 'complete') {
        // User returned from Pushlap setup
        setTimeout(() => checkAffiliateStatus(), 1000)
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])

  const checkAffiliateStatus = async () => {
    try {
      const email = user?.emailAddresses[0]?.emailAddress
      if (!email) {
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/affiliate/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()
      
      console.log('Affiliate check response:', data)
      
      if (data.isAffiliate && data.data) {
        console.log('Affiliate data:', data.data)
        console.log('Affiliate link:', data.data.link)
        setIsAffiliate(true)
        setAffiliateData(data.data)
      } else {
        setIsAffiliate(false)
        setAffiliateData(null)
      }
    } catch (error) {
      console.error('Error checking affiliate status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSalesData = async () => {
    if (!affiliateData?.id) return

    try {
      const response = await fetch('/api/affiliate/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliateId: affiliateData.id })
      })

      const result = await response.json()
      if (result.success) {
        setSalesData(result.data)
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
    }
  }

  const becomeAffiliate = async () => {
    setIsCreating(true)
    setError(null)

    try {
      const email = user?.emailAddresses[0]?.emailAddress
      const firstName = user?.firstName || 'Insider'
      const lastName = user?.lastName || 'User'

      if (!email) {
        setError('Email not found')
        setIsCreating(false)
        return
      }

      // Create affiliate via API
      const response = await fetch('/api/affiliate/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email })
      })

      const result = await response.json()

      if (result.success && result.data) {
        // Affiliate created! Now redirect to Pushlap for complete setup
        const returnUrl = encodeURIComponent(window.location.href + '?affiliate_setup=complete')
        window.location.href = `https://www.pushlapgrowth.com/affiliate/complete-setup?email=${encodeURIComponent(email)}&return=${returnUrl}`
      } else {
        setError(result.error || 'Failed to create affiliate account')
        setIsCreating(false)
      }
    } catch (error) {
      console.error('Error creating affiliate:', error)
      setError('Failed to create affiliate account')
      setIsCreating(false)
    }
  }

  const getTrackingLinks = () => {
    if (!affiliateData?.link) return []
    
    // Extract the ref slug from the link
    const refMatch = affiliateData.link.match(/ref=([^&]+)/)
    const refSlug = refMatch ? refMatch[1] : 'affiliate'
    
    return [
      {
        name: 'Dashboard',
        icon: '📊',
        url: `https://dashboard.thebettinginsider.com/?ref=${refSlug}`
      },
      {
        name: 'Fantasy Football',
        icon: '🏈',
        url: `https://dashboard.thebettinginsider.com/fantasy?ref=${refSlug}`
      },
      {
        name: 'Prop Parlay Tool',
        icon: '🎯',
        url: `https://dashboard.thebettinginsider.com/prop-parlay-tool?ref=${refSlug}`
      },
      {
        name: 'Anytime TD',
        icon: '🏆',
        url: `https://dashboard.thebettinginsider.com/anytime-td?ref=${refSlug}`
      },
      {
        name: 'Homepage',
        icon: '🏠',
        url: `https://thebettinginsider.com/?ref=${refSlug}`
      },
      {
        name: 'Pricing Page',
        icon: '💰',
        url: `https://thebettinginsider.com/pricing?ref=${refSlug}`
      },
      {
        name: 'Analyst Picks',
        icon: '📈',
        url: `https://dashboard.thebettinginsider.com/analyst-picks?ref=${refSlug}`
      }
    ]
  }

  const copySpecificLink = async (url: string, index: number) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLinkIndex(index)
      setTimeout(() => setCopiedLinkIndex(null), 2000)
    } catch (error) {
      alert('Copied: ' + url)
    }
  }

  const copyLink = async () => {
    if (!affiliateData?.link) {
      alert('Referral link not available yet. Please refresh the page.')
      return
    }

    try {
      await navigator.clipboard.writeText(affiliateData.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = affiliateData.link
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      } catch (err) {
        alert('Failed to copy link. Your link is: ' + affiliateData.link)
      }
      document.body.removeChild(textArea)
    }
  }

  if (isLoading || !isLoaded) {
    return (
      <>
        <div style={widgetStyle}>
          <div style={iconWrapper}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <h2 style={titleStyle}>Affiliate Program</h2>
          <p style={taglineStyle}>Loading...</p>
          <div style={{ flex: 1 }} />
        </div>
      </>
    )
  }

  // NON-AFFILIATE VIEW
  if (!isAffiliate) {
    return (
      <>
        <div style={widgetStyle}>
          <div style={iconWrapper}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <h2 style={titleStyle}>Affiliate Program</h2>
          <p style={taglineStyle}>Earn 50% recurring revenue</p>

          <div style={infoBoxStyle}>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', lineHeight: '1.5' }}>
              Refer customers, earn lifetime commissions!
            </p>
            <ul style={{ margin: '0', paddingLeft: '1.25rem', fontSize: '0.8rem', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.8)' }}>
              <li>50% per sale, forever</li>
              <li>$50-$150 per customer</li>
              <li>Track live earnings</li>
            </ul>
          </div>

          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.5rem', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <div style={{ flex: 1 }} />

          <button onClick={becomeAffiliate} disabled={isCreating} style={buttonStyle}>
            {isCreating ? 'Creating Account...' : 'Become an Affiliate'}
          </button>
        </div>
      </>
    )
  }

  // ACTIVE AFFILIATE VIEW
  if (!affiliateData) return null

  return (
    <>
      <div style={widgetStyle}>
        <div style={iconWrapper}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <h2 style={titleStyle}>Affiliate Dashboard</h2>
        <p style={taglineStyle}>Active • {affiliateData.commissionRate}% commission</p>

        {/* Two columns: This Month / All Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '0.75rem' }}>
          <div style={statBoxStyle}>
            <div style={statLabelStyle}>This Month</div>
            <div style={statValueStyle}>${(salesData?.thisMonthEarnings || 0).toFixed(0)}</div>
          </div>
          <div style={statBoxStyle}>
            <div style={statLabelStyle}>All Time</div>
            <div style={statValueStyle}>${(affiliateData.totalCommissionEarned || 0).toFixed(0)}</div>
          </div>
        </div>

        {/* Three columns: Referrals / Active / Clicks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '0.75rem' }}>
          <div style={miniStatStyle}>
            <div style={miniStatValueStyle}>{affiliateData.numberOfReferredUsers || 0}</div>
            <div style={miniStatLabelStyle}>Referrals</div>
          </div>
          <div style={miniStatStyle}>
            <div style={miniStatValueStyle}>{salesData?.totalSales || 0}</div>
            <div style={miniStatLabelStyle}>Active</div>
          </div>
          <div style={miniStatStyle}>
            <div style={miniStatValueStyle}>{affiliateData.numberOfClicks || 0}</div>
            <div style={miniStatLabelStyle}>Clicks</div>
          </div>
        </div>

        {/* My Links Button */}
        {affiliateData.link ? (
          <button 
            onClick={() => setShowLinksModal(true)} 
            style={copyLinkButtonStyle}
          >
            <span style={{ marginRight: '6px' }}>🔗</span>
            My Links
          </button>
        ) : (
          <div style={infoBoxStyle}>
            <p style={{ margin: '0', fontSize: '0.8rem', lineHeight: '1.5', textAlign: 'center' }}>
              📧 Your referral link is ready!<br />
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                Email support@thebettinginsider.com to get your personal tracking link.
              </span>
            </p>
          </div>
        )}

        {/* Links Modal */}
        {showLinksModal && (
          <div style={modalOverlayStyle} onClick={() => setShowLinksModal(false)}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Your Tracking Links</h3>
                <button onClick={() => setShowLinksModal(false)} style={closeButtonStyle}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                {getTrackingLinks().map((link, index) => (
                  <div key={index} style={linkItemStyle}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1.2rem' }}>{link.icon}</span>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{link.name}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', wordBreak: 'break-all' }}>
                        {link.url}
                      </div>
                    </div>
                    <button
                      onClick={() => copySpecificLink(link.url, index)}
                      style={copiedLinkIndex === index ? copiedSmallButtonStyle : smallCopyButtonStyle}
                    >
                      {copiedLinkIndex === index ? '✓' : '📋'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Two buttons side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '0.75rem' }}>
          <button 
            onClick={() => alert('More info page coming soon!')}
            style={smallButtonStyle}
          >
            More Info
          </button>
          <button 
            onClick={() => alert('Contact support@thebettinginsider.com to set up your Pushlap login and manage payouts.')}
            style={smallButtonStyle}
          >
            Need Login?
          </button>
        </div>
      </div>
    </>
  )
}

// STYLES - MATCH OTHER WIDGETS EXACTLY
const widgetStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(30px) saturate(180%)',
  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  border: '0.5px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '24px',
  padding: '1.5rem',
  position: 'relative' as const,
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column' as const,
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  color: '#fff'
}

const iconWrapper = {
  position: 'absolute' as const,
  top: '1rem',
  right: '1rem',
  width: '52px',
  height: '52px',
  border: '1.5px solid rgba(16, 185, 129, 0.4)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(16, 185, 129, 0.15)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  zIndex: 2,
  color: '#10b981'
}

const titleStyle = {
  fontSize: '1.1rem',
  fontWeight: '700',
  marginBottom: '0.25rem',
  color: '#fff',
  paddingRight: '60px'
}

const taglineStyle = {
  fontSize: '0.75rem',
  opacity: 0.6,
  marginBottom: '1rem'
}

const infoBoxStyle = {
  background: 'rgba(16, 185, 129, 0.08)',
  borderRadius: '10px',
  padding: '1rem',
  border: '1px solid rgba(16, 185, 129, 0.2)',
  marginBottom: '1rem',
  color: 'rgba(255, 255, 255, 0.9)'
}

const buttonStyle = {
  width: '100%',
  background: 'rgba(16, 185, 129, 0.25)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  borderRadius: '10px',
  padding: '0.875rem 1.5rem',
  color: '#ffffff',
  fontSize: '0.85rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
}

const statBoxStyle = {
  background: 'rgba(16, 185, 129, 0.08)',
  borderRadius: '10px',
  padding: '0.75rem 0.5rem',
  border: '1px solid rgba(16, 185, 129, 0.2)',
  textAlign: 'center' as const
}

const statLabelStyle = {
  fontSize: '0.7rem',
  color: 'rgba(255, 255, 255, 0.6)',
  marginBottom: '4px'
}

const statValueStyle = {
  fontSize: '1.2rem',
  fontWeight: '700',
  color: '#10b981'
}

const miniStatStyle = {
  textAlign: 'center' as const
}

const miniStatValueStyle = {
  fontSize: '1.1rem',
  fontWeight: '700',
  color: '#10b981',
  marginBottom: '2px'
}

const miniStatLabelStyle = {
  fontSize: '0.65rem',
  color: 'rgba(255, 255, 255, 0.6)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px'
}

const copyLinkButtonStyle = {
  width: '100%',
  background: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid rgba(16, 185, 129, 0.25)',
  borderRadius: '8px',
  padding: '0.65rem',
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '0.8rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const copiedButtonStyle = {
  width: '100%',
  background: 'rgba(16, 185, 129, 0.35)',
  border: '1.5px solid rgba(16, 185, 129, 0.6)',
  borderRadius: '8px',
  padding: '0.65rem',
  color: '#10b981',
  fontSize: '0.8rem',
  fontWeight: '700',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
}

const smallButtonStyle = {
  background: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid rgba(16, 185, 129, 0.25)',
  borderRadius: '8px',
  padding: '0.6rem 0.5rem',
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '0.75rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  textAlign: 'center' as const,
  width: '100%'
}

const modalOverlayStyle = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.8)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '1rem'
}

const modalContentStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(40px) saturate(180%)',
  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '20px',
  padding: '2rem',
  maxWidth: '600px',
  width: '100%',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  color: '#fff'
}

const closeButtonStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '50%',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#fff',
  fontSize: '1.2rem',
  transition: 'all 0.2s ease'
}

const linkItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '12px'
}

const smallCopyButtonStyle = {
  background: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  borderRadius: '8px',
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '1.1rem',
  flexShrink: 0,
  transition: 'all 0.2s ease'
}

const copiedSmallButtonStyle = {
  background: 'rgba(16, 185, 129, 0.35)',
  border: '1.5px solid rgba(16, 185, 129, 0.6)',
  borderRadius: '8px',
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '1.1rem',
  flexShrink: 0,
  color: '#10b981',
  boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
}
