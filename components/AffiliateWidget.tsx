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
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)

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

  const generateLink = async () => {
    if (!affiliateData?.id) return

    setIsGeneratingLink(true)
    try {
      const response = await fetch('/api/affiliate/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          affiliateId: affiliateData.id,
          email: affiliateData.email 
        })
      })

      const result = await response.json()
      
      if (result.success && result.link) {
        // Update affiliate data with new link
        setAffiliateData({ ...affiliateData, link: result.link })
      } else {
        alert('Failed to generate link. Please try again or contact support.')
      }
    } catch (error) {
      console.error('Error generating link:', error)
      alert('Failed to generate link. Please contact support.')
    } finally {
      setIsGeneratingLink(false)
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

        {/* Quick copy link with visual feedback OR generate link button */}
        {affiliateData.link ? (
          <button 
            onClick={copyLink} 
            style={copied ? copiedButtonStyle : copyLinkButtonStyle}
          >
            {copied ? (
              <>
                <span style={{ marginRight: '6px' }}>✓</span>
                Copied to Clipboard!
              </>
            ) : (
              <>
                <span style={{ marginRight: '6px' }}>📋</span>
                Copy Referral Link
              </>
            )}
          </button>
        ) : (
          <button 
            onClick={generateLink}
            disabled={isGeneratingLink}
            style={copyLinkButtonStyle}
          >
            {isGeneratingLink ? 'Generating...' : '🔗 Generate Referral Link'}
          </button>
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
