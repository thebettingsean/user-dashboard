'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type CancelStep = 'loading' | 'offer' | 'reasons' | 'final_offer' | 'confirmed'

interface OfferData {
  offerType: string
  offerDays: number
  offerMessage: string
  newRenewalDate: string
  tenureDays: number
  isTrial: boolean
}

const CANCELLATION_REASONS = [
  { code: 'A', label: 'Too expensive' },
  { code: 'B', label: 'Data not useful' },
  { code: 'C', label: 'Data not accurate' },
  { code: 'D', label: 'Poor analyst picks' },
  { code: 'E', label: 'Moving to a competitor' },
  { code: 'F', label: 'Not used enough' },
  { code: 'G', label: 'Too much info' },
  { code: 'H', label: 'Other' },
]

export default function CancelPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [step, setStep] = useState<CancelStep>('loading')
  const [offer, setOffer] = useState<OfferData | null>(null)
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [otherText, setOtherText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [cancelsOn, setCancelsOn] = useState('')

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('https://www.thebettinginsider.com')
    }
  }, [isLoaded, user, router])

  useEffect(() => {
    if (user?.id) {
      loadOffer()
    }
  }, [user])

  const loadOffer = async () => {
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          action: 'getOffer'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to load offer')
      }

      const data = await response.json()
      
      // Skip first offer if API tells us to
      if (data.skipFirstOffer) {
        setStep('reasons')
      } else {
        setOffer(data)
        setStep('offer')
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
      router.push('/manage-subscription')
    }
  }

  const handleAcceptFirstOffer = async () => {
    if (!offer) return

    setProcessing(true)
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          action: 'acceptFirstOffer',
          offerType: offer.offerType,
          offerDays: offer.offerDays
        })
      })

      if (!response.ok) {
        throw new Error('Failed to accept offer')
      }

      const data = await response.json()
      alert(`✓ ${data.message}`)
      router.push('/manage-subscription')
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleDeclineFirstOffer = async () => {
    setProcessing(true)
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          action: 'declineFirstOffer'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to proceed')
      }

      setStep('reasons')
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleToggleReason = (code: string) => {
    if (code === 'H') {
      if (selectedReasons.includes('H')) {
        setSelectedReasons([])
        setOtherText('')
      } else {
        setSelectedReasons(['H'])
      }
    } else {
      const filteredReasons = selectedReasons.filter(r => r !== 'H')
      
      if (filteredReasons.includes(code)) {
        setSelectedReasons(filteredReasons.filter(r => r !== code))
      } else {
        setSelectedReasons([...filteredReasons, code])
      }
      setOtherText('')
    }
  }

  const handleSubmitReasons = async () => {
    if (selectedReasons.length === 0) {
      alert('Please select at least one reason')
      return
    }

    if (selectedReasons.includes('H') && !otherText.trim()) {
      alert('Please describe your reason in the text box')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          action: 'submitReasons',
          reasons: selectedReasons,
          otherText: otherText.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit reasons')
      }

      setStep('final_offer')
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleAcceptFinalOffer = async () => {
    setProcessing(true)
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          action: 'acceptFinalOffer'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to accept final offer')
      }

      const data = await response.json()
      alert(`✓ ${data.message}`)
      router.push('/manage-subscription')
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleConfirmCancel = async () => {
    if (!confirm('Are you absolutely sure you want to cancel? This cannot be undone.')) {
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          action: 'confirmCancel'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      const data = await response.json()
      setCancelsOn(data.cancelsOn)
      setStep('confirmed')
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  if (!isLoaded || step === 'loading') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p style={{fontSize: '0.85rem'}}>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // STEP: Initial Offer
  if (step === 'offer' && offer) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <header style={styles.header}>
            <h1 style={styles.title}>Before You Go...</h1>
            <p style={styles.subtitle}>We'd like to make you an offer</p>
          </header>

          <div style={styles.offerCard}>
            <div style={styles.offerIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="12" rx="2" ry="2"/>
                <path d="M7 8V6a4 4 0 0 1 8 0v2"/>
                <line x1="12" y1="13" x2="12" y2="16"/>
              </svg>
            </div>
            <h2 style={styles.offerTitle}>Special Offer Just for You</h2>
            <p style={styles.offerMessage}>{offer.offerMessage}</p>

            {offer.newRenewalDate && (
              <div style={styles.renewalInfo}>
                <strong>New Renewal Date:</strong> {offer.newRenewalDate}
              </div>
            )}

            <div style={styles.offerButtons}>
              <button
                style={processing ? styles.acceptButtonDisabled : styles.acceptButton}
                onClick={handleAcceptFirstOffer}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Accept Offer'}
              </button>
              <button
                style={processing ? styles.declineButtonDisabled : styles.declineButton}
                onClick={handleDeclineFirstOffer}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Continue to Cancel'}
              </button>
            </div>
          </div>

          <button 
            style={styles.backButton}
            onClick={() => router.push('/manage-subscription')}
          >
            ← Back to Manage Subscription
          </button>
        </div>
      </div>
    )
  }

  // STEP: Cancellation Reasons
  if (step === 'reasons') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <header style={styles.header}>
            <h1 style={styles.title}>We're Sorry to See You Go</h1>
            <p style={styles.subtitle}>Help us improve by sharing why you're cancelling</p>
          </header>

          <div style={styles.reasonsCard}>
            <h3 style={styles.reasonsTitle}>Why are you cancelling? (Select all that apply)</h3>
            
            <div style={styles.reasonsList}>
              {CANCELLATION_REASONS.map((reason) => (
                <label
                  key={reason.code}
                  style={
                    selectedReasons.includes(reason.code)
                      ? styles.reasonLabelSelected
                      : styles.reasonLabel
                  }
                >
                  <input
                    type="checkbox"
                    checked={selectedReasons.includes(reason.code)}
                    onChange={() => handleToggleReason(reason.code)}
                    style={styles.reasonCheckbox}
                  />
                  {reason.label}
                </label>
              ))}
            </div>

            {selectedReasons.includes('H') && (
              <textarea
                style={styles.otherTextarea}
                placeholder="Please tell us more..."
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                rows={3}
              />
            )}

            <button
              style={processing ? styles.submitButtonDisabled : styles.submitButton}
              onClick={handleSubmitReasons}
              disabled={processing || selectedReasons.length === 0}
            >
              {processing ? 'Submitting...' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // STEP: Final Offer (50% off)
  if (step === 'final_offer') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <header style={styles.header}>
            <h1 style={styles.title}>One Last Offer</h1>
            <p style={styles.subtitle}>We really want you to stay</p>
          </header>

          <div style={styles.finalOfferCard}>
            <div style={styles.finalOfferIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <h2 style={styles.finalOfferTitle}>50% OFF FOR LIFE</h2>
            <p style={styles.finalOfferMessage}>
              This is our final offer. Get lifetime access to all premium features at <strong>HALF THE PRICE</strong>.
              This discount will stay with you forever.
            </p>

            <div style={styles.finalOfferButtons}>
              <button
                style={processing ? styles.acceptButtonDisabled : styles.acceptButton}
                onClick={handleAcceptFinalOffer}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Accept 50% Off'}
              </button>
              <button
                style={processing ? styles.declineButtonDisabled : styles.declineButton}
                onClick={handleConfirmCancel}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'No Thanks, Cancel My Subscription'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // STEP: Confirmed Cancellation
  if (step === 'confirmed') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.confirmedCard}>
            <div style={styles.confirmedIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </div>
            <h1 style={styles.confirmedTitle}>Subscription Cancelled</h1>
            <p style={styles.confirmedMessage}>
              Your subscription has been cancelled and will end on <strong>{cancelsOn}</strong>.
            </p>
            <p style={styles.confirmedSubMessage}>
              You'll continue to have access to all premium features until then.
            </p>
            <p style={styles.confirmedSubMessage}>
              We'd love to have you back anytime! You can reactivate your subscription at any time.
            </p>

            <button
              style={styles.backToDashboardButton}
              onClick={() => router.push('https://dashboard.thebettinginsider.com')}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '10rem 1.5rem 3rem',
    background: 'transparent',
    color: '#ffffff'
  },
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    width: '100%'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '1rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '2rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  offerCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '2px solid rgba(251, 191, 36, 0.4)',
    borderRadius: '16px',
    padding: '2rem 1.5rem',
    marginBottom: '1.5rem',
    textAlign: 'center' as const
  },
  offerIcon: {
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'center'
  },
  offerTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '0.75rem',
    color: '#fbbf24'
  },
  offerMessage: {
    fontSize: '0.95rem',
    lineHeight: '1.5',
    marginBottom: '1.25rem',
    color: 'rgba(255, 255, 255, 0.9)'
  },
  renewalInfo: {
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    padding: '0.75rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.85rem'
  },
  offerButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem'
  },
  acceptButton: {
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    color: '#fff',
    border: 'none',
    padding: '0.85rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
  },
  acceptButtonDisabled: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.5)',
    border: 'none',
    padding: '0.85rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'not-allowed'
  },
  declineButton: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '0.85rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  declineButtonDisabled: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '0.85rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'not-allowed'
  },
  reasonsCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem'
  },
  reasonsTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    marginBottom: '1.25rem',
    textAlign: 'center' as const
  },
  reasonsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    marginBottom: '1.25rem'
  },
  reasonLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '0.85rem'
  },
  reasonLabelSelected: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem',
    background: 'rgba(59, 130, 246, 0.2)',
    border: '2px solid rgba(59, 130, 246, 0.5)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '0.85rem',
    fontWeight: '600'
  },
  reasonCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  otherTextarea: {
    width: '100%',
    padding: '0.85rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    marginBottom: '1.25rem',
    boxSizing: 'border-box' as const
  },
  submitButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    color: '#fff',
    border: 'none',
    padding: '0.85rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  submitButtonDisabled: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.5)',
    border: 'none',
    padding: '0.85rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'not-allowed'
  },
  finalOfferCard: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(167, 139, 250, 0.15))',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '2px solid rgba(139, 92, 246, 0.5)',
    borderRadius: '16px',
    padding: '2rem 1.5rem',
    marginBottom: '1.5rem',
    textAlign: 'center' as const
  },
  finalOfferIcon: {
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'center'
  },
  finalOfferTitle: {
    fontSize: '1.5rem',
    fontWeight: '800',
    marginBottom: '0.75rem',
    color: '#a78bfa',
    letterSpacing: '0.5px'
  },
  finalOfferMessage: {
    fontSize: '0.95rem',
    lineHeight: '1.5',
    marginBottom: '1.5rem',
    color: 'rgba(255, 255, 255, 0.9)'
  },
  finalOfferButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem'
  },
  confirmedCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '2rem 1.5rem',
    textAlign: 'center' as const
  },
  confirmedIcon: {
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'center'
  },
  confirmedTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '0.75rem'
  },
  confirmedMessage: {
    fontSize: '0.95rem',
    lineHeight: '1.5',
    marginBottom: '0.75rem',
    color: 'rgba(255, 255, 255, 0.9)'
  },
  confirmedSubMessage: {
    fontSize: '0.85rem',
    lineHeight: '1.5',
    marginBottom: '0.75rem',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  backToDashboardButton: {
    background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    color: '#fff',
    border: 'none',
    padding: '0.85rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '1.5rem'
  },
  backButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#fff',
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'block',
    margin: '0 auto',
    width: 'fit-content'
  }
}
