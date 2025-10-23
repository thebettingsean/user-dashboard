'use client'

import { useState, useEffect } from 'react'

export default function WebhookDebug() {
  const [payload, setPayload] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchLastWebhook = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/webhooks/pushlap-debug')
      const data = await response.json()
      setPayload(data)
    } catch (error) {
      console.error('Error fetching webhook data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLastWebhook()
  }, [])

  return (
    <div style={{ 
      padding: '2rem', 
      background: '#0f172a', 
      minHeight: '100vh',
      color: '#fff',
      fontFamily: 'monospace'
    }}>
      <h1 style={{ marginBottom: '2rem' }}>Pushlap Webhook Debug</h1>
      
      <button 
        onClick={fetchLastWebhook}
        style={{
          padding: '0.75rem 1.5rem',
          background: '#10b981',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          cursor: 'pointer',
          marginBottom: '2rem',
          fontSize: '1rem',
          fontWeight: '600'
        }}
      >
        🔄 Refresh
      </button>

      {loading ? (
        <p>Loading...</p>
      ) : payload && payload.lastPayload ? (
        <div>
          <h2 style={{ color: '#10b981', marginBottom: '1rem' }}>Last Webhook Received:</h2>
          <pre style={{ 
            background: '#1e293b', 
            padding: '1.5rem',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '0.875rem',
            lineHeight: '1.6'
          }}>
            {JSON.stringify(payload.lastPayload, null, 2)}
          </pre>

          <h3 style={{ color: '#10b981', marginTop: '2rem', marginBottom: '1rem' }}>
            Link Field Value:
          </h3>
          <div style={{ 
            background: '#1e293b', 
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '1.1rem'
          }}>
            {payload.lastPayload.body?.link ? (
              <span style={{ color: '#10b981' }}>✅ {payload.lastPayload.body.link}</span>
            ) : (
              <span style={{ color: '#ef4444' }}>❌ NULL (but checking affiliateLinks array...)</span>
            )}
          </div>

          <h3 style={{ color: '#10b981', marginTop: '2rem', marginBottom: '1rem' }}>
            Affiliate Links Array:
          </h3>
          <pre style={{ 
            background: '#1e293b', 
            padding: '1.5rem',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '0.875rem',
            lineHeight: '1.6'
          }}>
            {JSON.stringify(payload.lastPayload.body?.affiliateLinks, null, 2) || 'No array found'}
          </pre>

          <h3 style={{ color: '#10b981', marginTop: '2rem', marginBottom: '1rem' }}>
            All Body Keys:
          </h3>
          <div style={{ 
            background: '#1e293b', 
            padding: '1rem',
            borderRadius: '8px'
          }}>
            {Object.keys(payload.lastPayload.body || {}).map((key: string) => (
              <div key={key} style={{ marginBottom: '0.5rem' }}>
                <strong>{key}:</strong> {JSON.stringify(payload.lastPayload.body[key])}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ color: '#ef4444' }}>No webhook received yet. Trigger a webhook in Pushlap!</p>
      )}
    </div>
  )
}

