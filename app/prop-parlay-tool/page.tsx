'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSubscription } from '../../lib/hooks/useSubscription'
import LockedPageSection from '../../components/LockedPageSection'
import styles from './prop-parlay-tool.module.css'

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
  const [sport, setSport] = useState<'NFL' | 'NBA'>('NFL')
  const [filters, setFilters] = useState({
    legs: 2,
    minOdds: -600,
    parlayMinOdds: 'highest',
    book: 'all',
    parlayType: 'all',
    game: 'all'
  })

  const { isLoading: subLoading, isSubscribed} = useSubscription()

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 300000)
    return () => clearInterval(interval)
  }, [sport])

  async function fetchData() {
    try {
      const url = sport === 'NFL' 
        ? 'https://nfl-perfect-prop-tool-production.up.railway.app'
        : 'https://nba-alt-prop-tool-production.up.railway.app'
      
      const res = await fetch(url)
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
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p style={{ marginTop: '1rem', fontSize: '1rem', opacity: 0.8 }}>Loading alt props...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Perfect Prop Parlays</h1>
              <div className={styles.titleIconBox}>
                <img src={TITLE_ICON} alt="Tool" className={styles.titleIconImg} />
              </div>
            </div>
            <p className={styles.subtitle}>100% Hit Rate Props</p>
          </div>
          <div className={styles.bookSelector}>
            <label className={styles.bookLabel}>Choose your book</label>
            <select 
              value={filters.book} 
              onChange={(e) => setFilters({...filters, book: e.target.value})}
              className={styles.bookSelect}
            >
              <option value="all">All Sportsbooks</option>
              {bookmakers.map(book => (
                <option key={book} value={book}>{formatBookName(book)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.viewToggle}>
        <button 
          className={`${styles.toggleBtn} ${view === 'props' ? styles.toggleBtnActive : ''}`}
          onClick={() => setView('props')}
        >
          Individual Props
        </button>
        <button 
          className={`${styles.toggleBtn} ${view === 'parlays' ? styles.toggleBtnActive : ''}`}
          onClick={() => setView('parlays')}
        >
          Parlay Builder
        </button>
      </div>

        <LockedPageSection isLocked={view === 'parlays' && !isSubscribed}>
          {view === 'props' ? (
            <>
              <div className={styles.filterRow}>
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value as 'NFL' | 'NBA')}
                  className={styles.sportSelector}
                >
                  <option value="NFL">NFL</option>
                  <option value="NBA">NBA</option>
                </select>
                
                <button 
                  className={styles.filterButton}
                  onClick={() => setShowPropsFilter(!showPropsFilter)}
                >
                  <img src={FILTER_ICON} alt="Filter" className={styles.filterIcon} />
                  <span>{getPropsFilterText()}</span>
                </button>
              </div>

              {showPropsFilter && (
                <div className={styles.filterDropdown}>
                  <div className={styles.filterSection}>
                    <div className={styles.filterLabel}>Games</div>
                    <select 
                      value={filters.game} 
                      onChange={(e) => setFilters({...filters, game: e.target.value})}
                      className={styles.filterDropdownSelect}
                    >
                      <option value="all">All Games</option>
                      {games.map((g: any, i: number) => (
                        <option key={i} value={g.matchup}>{g.matchup}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.filterSection}>
                    <div className={styles.filterLabel}>Odds Range</div>
                    <select 
                      value={filters.minOdds} 
                      onChange={(e) => setFilters({...filters, minOdds: parseInt(e.target.value)})}
                      className={styles.filterDropdownSelect}
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
              <div className={styles.filterRow}>
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value as 'NFL' | 'NBA')}
                  className={styles.sportSelector}
                >
                  <option value="NFL">NFL</option>
                  <option value="NBA">NBA</option>
                </select>
                
                <button 
                  className={styles.filterButton}
                  onClick={() => setShowParlaysFilter(!showParlaysFilter)}
                >
                  <img src={FILTER_ICON} alt="Filter" className={styles.filterIcon} />
                  <span>{getParlaysFilterText()}</span>
                </button>
              </div>

              {showParlaysFilter && (
                <div className={styles.filterDropdown}>
                  <div className={styles.filterSection}>
                    <div className={styles.filterLabel}>Games</div>
                    <select 
                      value={filters.game} 
                      onChange={(e) => setFilters({...filters, game: e.target.value})}
                      className={styles.filterDropdownSelect}
                    >
                      <option value="all">All Games</option>
                      {games.map((g: any, i: number) => (
                        <option key={i} value={g.matchup}>{g.matchup}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.filterSection}>
                    <div className={styles.filterLabel}>Parlay Type</div>
                    <select 
                      value={filters.parlayType} 
                      onChange={(e) => setFilters({...filters, parlayType: e.target.value})}
                      className={styles.filterDropdownSelect}
                    >
                      <option value="all">All Parlay Types</option>
                      <option value="sgp">Same Game Only</option>
                      <option value="standard">Multi-Game Only</option>
                    </select>
                  </div>

                  <div className={styles.filterSection}>
                    <div className={styles.filterLabel}>Number of Legs</div>
                    <select 
                      value={filters.legs} 
                      onChange={(e) => setFilters({...filters, legs: parseInt(e.target.value)})}
                      className={styles.filterDropdownSelect}
                    >
                      <option value="2">2-Leg Parlay</option>
                      <option value="3">3-Leg Parlay</option>
                      <option value="4">4-Leg Parlay</option>
                      <option value="5">5-Leg Parlay</option>
                      <option value="6">6-Leg Parlay</option>
                    </select>
                  </div>

                  <div className={styles.filterSection}>
                    <div className={styles.filterLabel}>Parlay Odds</div>
                    <select 
                      value={filters.parlayMinOdds} 
                      onChange={(e) => setFilters({...filters, parlayMinOdds: e.target.value})}
                      className={styles.filterDropdownSelect}
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
  )
}

function PropsTable({ props, selectedBook }: { props: any[], selectedBook: string }) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  if (!props.length) {
    return <div className={styles.empty}>No props match your filters</div>
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
    <div className={styles.table}>
      {props.map((prop, idx) => {
        const percentAbove = ((prop.season_avg - prop.line) / prop.line * 100).toFixed(0)
        const isExpanded = expandedRows.has(idx)
        const displayOdds = getBestOddsForBook(prop, selectedBook)

        return (
          <div key={idx} className={styles.tableRow}>
            <div 
              className={styles.tableRowHeader}
              onClick={() => toggleRow(idx)}
            >
              <div className={styles.tableRowMainMobile}>
                <div className={styles.tablePlayerNameMobile}>{prop.player}</div>
                <div className={styles.propDetailsMobile}>
                  <span className={styles.propTextMobile}>{formatMarket(prop.market)} O{prop.line}</span>
                  <span className={styles.oddsTextMobile}>{displayOdds && formatOdds(displayOdds)}</span>
                </div>
                <div className={styles.teamTextMobile}>{prop.game}</div>
              </div>
              <div className={styles.tableRowRight}>
                <div className={styles.tableToggle}>
                  {isExpanded ? '▼' : '▶'}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className={styles.tableRowExpanded}>
                <div className={styles.expandedGrid}>
                  <div className={styles.expandedStat}>
                    <div className={styles.expandedLabel}>Season Avg</div>
                    <div className={styles.expandedValue}>{prop.season_avg}</div>
                  </div>
                  <div className={styles.expandedStat}>
                    <div className={styles.expandedLabel}>Hit Rate</div>
                    <div className={styles.expandedValue}>100%</div>
                  </div>
                  <div className={styles.expandedStat}>
                    <div className={styles.expandedLabel}>Above Line</div>
                    <div className={styles.expandedValue}>+{percentAbove}%</div>
                  </div>
                </div>

                <div className={styles.gameInfoSection}>
                  <span className={styles.gameInfoText}>{prop.game} • {prop.game_time}</span>
                </div>

                <div className={styles.weeklySection}>
                  <div className={styles.expandedLabel}>Weekly:</div>
                  <div className={styles.weeklyGrid}>
                    {prop.weekly_values.map((val: number, i: number) => (
                      <div key={i} className={styles.weeklyBadge}>W{i+1}: {val}</div>
                    ))}
                  </div>
                </div>

                <div className={styles.booksSection}>
                  <div className={styles.expandedLabel}>Books:</div>
                  <div className={styles.booksGrid}>
                    {prop.bookmakers.map((book: any, i: number) => (
                      <div key={i} className={styles.bookRowExpanded}>
                        <span className={styles.bookNameTiny}>{formatBookName(book.name)}</span>
                        <span className={styles.bookOddsTiny}>{formatOdds(book.odds)}</span>
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
    return <div className={styles.empty}>No parlays available with current filters</div>
  }

  const affiliateLink = selectedBook !== 'all' ? AFFILIATE_LINKS[selectedBook] : null

  return (
    <div className={styles.parlayGrid}>
      {combos.map((combo, idx) => (
        <ParlayCard 
          key={idx} 
          combo={combo} 
          rank={idx + 1} 
          affiliateLink={affiliateLink}
          selectedBook={selectedBook}
        />
      ))}
    </div>
  )
}

function ParlayCard({ combo, rank, affiliateLink, selectedBook }: { combo: any, rank: number, affiliateLink: string | null, selectedBook: string }) {
  return (
    <div className={styles.parlayCard}>
      <div className={styles.parlayCardHeader}>
        <div className={styles.rankCircle}>
          <img src={TITLE_ICON} alt={`Parlay #${rank}`} className={styles.rankIcon} />
        </div>
        <div className={styles.parlayMeta}>
          <div className={styles.parlayTypeLabel}>
            {combo.type} • {combo.legs.length}-Leg
          </div>
          <div className={styles.parlayGameText}>{combo.game}</div>
        </div>
        <div className={styles.parlayBookCorner}>
          <div className={styles.parlayOddsValue}>{formatOdds(combo.totalOdds)}</div>
        </div>
      </div>

      <div className={styles.legsContainer}>
        {combo.legs.map((leg: any, i: number) => {
          const legOdds = selectedBook === 'all' 
            ? Math.max(...leg.bookmakers.map((b: any) => b.odds))
            : leg.bookmakers.find((b: any) => b.name === selectedBook)?.odds || Math.max(...leg.bookmakers.map((b: any) => b.odds))
          
          return (
            <div key={i} className={styles.legRow}>
              <div className={styles.legNumber}>{i + 1}</div>
              <div className={styles.legInfo}>
                <div className={styles.legPlayerName}>{leg.player}</div>
                <div className={styles.legPropInfo}>
                  {formatMarket(leg.market)} O{leg.line} • {leg.game} • {formatOdds(legOdds)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {affiliateLink && (
        <div className={styles.betNowLink}>
          <a 
            href={affiliateLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.betNowText}
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