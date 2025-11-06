'use client'

import { X, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface BlueprintModalProps {
  isOpen: boolean
  onClose: () => void
  blueprint: {
    id: string
    sport: string
    periodIdentifier: string
    gameCount: number
    content: string
    updatedAt: string
    version?: number
  } | null
}

export default function BlueprintModal({ isOpen, onClose, blueprint }: BlueprintModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !blueprint) return null

  const handleCopy = () => {
    // Copy plain text content (strip HTML if needed)
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = blueprint.content
    const plainText = tempDiv.textContent || tempDiv.innerText || ''
    
    navigator.clipboard.writeText(plainText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York'
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '85vh',
          background: 'rgba(20, 20, 30, 0.98)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 80px rgba(139, 92, 246, 0.1)',
          zIndex: 9999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '0.5rem'
            }}>
              {blueprint.sport.toUpperCase()} {blueprint.periodIdentifier}
            </h2>
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.5)',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <span>{blueprint.gameCount} games</span>
              <span>•</span>
              <span>Updated {formatDate(blueprint.updatedAt)}</span>
              {blueprint.version && blueprint.version > 1 && (
                <>
                  <span>•</span>
                  <span>v{blueprint.version}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            }}
          >
            <X size={20} color="#fff" />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          color: '#fff'
        }}>
          <div
            style={{
              fontSize: '0.95rem',
              lineHeight: '1.8',
              color: 'rgba(255, 255, 255, 0.9)'
            }}
            dangerouslySetInnerHTML={{ __html: blueprint.content }}
          />
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleCopy}
            style={{
              padding: '0.75rem 1.5rem',
              background: copied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
              border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.3)' : 'rgba(139, 92, 246, 0.4)'}`,
              borderRadius: '8px',
              color: copied ? '#10b981' : '#a78bfa',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              if (!copied) {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)'
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'
              }
            }}
          >
            {copied ? (
              <>
                <Check size={16} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy Blueprint</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  )
}

