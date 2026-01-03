'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiGift, FiStar, FiFrown, FiArrowLeft } from 'react-icons/fi'
import styles from '../shared.module.css'

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
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load offer')
      }

      const data = await response.json()
      
      if (data.skipToFinalOffer || !data.offer) {
        setStep('reasons')
      } else {
        setOffer(data)
        setStep('offer')
      }
    } catch (err: any) {
      console.error('Load offer error:', err)
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

  // Loading
  if (!isLoaded || step === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.headerSpacer} />
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <div className={styles.loadingText}>Loading...</div>
        </div>
      </div>
    )
  }

  // STEP: Initial Offer
  if (step === 'offer' && offer) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSpacer} />
        <div className={styles.innerContainer}>
          <header className={styles.header}>
            <h1 className={styles.title}>Before You Go...</h1>
            <p className={styles.subtitle}>We'd like to make you an offer</p>
          </header>

          <div className={styles.cardOffer}>
            <div className={styles.iconContainer}>
              <FiGift className={`${styles.icon} ${styles.iconGold}`} />
            </div>
            <h2 className={styles.cardTitleGold}>Special Offer Just for You</h2>
            <p className={styles.cardTextStrong}>{offer.offerMessage}</p>

            {offer.newRenewalDate && (
              <div className={styles.infoBox}>
                <strong>New Renewal Date:</strong> {offer.newRenewalDate}
              </div>
            )}

            <div className={styles.buttonGroup}>
              <button
                className={styles.btnSuccess}
                onClick={handleAcceptFirstOffer}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Accept Offer'}
              </button>
              <button
                className={styles.btnSecondary}
                onClick={handleDeclineFirstOffer}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Continue to Cancel'}
              </button>
            </div>
          </div>

          <button 
            className={styles.btnBack}
            onClick={() => router.push('/manage-subscription')}
          >
            <FiArrowLeft size={14} />
            Back to Manage Subscription
          </button>
        </div>
      </div>
    )
  }

  // STEP: Cancellation Reasons
  if (step === 'reasons') {
    return (
      <div className={styles.container}>
        <div className={styles.headerSpacer} />
        <div className={styles.innerContainer}>
          <header className={styles.header}>
            <h1 className={styles.title}>We're Sorry to See You Go</h1>
            <p className={styles.subtitle}>Help us improve by sharing why you're cancelling</p>
          </header>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Why are you cancelling?</h3>
            <p className={styles.cardText}>Select all that apply</p>
            
            <div className={styles.reasonsList}>
              {CANCELLATION_REASONS.map((reason) => (
                <label
                  key={reason.code}
                  className={
                    selectedReasons.includes(reason.code)
                      ? styles.reasonLabelSelected
                      : styles.reasonLabel
                  }
                >
                  <input
                    type="checkbox"
                    checked={selectedReasons.includes(reason.code)}
                    onChange={() => handleToggleReason(reason.code)}
                    className={styles.reasonCheckbox}
                  />
                  {reason.label}
                </label>
              ))}
            </div>

            {selectedReasons.includes('H') && (
              <textarea
                className={styles.textarea}
                placeholder="Please tell us more..."
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                rows={3}
              />
            )}

            <button
              className={styles.btnPrimary}
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
      <div className={styles.container}>
        <div className={styles.headerSpacer} />
        <div className={styles.innerContainer}>
          <header className={styles.header}>
            <h1 className={styles.title}>One Last Offer</h1>
            <p className={styles.subtitle}>We really want you to stay</p>
          </header>

          <div className={styles.cardFinalOffer}>
            <div className={styles.iconContainer}>
              <FiStar className={`${styles.icon} ${styles.iconPurple}`} />
            </div>
            <h2 className={styles.cardTitlePurple}>50% OFF FOR LIFE</h2>
            <p className={styles.cardTextStrong}>
              This is our final offer. Get lifetime access to all premium features at <strong>HALF THE PRICE</strong>.
              This discount will stay with you forever.
            </p>

            <div className={styles.buttonGroup}>
              <button
                className={styles.btnSuccess}
                onClick={handleAcceptFinalOffer}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Accept 50% Off'}
              </button>
              <button
                className={styles.btnDanger}
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
      <div className={styles.container}>
        <div className={styles.headerSpacer} />
        <div className={styles.innerContainer}>
          <div className={styles.cardError}>
            <div className={styles.iconContainer}>
              <FiFrown className={`${styles.icon} ${styles.iconRed}`} />
            </div>
            <h1 className={styles.cardTitleRed}>Subscription Cancelled</h1>
            <p className={styles.cardTextStrong}>
              Your subscription has been cancelled and will end on <strong>{cancelsOn}</strong>.
            </p>
            <p className={styles.cardText}>
              You'll continue to have access to all premium features until then.
              We'd love to have you back anytime!
            </p>

            <button
              className={styles.btnPrimary}
              onClick={() => router.push('/')}
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
