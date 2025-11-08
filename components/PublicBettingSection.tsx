'use client'

import { useState, useEffect } from 'react'
import { FaDollarSign } from "react-icons/fa6"
import { PiMoneyWavy } from "react-icons/pi"
import { IoTicketOutline } from "react-icons/io5"
import { GiPerspectiveDiceSixFacesFour } from "react-icons/gi"
import { PiKnifeFill } from "react-icons/pi"
import { TiMinusOutline } from 'react-icons/ti'
import { GoPlusCircle } from 'react-icons/go'
import { getSportPriority, getSportWidgetLinks } from '@/lib/utils/sportSelector'

interface PublicBet {
  team: string
  betType: string
  betsPct: number
  dollarsPct: number
  gameTime: string
  odds: string
  sport: string
}

interface SharpBet {
  team: string
  betType: string
  sharpPct: number
  gameTime: string
  odds: string
  sport: string
}

interface VegasBet {
  team: string
  betType: string
  vegasPct: number
  gameTime: string
  odds: string
  sport: string
}

type Sport = 'nfl' | 'nba' | 'nhl' | 'cfb'
type DataType = 'most-public' | 'sharp-money' | 'vegas-backed'

export default function PublicBettingSection() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedSport, setSelectedSport] = useState<Sport>('nfl')
  const [selectedType, setSelectedType] = useState<DataType>('most-public')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // Set default sport based on priority on mount
  useEffect(() => {
    const priority = getSportPriority()
    // Filter out MLB since we removed it from our sport list
    const validSport = (priority.primary === 'mlb' ? 'nfl' : priority.primary) as Sport
    setSelectedSport(validSport)
  }, [])

  // Fetch data when filters change
  useEffect(() => {
    if (!isOpen) return
    
    async function fetchData() {
      setLoading(true)
      try {
        // Fetch from dedicated sport-specific endpoint
        const response = await fetch(`/api/public-betting/${selectedSport}`)
        const sportData = await response.json()
        
        console.log(`📊 Fetched ${selectedSport.toUpperCase()} data:`, sportData)
        
        // Filter based on selected type
        let filteredData = []
        if (selectedType === 'most-public') {
          filteredData = sportData.mostPublic?.slice(0, 5) || []
        } else if (selectedType === 'sharp-money') {
          filteredData = sportData.sharpMoney?.slice(0, 5) || []
        } else if (selectedType === 'vegas-backed') {
          filteredData = sportData.vegasBacked?.slice(0, 5) || []
        }
        
        setData(filteredData)
      } catch (error) {
        console.error('Error fetching public betting data:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [isOpen, selectedSport, selectedType])

  const widgetLinks = getSportWidgetLinks(selectedSport)

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Header */}
      <h3
        onClick={() => setIsOpen(!isOpen)}
        style={{
          fontSize: '1.2rem',
          marginBottom: '1rem',
          opacity: 0.9,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          color: '#fff'
        }}
      >
        <PiMoneyWavy size={18} style={{ color: '#ffffff', opacity: 1 }} />
        Public Betting
        <span style={{ marginLeft: 'auto' }}>
          {isOpen ? <TiMinusOutline size={24} /> : <GoPlusCircle size={24} />}
        </span>
      </h3>

      {isOpen && (
        <div>
          {/* Filters */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}>
            {/* Sport Dropdown */}
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value as Sport)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {(['nfl', 'nba', 'cfb', 'nhl'] as Sport[]).map((sport) => (
                <option key={sport} value={sport} style={{ background: '#1a1a2e', color: '#fff' }}>
                  {sport.toUpperCase()}
                </option>
              ))}
            </select>

            {/* Type Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedType('most-public')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: selectedType === 'most-public' 
                    ? '1px solid rgba(255, 255, 255, 0.3)' 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: selectedType === 'most-public' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.03)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <IoTicketOutline size={16} />
                Most Public
              </button>
              <button
                onClick={() => setSelectedType('sharp-money')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: selectedType === 'sharp-money' 
                    ? '1px solid rgba(255, 255, 255, 0.3)' 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: selectedType === 'sharp-money' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.03)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <PiKnifeFill size={16} />
                Sharp Money
              </button>
              <button
                onClick={() => setSelectedType('vegas-backed')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: selectedType === 'vegas-backed' 
                    ? '1px solid rgba(255, 255, 255, 0.3)' 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: selectedType === 'vegas-backed' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.03)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <GiPerspectiveDiceSixFacesFour size={16} />
                Vegas Backed
              </button>
            </div>
          </div>

          {/* Data Table */}
          {loading ? (
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Loading...</p>
          ) : data.length === 0 ? (
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>No data available for this selection</p>
          ) : (
            <>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                {data.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '1rem',
                    }}
                  >
                    {/* Most Public */}
                    {selectedType === 'most-public' && 'betsPct' in item && (
                      <>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginBottom: '0.5rem'
                        }}>
                          <span style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>
                            {item.label}
                          </span>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginLeft: 'auto'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              color: '#10b981',
                              background: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '4px',
                              padding: '2px 6px'
                            }}>
                              <IoTicketOutline size={12} />
                              {item.betsPct}%
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              color: '#10b981',
                              background: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '4px',
                              padding: '2px 6px'
                            }}>
                              <FaDollarSign size={12} />
                              {item.dollarsPct}%
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
                          {item.gameTime} | {item.odds}
                        </div>
                      </>
                    )}

                    {/* Sharp Money or Vegas Backed */}
                    {selectedType !== 'most-public' && (
                      <>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginBottom: '0.5rem'
                        }}>
                          <span style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>
                            {item.label}
                          </span>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            marginLeft: 'auto',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            color: '#fbbf24',
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            borderRadius: '4px',
                            padding: '2px 6px'
                          }}>
                            {selectedType === 'sharp-money' ? (
                              <PiKnifeFill size={12} />
                            ) : (
                              <GiPerspectiveDiceSixFacesFour size={12} />
                            )}
                            {item.value}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
                          {item.gameTime} | {item.odds}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* View All Button - matches Top Insider Picks style */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                <a
                  href={widgetLinks.publicBetting}
                  style={{
                    padding: '0.6rem 1.25rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  View All →
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

