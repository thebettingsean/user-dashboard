'use client'

import PricingOptionsCard from '../../components/pricing/PricingOptionsCard'

export default function PricingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #000000 0%, #0a1628 60%, #1a2642 100%)',
        padding: '8rem 1rem 2rem',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="orb-3"></div>
      <div className="orb-4"></div>
      <div className="orb-5"></div>

      <div
        style={{
          maxWidth: '650px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1
        }}
      >
        <PricingOptionsCard />
      </div>
    </div>
  )
}

