'use client'

import { useState } from 'react'

export default function BackfillTrigger() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const triggerBackfill = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/backfill/nhl-mlb-teams', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Unknown error')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '50px auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ marginBottom: '20px' }}>NHL & MLB Teams Backfill</h1>
      
      <p style={{ marginBottom: '20px', color: '#666' }}>
        This will fetch NHL and MLB team data from ESPN and insert it into ClickHouse.
      </p>

      <button
        onClick={triggerBackfill}
        disabled={loading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          background: loading ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Running Backfill...' : 'Run Backfill'}
      </button>

      {loading && (
        <div style={{ 
          padding: '15px', 
          background: '#f0f9ff', 
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: 0, color: '#0284c7' }}>
            ⏳ Fetching teams from ESPN and inserting into ClickHouse...
          </p>
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '15px', 
          background: '#fef2f2', 
          border: '1px solid #ef4444',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#dc2626' }}>❌ Error</h3>
          <pre style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>{error}</pre>
        </div>
      )}

      {result && (
        <div style={{ 
          padding: '15px', 
          background: '#f0fdf4', 
          border: '1px solid #22c55e',
          borderRadius: '8px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#16a34a' }}>✅ Success!</h3>
          <div style={{ color: '#166534', fontSize: '14px' }}>
            <p><strong>NHL Teams:</strong> {result.teams_added?.nhl || 0}</p>
            <p><strong>MLB Teams:</strong> {result.teams_added?.mlb || 0}</p>
            <p><strong>Total:</strong> {result.total || 0}</p>
          </div>
          <details style={{ marginTop: '15px' }}>
            <summary style={{ cursor: 'pointer', color: '#059669' }}>
              View Full Response
            </summary>
            <pre style={{ 
              marginTop: '10px', 
              padding: '10px',
              background: 'white',
              border: '1px solid #d1fae5',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}

