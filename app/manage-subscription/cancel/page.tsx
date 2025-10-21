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
      setOffer(data)
      setStep('offer')
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
      alert(`✅ ${data.message}`)
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
      // "Other" - can only be selected alone
      if (selectedReasons.includes('H')) {
        setSelectedReasons([])
        setOtherText('')
      } else {
        setSelectedReasons(['H'])
      }
    } else {
      // Remove "Other" if selecting anything else
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
        throw new Error('Failed to submit reasons')
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
      alert(`✅ ${data.message}`)
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
            <p>Loading...</p>
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
            <div style={styles.offerIcon}>🎁</div>
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
                {processing ? 'Processing...' : '✅ Accept Offer'}
              </button>
              <button
                style={processing ? styles.declineButtonDisabled : styles.declineButton}
                onClick={handleDeclineFirstOffer}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'No Thanks, Continue to Cancel'}
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
                rows={4}
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
            <div style={styles.finalOfferIcon}>💎</div>
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
                {processing ? 'Processing...' : '🎉 Accept 50% Off'}
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
            <div style={styles.confirmedIcon}>😢</div>
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
    padding: '10rem 2rem 4rem',
    background: 'transparent',
    color: '#ffffff'
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '1.5rem'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '3rem'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  offerCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '2px solid rgba(251, 191, 36, 0.4)',
    borderRadius: '16px',
    padding: '3rem 2rem',
    marginBottom: '2rem',
    textAlign: 'center' as const
  },
  offerIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  offerTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    marginBottom: '1rem',
    color: '#fbbf24'
  },
  offerMessage: {
    fontSize: '1.1rem',
    lineHeight: '1.6',
    marginBottom: '1.5rem',
    color: 'rgba(255, 255, 255, 0.9)'
  },
  renewalInfo: {
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '2rem',
    fontSize: '1rem'
  },
  offerButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem'
  },
  acceptButton: {
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    color: '#fff',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
  },
  acceptButtonDisabled: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.5)',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'not-allowed'
  },
  declineButton: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '1rem 2rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  declineButtonDisabled: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '1rem 2rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'not-allowed'
  },
  reasonsCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '2rem'
  },
  reasonsTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
    textAlign: 'center' as const
  },
  reasonsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  reasonLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '1rem'
  },
  reasonLabelSelected: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    background: 'rgba(59, 130, 246, 0.2)',
    border: '2px solid rgba(59, 130, 246, 0.5)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '1rem',
    fontWeight: '600'
  },
  reasonCheckbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer'
  },
  otherTextarea: {
    width: '100%',
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    marginBottom: '1.5rem'
  },
  submitButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    color: '#fff',
    border: 'none',
    padding: '1rem',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  submitButtonDisabled: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.5)',
    border: 'none',
    padding: '1rem',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'not-allowed'
  },
  finalOfferCard: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(167, 139, 250, 0.15))',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '2px solid rgba(139, 92, 246, 0.5)',
    borderRadius: '16px',
    padding: '3rem 2rem',
    marginBottom: '2rem',
    textAlign: 'center' as const
  },
  finalOfferIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  finalOfferTitle: {
    fontSize: '2rem',
    fontWeight: '800',
    marginBottom: '1rem',
    color: '#a78bfa',
    letterSpacing: '1px'
  },
  finalOfferMessage: {
    fontSize: '1.1rem',
    lineHeight: '1.6',
    marginBottom: '2rem',
    color: 'rgba(255, 255, 255, 0.9)'
  },
  finalOfferButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem'
  },
  confirmedCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '3rem 2rem',
    textAlign: 'center' as const
  },
  confirmedIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  confirmedTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '1rem'
  },
  confirmedMessage: {
    fontSize: '1.1rem',
    lineHeight: '1.6',
    marginBottom: '1rem',
    color: 'rgba(255, 255, 255, 0.9)'
  },
  confirmedSubMessage: {
    fontSize: '1rem',
    lineHeight: '1.6',
    marginBottom: '1rem',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  backToDashboardButton: {
    background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    color: '#fff',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '2rem'
  },
  backButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#fff',
    padding: '1rem 2rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'block',
    margin: '0 auto',
    width: 'fit-content'
  }
}

