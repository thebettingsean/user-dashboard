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
  totalCommissionEarned: number
  numberOfReferredUsers: number
  numberOfClicks: number
}

interface SalesData {
  thisMonthEarnings: number
  totalSales: number
  thisMonthSales: number
}

// Declare global AffiliateWidget from Pushlap
declare global {
  interface Window {
    AffiliateWidget?: {
      show: () => void
    }
  }
}

export default function AffiliateWidget() {
  const { user, isLoaded } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [isAffiliate, setIsAffiliate] = useState(false)
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null)
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [copied, setCopied] = useState(false)

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

  // Poll for affiliate status after widget might be used
  useEffect(() => {
    if (!isAffiliate && isLoaded && user) {
      const interval = setInterval(() => {
        checkAffiliateStatus()
      }, 5000) // Check every 5 seconds

      return () => clearInterval(interval)
    }
  }, [isAffiliate, isLoaded, user])

  const checkAffiliateStatus = async () => {
    try {
      const email = user?.emailAddresses[0]?.emailAddress
      if (!email) return

      const response = await fetch('/api/affiliate/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()
      
      if (data.isAffiliate && data.data) {
        setIsAffiliate(true)
        setAffiliateData(data.data)
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

  const openPushlapWidget = () => {
    if (window.AffiliateWidget) {
      window.AffiliateWidget.show()
      // After showing widget, poll more frequently for updates
      setTimeout(() => checkAffiliateStatus(), 2000)
    } else {
      alert('Affiliate widget is loading, please try again in a moment.')
    }
  }

  const copyLink = () => {
    if (affiliateData?.link) {
      navigator.clipboard.writeText(affiliateData.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
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

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
            <button onClick={openPushlapWidget} style={buttonStyle}>
              Become an Affiliate
            </button>
          </div>
        </div>
      </>
    )
  }

  // ACTIVE AFFILIATE VIEW
  if (!affiliateData) return null

  // Check if profile is complete (has name and link)
  const needsSetup = !affiliateData.name || affiliateData.name === 'null null' || !affiliateData.link

  if (needsSetup) {
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
          <p style={taglineStyle}>Account created • Setup required</p>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '120px' }}>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem', textAlign: 'center' }}>
              Complete your setup to start earning!
            </p>
            <button onClick={openPushlapWidget} style={buttonStyle}>
              Complete Setup →
            </button>
          </div>
        </div>
      </>
    )
  }

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '0.75rem' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '0.75rem' }}>
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

        {/* Quick copy link with visual feedback */}
        <button 
          onClick={copyLink} 
          style={copied ? copiedButtonStyle : copyLinkButtonStyle}
        >
          {copied ? (
            <>
              <span style={{ marginRight: '6px' }}>✓</span>
              Copied!
            </>
          ) : (
            <>
              <span style={{ marginRight: '6px' }}>📋</span>
              Copy Referral Link
            </>
          )}
        </button>

        {/* Two buttons side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '0.75rem' }}>
          <button onClick={openPushlapWidget} style={smallButtonStyle}>
            More Info
          </button>
          <a href="https://www.pushlapgrowth.com" target="_blank" rel="noopener noreferrer" style={smallButtonStyle}>
            Dashboard
          </a>
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
  color: '#fff'
}

const taglineStyle = {
  fontSize: '0.75rem',
  opacity: 0.6,
  marginBottom: '1rem'
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
  ...copyLinkButtonStyle,
  background: 'rgba(16, 185, 129, 0.3)',
  border: '1px solid rgba(16, 185, 129, 0.5)',
  color: '#10b981',
  animation: 'pulse 0.5s ease'
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
  textDecoration: 'none',
  display: 'block'
}
