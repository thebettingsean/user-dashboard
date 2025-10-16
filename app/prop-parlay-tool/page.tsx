'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSubscription } from '../../lib/hooks/useSubscription'
import LockedPageSection from '../../components/LockedPageSection'

const BOOK_LOGOS: Record<string, string> = {
  'draftkings': 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e0285a8e5ff0c6651eee22_1.svg',
  'fanduel': 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e0285a95a286b5d70e3e1c_2.svg',
  'bovada': 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e0285a6a628507419c6fe5_8.svg',
  'betonlineag': 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e0285a9314f5693bb1bdfa_7.svg',
  'betmgm': 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e0285a8a54f55c8a1f99c3_3.svg',
  'fanatics': 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e0285a5683202c2c5d4dff_4.svg',
  'betrivers': 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e0285a9c39a22f200bbee8_5.svg',
  'williamhill_us': 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e0285a950f718415ee5ce7_6.svg'
}

const AFFILIATE_LINKS: Record<string, string> = {
  'williamhill_us': 'https://wlwilliamhillus.adsrv.eacdn.com/C.ashx?btag=a_23811b_1253c_&affid=6&siteid=23811&adid=1253&c=',
  'draftkings': 'https://dksb.sng.link/As9kz/f1jp?_dl=https%3A%2F%2Fsportsbook.draftkings.com%2Fgateway%3Fs%3D248711710&pcid=420560&psn=1628&pcn=Promo1&pscn=XCLSV1%E2%80%93US%E2%80%93Sport%E2%80%93WelcomeOffer&pcrn=KaxMedia&pscid=xx&pcrid=xx&wpcid=420560&wpsrc=1628&wpcn=Promo1&wpscn=XCLSV1%E2%80%93US%E2%80%93Sport%E2%80%93WelcomeOffer&wpcrn=KaxMedia&wpscid=xx&wpcrid=xx&_forward_params=1',
  'fanduel': 'https://wlfanduelus.adsrv.eacdn.com/C.ashx?btag=a_43558b_16c_&affid=11104&siteid=43558&adid=16&c=',
  'fanatics': 'https://track.fanaticsbettingpartners.com/track/52e9b64c-75df-4778-a45c-c5404745a87a?type=display&s1=XCLSV1&s2=US-DC-IL-IN-IA-LA-KS-KY-NC-OH-PA-VA-TN-WV-WY&s3=Sports&s4=Welcome-Offer&s5=CYOO',
  'betmgm': 'https://mediaserver.betmgmpartners.com/renderBanner.do?zoneId=1734528',
  'bovada': 'https://record.revenuenetwork.com/_k0-8O2GFmD-Ne_S1w7rqVWNd7ZgqdRLk/1/',
  'betonlineag': 'https://record.revenuenetwork.com/_k0-8O2GFmD-Ne_S1w7rqVWNd7ZgqdRLk/1/',
  'betrivers': 'https://betrivers.com'
}

const ALL_BOOKS_LOGO = 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e0313f97df902b5312a3f6_NEW%20BOOK%20LOGOS%20SVG-2.svg'
const FILTER_ICON = 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0f9c3ea0594da2784e87_6.svg'
const TITLE_ICON = 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e3ef8673f9a7c75b24bf2f_PPP%20BRANDING!-3.svg'

export default function PropParlayTool() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'props' | 'parlays'>('props')
  const [showPropsFilter, setShowPropsFilter] = useState(false)
  const [showParlaysFilter, setShowParlaysFilter] = useState(false)
  const [filters, setFilters] = useState({
    legs: 2,
    minOdds: -600,
    parlayMinOdds: 'highest',
    book: 'all',
    parlayType: 'all',
    game: 'all'
  })

  const { isLoading: subLoading, isSubscribed } = useSubscription()

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 300000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      const res = await fetch('https://nfl-alt-prop-tool-database-production.up.railway.app')
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const json = await res.json()
      setData(json)
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  const games = useMemo(() => {
    if (!data?.games) return []
    return data.games.map((g: any) => ({
      ...g,
      matchup: formatTeamNames(g.matchup)
    }))
  }, [data])

  const bookmakers = useMemo(() => {
    if (!data?.props) return []
    const books = new Set<string>()
    data.props.forEach((prop: any) => {
      prop.bookmakers.forEach((b: any) => books.add(b.name))
    })
    return Array.from(books).sort()
  }, [data])

  const filteredProps = useMemo(() => {
    if (!data?.props) return []
    
    let props = data.props.map((p: any) => ({
      ...p,
      game: formatTeamNames(p.game)
    }))

    if (filters.game !== 'all') {
      props = props.filter((p: any) => p.game === filters.game)
    }

    if (filters.book !== 'all') {
      props = props.filter((p: any) => 
        p.bookmakers.some((b: any) => b.name === filters.book)
      )
    }

    const threshold = parseInt(filters.minOdds as any)
    props = props.filter((p: any) => {
      const bestOdds = Math.max(...p.bookmakers.map((b: any) => b.odds))
      return bestOdds >= threshold
    })

    props.sort((a: any, b: any) => {
      const aOdds = Math.max(...a.bookmakers.map((bm: any) => bm.odds))
      const bOdds = Math.max(...b.bookmakers.map((bm: any) => bm.odds))
      return bOdds - aOdds
    })

    return props
  }, [data, filters])

  const parlayCombo = useMemo(() => {
    if (!filteredProps.length) return []
    
    const numLegs = filters.legs
    const isSGP = filters.parlayType === 'sgp'
    const isStandard = filters.parlayType === 'standard'

    const deduplicatedProps = deduplicatePlayerProps(filteredProps)

    const byGame: Record<string, any[]> = {}
    deduplicatedProps.forEach((prop: any) => {
      if (!byGame[prop.game]) byGame[prop.game] = []
      byGame[prop.game].push(prop)
    })

    const combos: any[] = []

    if (!isStandard) {
      Object.entries(byGame).forEach(([game, props]) => {
        if (props.length >= numLegs) {
          generateCombos(props, numLegs).forEach(combo => {
            combos.push({ game, legs: combo, type: 'SGP' })
          })
        }
      })
    }

    if (!isSGP && deduplicatedProps.length >= numLegs) {
      generateCombos(deduplicatedProps, numLegs).forEach(combo => {
        const uniqueGames = new Set(combo.map((l: any) => l.game))
        if (uniqueGames.size > 1) {
          combos.push({ 
            game: Array.from(uniqueGames).slice(0, 2).join(' + '), 
            legs: combo, 
            type: 'Standard' 
          })
        }
      })
    }

    let comboResults = combos.map(combo => {
      const totalOdds = calculateParlayOdds(combo.legs, filters.book)
      const avgPercentAbove = combo.legs.reduce((sum: number, leg: any) => 
        sum + ((leg.season_avg - leg.line) / leg.line * 100), 0
      ) / combo.legs.length
      return { ...combo, totalOdds, avgPercentAbove }
    })

    if (filters.parlayMinOdds !== 'highest') {
      const threshold = parseInt(filters.parlayMinOdds)
      comboResults = comboResults.filter(c => c.totalOdds >= threshold)
    }

    return comboResults.sort((a, b) => b.totalOdds - a.totalOdds).slice(0, 500)
  }, [filteredProps, filters.legs, filters.parlayType, filters.parlayMinOdds, filters.book])

  function formatTeamNames(matchup: string) {
    return matchup
      .replace(/Minnesota |Cleveland |Houston |Baltimore |Miami |Carolina |Dallas |New York |Denver |Philadelphia |Las Vegas |Indianapolis |Tennessee |Arizona |Tampa Bay |Seattle |Detroit |Cincinnati |Washington |Los Angeles |New England |Buffalo |Kansas City |Jacksonville |San Francisco |Green Bay |Chicago |Pittsburgh |Atlanta |New Orleans /g, '')
  }

  function deduplicatePlayerProps(props: any[]) {
    const playerMarketMap: Record<string, any> = {}
    
    props.forEach(prop => {
      const marketType = prop.market.toLowerCase()
      const key = `${prop.player}-${marketType}`
      
      if (!playerMarketMap[key]) {
        playerMarketMap[key] = prop
      } else {
        const existingBestOdds = Math.max(...playerMarketMap[key].bookmakers.map((b: any) => b.odds))
        const newBestOdds = Math.max(...prop.bookmakers.map((b: any) => b.odds))
        
        if (newBestOdds > existingBestOdds) {
          playerMarketMap[key] = prop
        }
      }
    })
    
    return Object.values(playerMarketMap)
  }

  function generateCombos(arr: any[], size: number) {
    const result: any[] = []
    const maxResults = 2000
  
    const f = (prefix: any[], arr: any[]) => {
      if (result.length >= maxResults) return
    
      for (let i = 0; i < arr.length; i++) {
        if (result.length >= maxResults) break
      
        const newPrefix = [...prefix, arr[i]]
        if (newPrefix.length === size) {
          result.push(newPrefix)
        } else {
          f(newPrefix, arr.slice(i + 1))
        }
      }
    }
    f([], arr)
    return result
  }

  function calculateParlayOdds(legs: any[], selectedBook: string) {
    const decimalOdds = legs.map(leg => {
      let bestOdds
      if (selectedBook === 'all') {
        bestOdds = Math.max(...leg.bookmakers.map((b: any) => b.odds))
      } else {
        const bookOdds = leg.bookmakers.find((b: any) => b.name === selectedBook)
        bestOdds = bookOdds ? bookOdds.odds : Math.max(...leg.bookmakers.map((b: any) => b.odds))
      }
      return bestOdds < 0 ? (100 / Math.abs(bestOdds)) + 1 : (bestOdds / 100) + 1
    })
    const combined = decimalOdds.reduce((acc, odd) => acc * odd, 1)
    const american = combined >= 2 ? Math.round((combined - 1) * 100) : Math.round(-100 / (combined - 1))
    return american
  }

  function getPropsFilterText() {
    const game = filters.game === 'all' ? 'All games' : filters.game
    let odds = 'Best odds'
    if (filters.minOdds === -250) odds = '-150 to -250'
    else if (filters.minOdds === -400) odds = '-150 to -400'
    else if (filters.minOdds === -600) odds = '-150 to -600'
    return `${game}, ${odds}`
  }

  function getParlaysFilterText() {
    const game = filters.game === 'all' ? 'All games' : filters.game
    const parlayType = filters.parlayType === 'all' ? 'All parlay types' : 
                       filters.parlayType === 'sgp' ? 'Same game' : 'Multi-game'
    let odds = 'Highest odds'
    if (filters.parlayMinOdds === '-150') odds = '-150 or better'
    else if (filters.parlayMinOdds === '100') odds = '+100 or better'
    else if (filters.parlayMinOdds === '250') odds = '+250 or better'
    else if (filters.parlayMinOdds === '350') odds = '+350 or better'
    else if (filters.parlayMinOdds === '500') odds = '+500 or better'
    return `${game}, ${parlayType}, ${filters.legs}-legs, ${odds}`
  }

  if (loading || subLoading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.container}>
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p style={{ marginTop: '1rem', fontSize: '1rem', opacity: 0.8 }}>Loading alt props...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.titleSection}>
            <div style={styles.titleRow}>
              <h1 style={styles.title}>Perfect Prop Parlays</h1>
              <div style={styles.titleIconBox}>
                <img src={TITLE_ICON} alt="Tool" style={styles.titleIconImg} />
              </div>
            </div>
            <p style={styles.subtitle}>100% Hit Rate Props</p>
          </div>
          <div style={styles.bookSelector}>
            <label style={styles.bookLabel}>Choose your book</label>
            <select 
              value={filters.book} 
              onChange={(e) => setFilters({...filters, book: e.target.value})}
              style={styles.bookSelect}
            >
              <option value="all">All Sportsbooks</option>
              {bookmakers.map(book => (
                <option key={book} value={book}>{formatBookName(book)}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.viewToggle}>
          <button 
            style={{...styles.toggleBtn, ...(view === 'props' ? styles.toggleBtnActive : {})}}
            onClick={() => setView('props')}
          >
            Individual Props
          </button>
          <button 
            style={{...styles.toggleBtn, ...(view === 'parlays' ? styles.toggleBtnActive : {})}}
            onClick={() => setView('parlays')}
          >
            Parlay Builder
          </button>
        </div>

        <LockedPageSection isLocked={view === 'parlays' && !isSubscribed}>
          {view === 'props' ? (
            <>
              <div style={styles.filterRow}>
                <button 
                  style={styles.filterButton}
                  onClick={() => setShowPropsFilter(!showPropsFilter)}
                >
                  <img src={FILTER_ICON} alt="Filter" style={styles.filterIcon} />
                  <span>{getPropsFilterText()}</span>
                </button>
              </div>

              {showPropsFilter && (
                <div style={styles.filterDropdown}>
                  <div style={styles.filterSection}>
                    <div style={styles.filterLabel}>Games</div>
                    <select 
                      value={filters.game} 
                      onChange={(e) => setFilters({...filters, game: e.target.value})}
                      style={styles.filterDropdownSelect}
                    >
                      <option value="all">All Games</option>
                      {games.map((g: any, i: number) => (
                        <option key={i} value={g.matchup}>{g.matchup}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.filterSection}>
                    <div style={styles.filterLabel}>Odds Range</div>
                    <select 
                      value={filters.minOdds} 
                      onChange={(e) => setFilters({...filters, minOdds: parseInt(e.target.value)})}
                      style={styles.filterDropdownSelect}
                    >
                      <option value="-600">Best Odds (All)</option>
                      <option value="-250">-150 to -250</option>
                      <option value="-400">-150 to -400</option>
                      <option value="-600">-150 to -600</option>
                    </select>
                  </div>
                </div>
              )}

              <PropsTable props={filteredProps} selectedBook={filters.book} />
            </>
          ) : (
            <>
              <div style={styles.filterRow}>
                <button 
                  style={styles.filterButton}
                  onClick={() => setShowParlaysFilter(!showParlaysFilter)}
                >
                  <img src={FILTER_ICON} alt="Filter" style={styles.filterIcon} />
                  <span>{getParlaysFilterText()}</span>
                </button>
              </div>

              {showParlaysFilter && (
                <div style={styles.filterDropdown}>
                  <div style={styles.filterSection}>
                    <div style={styles.filterLabel}>Games</div>
                    <select 
                      value={filters.game} 
                      onChange={(e) => setFilters({...filters, game: e.target.value})}
                      style={styles.filterDropdownSelect}
                    >
                      <option value="all">All Games</option>
                      {games.map((g: any, i: number) => (
                        <option key={i} value={g.matchup}>{g.matchup}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.filterSection}>
                    <div style={styles.filterLabel}>Parlay Type</div>
                    <select 
                      value={filters.parlayType} 
                      onChange={(e) => setFilters({...filters, parlayType: e.target.value})}
                      style={styles.filterDropdownSelect}
                    >
                      <option value="all">All Parlay Types</option>
                      <option value="sgp">Same Game Only</option>
                      <option value="standard">Multi-Game Only</option>
                    </select>
                  </div>

                  <div style={styles.filterSection}>
                    <div style={styles.filterLabel}>Number of Legs</div>
                    <select 
                      value={filters.legs} 
                      onChange={(e) => setFilters({...filters, legs: parseInt(e.target.value)})}
                      style={styles.filterDropdownSelect}
                    >
                      <option value="2">2-Leg Parlay</option>
                      <option value="3">3-Leg Parlay</option>
                      <option value="4">4-Leg Parlay</option>
                      <option value="5">5-Leg Parlay</option>
                      <option value="6">6-Leg Parlay</option>
                    </select>
                  </div>

                  <div style={styles.filterSection}>
                    <div style={styles.filterLabel}>Parlay Odds</div>
                    <select 
                      value={filters.parlayMinOdds} 
                      onChange={(e) => setFilters({...filters, parlayMinOdds: e.target.value})}
                      style={styles.filterDropdownSelect}
                    >
                      <option value="highest">Highest Odds</option>
                      <option value="-150">-150 or Better</option>
                      <option value="100">+100 or Better</option>
                      <option value="250">+250 or Better</option>
                      <option value="350">+350 or Better</option>
                      <option value="500">+500 or Better</option>
                    </select>
                  </div>
                </div>
              )}

              <ParlaysGrid combos={parlayCombo} selectedBook={filters.book} />
            </>
          )}
        </LockedPageSection>
      </div>
    </div>
  )
}

function PropsTable({ props, selectedBook }: { props: any[], selectedBook: string }) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  if (!props.length) {
    return <div style={styles.empty}>No props match your filters</div>
  }

  function toggleRow(index: number) {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  function getBestOddsForBook(prop: any, book: string) {
    if (book === 'all') {
      return Math.max(...prop.bookmakers.map((b: any) => b.odds))
    }
    const bookmaker = prop.bookmakers.find((b: any) => b.name === book)
    return bookmaker ? bookmaker.odds : null
  }

  return (
    <div style={styles.table}>
      {props.map((prop, idx) => {
        const percentAbove = ((prop.season_avg - prop.line) / prop.line * 100).toFixed(0)
        const isExpanded = expandedRows.has(idx)
        const displayOdds = getBestOddsForBook(prop, selectedBook)
        const bookLogo = selectedBook === 'all' ? ALL_BOOKS_LOGO : BOOK_LOGOS[selectedBook]

        return (
          <div key={idx} style={styles.tableRow}>
            <div 
              style={styles.tableRowHeader}
              onClick={() => toggleRow(idx)}
            >
              <div style={styles.tableRowMainMobile}>
                <div style={styles.tablePlayerNameMobile}>{prop.player}</div>
                <div style={styles.propDetailsMobile}>
                  <span style={styles.propTextMobile}>{formatMarket(prop.market)} O{prop.line}</span>
                  <span style={styles.oddsTextMobile}>{displayOdds && formatOdds(displayOdds)}</span>
                </div>
                <div style={styles.teamTextMobile}>{prop.game}</div>
              </div>
              <div style={styles.tableRowRight}>
                {bookLogo && <img src={bookLogo} alt="Book" style={styles.bookLogoMobile} />}
                <div style={styles.tableToggle}>
                  {isExpanded ? '▼' : '▶'}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div style={styles.tableRowExpanded}>
                <div style={styles.expandedGrid}>
                  <div style={styles.expandedStat}>
                    <div style={styles.expandedLabel}>Season Avg</div>
                    <div style={styles.expandedValue}>{prop.season_avg}</div>
                  </div>
                  <div style={styles.expandedStat}>
                    <div style={styles.expandedLabel}>Hit Rate</div>
                    <div style={styles.expandedValue}>100%</div>
                  </div>
                  <div style={styles.expandedStat}>
                    <div style={styles.expandedLabel}>Above Line</div>
                    <div style={styles.expandedValue}>+{percentAbove}%</div>
                  </div>
                </div>

                <div style={styles.gameInfoSection}>
                  <span style={styles.gameInfoText}>{prop.game} • {prop.game_time}</span>
                </div>

                <div style={styles.weeklySection}>
                  <div style={styles.expandedLabel}>Weekly:</div>
                  <div style={styles.weeklyGrid}>
                    {prop.weekly_values.map((val: number, i: number) => (
                      <div key={i} style={styles.weeklyBadge}>W{i+1}: {val}</div>
                    ))}
                  </div>
                </div>

                <div style={styles.booksSection}>
                  <div style={styles.expandedLabel}>Books:</div>
                  <div style={styles.booksGrid}>
                    {prop.bookmakers.map((book: any, i: number) => (
                      <div key={i} style={styles.bookRowExpanded}>
                        <img 
                          src={BOOK_LOGOS[book.name]} 
                          alt={book.name} 
                          style={styles.bookLogoTiny}
                        />
                        <span style={styles.bookNameTiny}>{formatBookName(book.name)}</span>
                        <span style={styles.bookOddsTiny}>{formatOdds(book.odds)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ParlaysGrid({ combos, selectedBook }: { combos: any[], selectedBook: string }) {
  if (!combos.length) {
    return <div style={styles.empty}>No parlays available with current filters</div>
  }

  const bookLogo = selectedBook === 'all' ? ALL_BOOKS_LOGO : BOOK_LOGOS[selectedBook]
  const affiliateLink = selectedBook !== 'all' ? AFFILIATE_LINKS[selectedBook] : null

  return (
    <div style={styles.parlayGrid}>
      {combos.map((combo, idx) => (
        <ParlayCard 
          key={idx} 
          combo={combo} 
          rank={idx + 1} 
          bookLogo={bookLogo}
          affiliateLink={affiliateLink}
          selectedBook={selectedBook}
        />
      ))}
    </div>
  )
}

function ParlayCard({ combo, rank, bookLogo, affiliateLink, selectedBook }: { combo: any, rank: number, bookLogo: string, affiliateLink: string | null, selectedBook: string }) {
  const [isHovered, setIsHovered] = React.useState(false)
  
  return (
    <div 
      style={{
        ...styles.parlayCard,
        ...(isHovered && {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
          borderColor: 'rgba(59,130,246,0.6)'
        })
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.parlayCardHeader}>
        <div style={styles.rankCircle}>
          <img src={TITLE_ICON} alt={`Parlay #${rank}`} style={styles.rankIcon} />
        </div>
        <div style={styles.parlayMeta}>
          <div style={styles.parlayTypeLabel}>
            {combo.type} • {combo.legs.length}-Leg
          </div>
          <div style={styles.parlayGameText}>{combo.game}</div>
        </div>
        <div style={styles.parlayBookCorner}>
          <img src={bookLogo} alt="Book" style={styles.bookLogoSmall} />
          <div style={styles.parlayOddsValue}>{formatOdds(combo.totalOdds)}</div>
        </div>
      </div>

      <div style={styles.legsContainer}>
        {combo.legs.map((leg: any, i: number) => {
          const legOdds = selectedBook === 'all' 
            ? Math.max(...leg.bookmakers.map((b: any) => b.odds))
            : leg.bookmakers.find((b: any) => b.name === selectedBook)?.odds || Math.max(...leg.bookmakers.map((b: any) => b.odds))
          
          return (
            <div key={i} style={styles.legRow}>
              <div style={styles.legNumber}>{i + 1}</div>
              <div style={styles.legInfo}>
                <div style={styles.legPlayerName}>{leg.player}</div>
                <div style={styles.legPropInfo}>
                  {formatMarket(leg.market)} O{leg.line} • {leg.game} • {formatOdds(legOdds)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {affiliateLink && (
        <div style={styles.betNowLink}>
          <a 
            href={affiliateLink} 
            target="_blank" 
            rel="noopener noreferrer"
            style={styles.betNowText}
          >
            Bet now on {formatBookName(selectedBook)} ↗
          </a>
        </div>
      )}
    </div>
  )
}

function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`
}

function formatMarket(market: string) {
  return market
    .replace('Player ', '')
    .replace(' Alternate', '')
    .replace('Reception Yds', 'Rec Yds')
    .replace('Receptions', 'Rec')
    .replace('Rush Yds', 'Rush Yds')
    .replace('Pass Tds', 'Pass TD')
}

function formatBookName(name: string) {
  const names: Record<string, string> = {
    'draftkings': 'DraftKings',
    'fanduel': 'FanDuel',
    'betmgm': 'BetMGM',
    'williamhill_us': 'Caesars',
    'betrivers': 'BetRivers',
    'bovada': 'Bovada',
    'fanatics': 'Fanatics',
    'betonlineag': 'BetOnline'
  }
  return names[name] || name
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: 'transparent',
    padding: '1.5rem 1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative' as const
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    color: 'white'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
    gap: '1.5rem',
    flexWrap: 'wrap' as const
  },
  titleSection: {},
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem'
  },
  title: {
    fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #e5e7eb, #ffffff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  },
  titleIconBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleIconImg: {
    width: '52px',
    height: '52px',
    display: 'block'
  },
  subtitle: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#60a5fa',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const
  },
  bookSelector: {
    textAlign: 'right' as const
  },
  bookLabel: {
    display: 'block',
    fontSize: '0.65rem',
    color: '#9ca3af',
    marginBottom: '0.4rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  },
  bookSelect: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#e5e7eb',
    borderRadius: '10px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '160px',
    boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.2)',
    transition: 'all 0.2s'
  },
  viewToggle: {
    display: 'flex',
    gap: '0.4rem',
    marginBottom: '1.25rem',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    padding: '0.3rem',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.25)'
  },
  toggleBtn: {
    flex: 1,
    padding: '0.65rem 1rem',
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    fontSize: '0.8rem',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  toggleBtnActive: {
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    color: '#60a5fa',
    boxShadow: '0 4px 16px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
  },
  filterRow: {
    marginBottom: '1.25rem'
  },
  filterButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: 'none',
    color: '#e5e7eb',
    borderRadius: '12px',
    padding: '0.7rem 1rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    width: '100%',
    boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
  },
  filterIcon: {
    width: '16px',
    height: '16px',
    opacity: 0.7
  },
  filterDropdown: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: 'none',
    borderRadius: '14px',
    padding: '0.85rem',
    marginBottom: '1.25rem',
    display: 'grid',
    gap: '0.85rem',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)'
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem'
  },
  filterLabel: {
    fontSize: '0.65rem',
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase' as const
  },
  filterDropdownSelect: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#e5e7eb',
    borderRadius: '6px',
    padding: '0.5rem 0.7rem',
    fontSize: '0.75rem',
    outline: 'none',
    cursor: 'pointer'
  },
  table: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem'
  },
  tableRow: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(35px) saturate(180%)',
    WebkitBackdropFilter: 'blur(35px) saturate(180%)',
    border: 'none',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  tableRowHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '0.75rem 0.85rem',
    cursor: 'pointer',
    gap: '0.75rem'
  },
  tableRowMainMobile: {
    flex: 1,
    minWidth: 0
  },
  tablePlayerNameMobile: {
    fontSize: '0.85rem',
    fontWeight: '700',
    marginBottom: '0.25rem',
    lineHeight: 1.2
  },
  propDetailsMobile: {
    display: 'flex',
    gap: '0.5rem',
    fontSize: '0.7rem',
    marginBottom: '0.2rem',
    flexWrap: 'wrap' as const
  },
  propTextMobile: {
    color: '#9ca3af'
  },
  oddsTextMobile: {
    color: '#ffffff',
    fontWeight: '700'
  },
  teamTextMobile: {
    fontSize: '0.65rem',
    color: '#6b7280'
  },
  tableRowRight: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.35rem'
  },
  bookLogoMobile: {
    width: '28px',
    height: '28px',
    objectFit: 'contain' as const
  },
  tableToggle: {
    fontSize: '0.75rem',
    color: '#60a5fa'
  },
  tableRowExpanded: {
    padding: '0.85rem',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.15)'
  },
  expandedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.6rem',
    marginBottom: '0.85rem'
  },
  expandedStat: {
    background: 'rgba(255,255,255,0.05)',
    padding: '0.5rem',
    borderRadius: '6px',
    textAlign: 'center' as const
  },
  expandedLabel: {
    fontSize: '0.65rem',
    color: '#9ca3af',
    marginBottom: '0.3rem',
    fontWeight: '600'
  },
  expandedValue: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#ffffff'
  },
  gameInfoSection: {
    marginBottom: '0.85rem',
    padding: '0.5rem',
    background: 'rgba(96,165,250,0.1)',
    borderRadius: '6px'
  },
  gameInfoText: {
    fontSize: '0.7rem',
    color: '#9ca3af'
  },
  weeklySection: {
    marginBottom: '0.85rem'
  },
  weeklyGrid: {
    display: 'flex',
    gap: '0.4rem',
    flexWrap: 'wrap' as const,
    marginTop: '0.4rem'
  },
  weeklyBadge: {
    background: 'rgba(96,165,250,0.15)',
    padding: '0.3rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '600'
  },
  booksSection: {},
  booksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '0.35rem',
    marginTop: '0.4rem'
  },
  bookRowExpanded: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.35rem 0.5rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '4px'
  },
  bookLogoTiny: {
    width: '16px',
    height: '16px',
    objectFit: 'contain' as const
  },
  bookNameTiny: {
    flex: 1,
    color: '#9ca3af',
    fontSize: '0.65rem'
  },
  bookOddsTiny: {
    fontWeight: '700',
    fontSize: '0.7rem',
    color: '#ffffff'
  },
  parlayGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.85rem'
  },
  parlayCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(35px) saturate(180%)',
    WebkitBackdropFilter: 'blur(35px) saturate(180%)',
    border: 'none',
    borderRadius: '18px',
    padding: '1rem',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
  },
  parlayCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.85rem',
    paddingBottom: '0.85rem',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  rankCircle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  rankIcon: {
    width: '48px',
    height: '48px'
  },
  parlayMeta: {
    flex: 1
  },
  parlayTypeLabel: {
    fontSize: '0.7rem',
    color: '#60a5fa',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.2rem'
  },
  parlayGameText: {
    fontSize: '0.75rem',
    color: '#9ca3af'
  },
  parlayBookCorner: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.3rem'
  },
  bookLogoSmall: {
    width: '28px',
    height: '28px',
    objectFit: 'contain' as const
  },
  parlayOddsValue: {
    fontSize: '0.95rem',
    fontWeight: '800',
    color: '#ffffff'
  },
  legsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    marginBottom: '0.85rem'
  },
  legRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.6rem 0.7rem',
    background: 'rgba(0,0,0,0.25)',
    borderRadius: '6px'
  },
  legNumber: {
    background: 'rgba(96,165,250,0.2)',
    width: '24px',
    height: '24px',
    borderRadius: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#60a5fa',
    flexShrink: 0
  },
  legInfo: {
    flex: 1,
    minWidth: 0
  },
  legPlayerName: {
    fontSize: '0.8rem',
    fontWeight: '700',
    marginBottom: '0.2rem',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  legPropInfo: {
    fontSize: '0.7rem',
    color: '#9ca3af'
  },
  betNowLink: {
    marginTop: '0.85rem',
    paddingTop: '0.85rem',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'center' as const
  },
  betNowText: {
    color: '#ffffff',
    fontSize: '0.85rem',
    fontWeight: '600',
    textDecoration: 'none',
    transition: 'opacity 0.2s'
  },
  loading: {
    textAlign: 'center' as const,
    padding: '4rem 1.5rem',
    color: '#9ca3af'
  },
  spinner: {
    display: 'inline-block',
    width: '36px',
    height: '36px',
    border: '3px solid rgba(96,165,250,0.2)',
    borderTopColor: '#60a5fa',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  empty: {
    textAlign: 'center' as const,
    padding: '3rem 1.5rem',
    color: '#9ca3af',
    fontSize: '0.9rem'
  }
}