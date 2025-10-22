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

export default function AffiliateWidget() {
  const { user, isLoaded } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [isAffiliate, setIsAffiliate] = useState(false)
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null)
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const createAffiliate = async () => {
    setIsCreating(true)
    setError(null)

    try {
      const email = user?.emailAddresses[0]?.emailAddress
      const firstName = user?.firstName || 'Insider'
      const lastName = user?.lastName || 'User'

      if (!email) {
        setError('Email not found')
        return
      }

      const response = await fetch('/api/affiliate/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email })
      })

      const result = await response.json()

      if (result.success && result.data) {
        setIsAffiliate(true)
        setAffiliateData(result.data)
      } else {
        setError(result.error || 'Failed to create affiliate account')
      }
    } catch (error) {
      console.error('Error creating affiliate:', error)
      setError('Failed to create affiliate account')
    } finally {
      setIsCreating(false)
    }
  }

  const copyLink = () => {
    if (affiliateData?.link) {
      navigator.clipboard.writeText(affiliateData.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading || !isLoaded) {
    return (
      <div style={widgetStyle}>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center' }}>Loading...</p>
      </div>
    )
  }

  // NON-AFFILIATE VIEW
  if (!isAffiliate) {
    return (
      <div style={widgetStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={iconWrapperStyle}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h3 style={titleStyle}>Affiliate Program</h3>
            <span style={subtitleStyle}>Earn 50% recurring revenue</span>
          </div>
        </div>

        <div style={{ margin: '20px 0' }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '16px', lineHeight: '1.5' }}>
            Refer customers and earn lifetime commissions on every payment!
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>50% per sale, forever</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>$50-$150 per customer</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>Track everything live</span>
            </div>
          </div>

          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '12px' }}>
              {error}
            </p>
          )}

          <button
            onClick={createAffiliate}
            disabled={isCreating}
            style={buttonStyle}
          >
            {isCreating ? 'Creating Account...' : 'Become an Affiliate →'}
          </button>
        </div>
      </div>
    )
  }

  // ACTIVE AFFILIATE VIEW
  if (!affiliateData) return null

  return (
    <div style={widgetStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={iconWrapperStyle}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h3 style={titleStyle}>Your Affiliate Earnings</h3>
          <span style={subtitleStyle}>Active • {affiliateData.commissionRate}% commission</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={statBoxStyle}>
          <div style={statLabelStyle}>This Month</div>
          <div style={statValueStyle}>${(salesData?.thisMonthEarnings || 0).toFixed(2)}</div>
        </div>
        <div style={statBoxStyle}>
          <div style={statLabelStyle}>All Time</div>
          <div style={statValueStyle}>${(affiliateData.totalCommissionEarned || 0).toFixed(2)}</div>
        </div>
      </div>

      {affiliateData.link && (
        <div style={linkBoxStyle}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
              YOUR LINK
            </div>
            <div style={{ 
              fontSize: '0.875rem', 
              color: 'rgba(255, 255, 255, 0.9)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {affiliateData.link}
            </div>
          </div>
          <button
            onClick={copyLink}
            style={copyButtonStyle}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={miniStatStyle}>
            <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>{affiliateData.numberOfReferredUsers || 0}</span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Referrals</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={miniStatStyle}>
            <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>{salesData?.totalSales || 0}</span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Active</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={miniStatStyle}>
            <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>{affiliateData.numberOfClicks || 0}</span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Clicks</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// STYLES
const widgetStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(30px) saturate(180%)',
  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  border: '0.5px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  borderRadius: '20px',
  padding: '1.5rem',
  color: '#ffffff',
  height: '100%',
  display: 'flex',
  flexDirection: 'column' as const
}

const iconWrapperStyle = {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#10b981',
  flexShrink: 0
}

const titleStyle = {
  fontSize: '1.125rem',
  fontWeight: '700',
  margin: '0',
  color: '#ffffff'
}

const subtitleStyle = {
  fontSize: '0.875rem',
  color: 'rgba(255, 255, 255, 0.6)'
}

const buttonStyle = {
  width: '100%',
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  border: 'none',
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
}

const statBoxStyle = {
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: '12px',
  padding: '12px',
  textAlign: 'center' as const
}

const statLabelStyle = {
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.6)',
  marginBottom: '4px'
}

const statValueStyle = {
  fontSize: '1.5rem',
  fontWeight: '700',
  color: '#10b981'
}

const linkBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: '12px',
  padding: '12px'
}

const copyButtonStyle = {
  padding: '8px 16px',
  background: 'rgba(16, 185, 129, 0.2)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  borderRadius: '8px',
  color: '#10b981',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  flexShrink: 0
}

const miniStatStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  textAlign: 'center' as const
}

