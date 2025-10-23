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
      <>
        <div style={widgetStyle}>
          <div style={iconWrapper}>
            <img 
              src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f51e56d751135b7de32426_9.svg" 
              style={{ width: '36px', height: '36px' }} 
              alt="Affiliate" 
            />
          </div>
          
          <h2 style={titleStyle}>
            Affiliate Program
          </h2>
          
          <p style={taglineStyle}>
            Loading...
          </p>

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
            <img 
              src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f51e56d751135b7de32426_9.svg" 
              style={{ width: '36px', height: '36px' }} 
              alt="Affiliate" 
            />
          </div>
          
          <h2 style={titleStyle}>
            Affiliate Program
          </h2>
          
          <p style={taglineStyle}>
            Earn 50% recurring revenue
          </p>

          <div style={{ marginTop: '1rem' }}>
            <p style={{ ...contentTextStyle, marginBottom: '1rem' }}>
              Refer customers and earn lifetime commissions on every payment!
            </p>
            
            <div style={{ marginBottom: '1rem' }}>
              <div style={bulletPointStyle}>
                <span style={checkmarkStyle}>✓</span>
                <span style={bulletTextStyle}>50% per sale, forever</span>
              </div>
              <div style={bulletPointStyle}>
                <span style={checkmarkStyle}>✓</span>
                <span style={bulletTextStyle}>$50-$150 per customer</span>
              </div>
              <div style={bulletPointStyle}>
                <span style={checkmarkStyle}>✓</span>
                <span style={bulletTextStyle}>Track everything live</span>
              </div>
            </div>

            {error && (
              <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '12px' }}>
                {error}
              </p>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <button
            onClick={createAffiliate}
            disabled={isCreating}
            style={buttonStyle}
          >
            {isCreating ? 'Creating...' : 'Become an Affiliate'}
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
          <img 
            src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f51e56d751135b7de32426_9.svg" 
            style={{ width: '36px', height: '36px' }} 
            alt="Affiliate" 
          />
        </div>
        
        <h2 style={titleStyle}>
          Affiliate Dashboard
        </h2>
        
        <p style={taglineStyle}>
          Active • {affiliateData.commissionRate}% commission
        </p>

        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
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
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Your Link
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
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

          <div style={{ display: 'flex', gap: '16px', marginTop: '1rem' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>{affiliateData.numberOfReferredUsers || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Referrals</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>{salesData?.totalSales || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Active</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>{affiliateData.numberOfClicks || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Clicks</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <a
          href="https://www.pushlapgrowth.com"
          target="_blank"
          rel="noopener noreferrer"
          style={buttonStyle}
        >
          View Full Dashboard →
        </a>
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
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  borderRadius: '20px',
  padding: '1.5rem',
  color: '#ffffff',
  height: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  position: 'relative' as const
}

const iconWrapper = {
  position: 'absolute' as const,
  top: '1.5rem',
  right: '1.5rem',
  width: '48px',
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.4))'
}

const titleStyle = {
  fontSize: '1.25rem',
  fontWeight: '700',
  margin: '0',
  marginBottom: '0.5rem',
  color: '#ffffff',
  paddingRight: '60px'
}

const taglineStyle = {
  fontSize: '0.9rem',
  color: 'rgba(255, 255, 255, 0.7)',
  margin: '0',
  lineHeight: '1.4'
}

const contentTextStyle = {
  fontSize: '0.9rem',
  color: 'rgba(255, 255, 255, 0.8)',
  lineHeight: '1.5',
  margin: '0'
}

const bulletPointStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px'
}

const checkmarkStyle = {
  color: '#10b981',
  fontSize: '16px',
  fontWeight: 'bold'
}

const bulletTextStyle = {
  fontSize: '0.875rem',
  color: 'rgba(255, 255, 255, 0.8)'
}

const buttonStyle = {
  width: '100%',
  padding: '0.875rem 1.5rem',
  background: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  borderRadius: '12px',
  color: '#10b981',
  fontSize: '0.95rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  textAlign: 'center' as const,
  textDecoration: 'none',
  display: 'block'
}

const statBoxStyle = {
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: '10px',
  padding: '12px',
  textAlign: 'center' as const
}

const statLabelStyle = {
  fontSize: '0.7rem',
  color: 'rgba(255, 255, 255, 0.5)',
  marginBottom: '4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px'
}

const statValueStyle = {
  fontSize: '1.4rem',
  fontWeight: '700',
  color: '#10b981'
}

const linkBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: '10px',
  padding: '12px',
  marginTop: '12px'
}

const copyButtonStyle = {
  padding: '8px 16px',
  background: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  borderRadius: '8px',
  color: '#10b981',
  fontSize: '0.8rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  flexShrink: 0,
  whiteSpace: 'nowrap' as const
}
